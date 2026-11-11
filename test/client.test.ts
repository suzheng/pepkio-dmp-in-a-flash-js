// SPDX-License-Identifier: MIT
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PepkioClient } from "../src/client.js";
import {
  DEFAULT_API_BASE_URL,
  TOOL_ID,
  apiPath,
  resolveApiKey,
  resolveBaseUrl,
} from "../src/config.js";
import { parseRunInput } from "../src/schemas.js";
import { PepkioAPIError, type ToolManifest } from "../src/types.js";

const mockManifest: ToolManifest = {
  schema_version: "1.0",
  tool_id: TOOL_ID,
  title: "DMP-in-a-Flash",
  description: "Guided AI-assisted Data Management Plan generator for NIH and NSF grants.",
  examples: [
    {
      name: "load_human_wgs",
      input: {
        action: "load_preset",
        scenarioId: "human-wgs-clinical",
      },
    },
    {
      name: "generate_mouse_rnaseq",
      input: {
        action: "generate",
        funder: "nih-2026",
        useAi: false,
        project: {
          piName: "Dr. Jane Smith",
          proposalTitle: "Mouse transcriptomics of liver fibrosis",
        },
        intake: {
          dataCategory: "model_organism",
          dataDescription: "Bulk RNA-seq from C57BL/6J mice across fibrosis stages",
          dataVolume: "200 GB FASTQ",
          repository: "geo",
          accessLevel: "open",
          sharingTimelineMonths: 6,
          preservationStrategy: "NCBI GEO with 5-year lab backup",
        },
      },
    },
  ],
};

describe("PepkioClient unit tests", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("getManifest() fetches and returns tool_id", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify(mockManifest),
    } as unknown as Response);

    const client = new PepkioClient({ baseUrl: "https://tools.pepkio.com" });
    const manifest = await client.getManifest();

    expect(manifest.tool_id).toBe(TOOL_ID);
    expect(manifest.title).toBe("DMP-in-a-Flash");
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://tools.pepkio.com/api/tools/v1/tools/dmp-in-a-flash/manifest",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("caches getManifest() calls", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify(mockManifest),
    } as unknown as Response);
    globalThis.fetch = fetchMock;

    const client = new PepkioClient();
    await client.getManifest();
    await client.getManifest();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("listExamples() extracts examples from manifest", async () => {
    const client = new PepkioClient();
    const examples = client.listExamples(mockManifest);

    expect(examples).toHaveLength(2);
    expect(examples[0].name).toBe("load_human_wgs");
    expect(examples[1].name).toBe("generate_mouse_rnaseq");
  });

  it("getExampleInput() retrieves and parses example", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify(mockManifest),
    } as unknown as Response);

    const client = new PepkioClient();
    const input = await client.getExampleInput("load_human_wgs");

    expect(input.action).toBe("load_preset");
    expect(input.scenarioId).toBe("human-wgs-clinical");
  });

  it("getExampleInput() throws on unknown example name", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify(mockManifest),
    } as unknown as Response);

    const client = new PepkioClient();
    await expect(client.getExampleInput("nonexistent_example")).rejects.toThrow(
      /Example "nonexistent_example" not found/,
    );
  });

  it("run() requires an API key", async () => {
    const client = new PepkioClient({ apiKey: "" });
    await expect(
      client.run({ action: "load_preset", scenarioId: "human-wgs-clinical" }),
    ).rejects.toThrow(/API key required/);
  });

  it("run() sends correct POST request with Authorization header", async () => {
    const mockResult = {
      run_id: "test-run-123",
      status: "completed",
      result: { scenario: "human-wgs-clinical" },
      error: null,
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify(mockResult),
    } as unknown as Response);
    globalThis.fetch = fetchMock;

    const client = new PepkioClient({ apiKey: "test-key" });
    const res = await client.run({
      action: "load_preset",
      scenarioId: "human-wgs-clinical",
    });

    expect(res.run_id).toBe("test-run-123");
    expect(res.status).toBe("completed");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://tools.pepkio.com/api/tools/v1/tools/dmp-in-a-flash/run",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-key",
          "Content-Type": "application/json",
        }),
      }),
    );
  });

  it("run() throws PepkioAPIError on HTTP 400", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      text: async () => JSON.stringify({ error: "Invalid scenario" }),
    } as unknown as Response);

    const client = new PepkioClient({ apiKey: "test-key" });
    await expect(
      client.run({ action: "load_preset", scenarioId: "human-wgs-clinical" }),
    ).rejects.toThrow(PepkioAPIError);
  });

  it("run() throws PepkioAPIError when error field is present in 200 response body", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          run_id: "err-123",
          status: "failed",
          error: "Intake validation failed",
        }),
    } as unknown as Response);

    const client = new PepkioClient({ apiKey: "test-key" });
    await expect(
      client.run({ action: "load_preset", scenarioId: "human-wgs-clinical" }),
    ).rejects.toThrow(/Intake validation failed/);
  });

  it("generateDmp() helper sends generate action", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          run_id: "run-gen",
          status: "completed",
          result: { text: "Generated plan", compliance: [] },
        }),
    } as unknown as Response);
    globalThis.fetch = fetchMock;

    const client = new PepkioClient({ apiKey: "test-key" });
    const res = await client.generateDmp({
      funder: "nih-2026",
      intake: {
        dataCategory: "model_organism",
        dataDescription: "RNA-seq data",
      },
    });

    expect(res.result?.text).toBe("Generated plan");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: expect.stringContaining('"action":"generate"'),
      }),
    );
  });

  it("checkCompliance() helper sends compliance_check action", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          run_id: "run-comp",
          status: "completed",
          result: { compliance: [{ id: "c1", status: "pass", label: "L1", message: "M1" }] },
        }),
    } as unknown as Response);
    globalThis.fetch = fetchMock;

    const client = new PepkioClient({ apiKey: "test-key" });
    const res = await client.checkCompliance({
      text: "Sample DMP text",
      funder: "nih-2026",
    });

    expect(res.result?.compliance).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: expect.stringContaining('"action":"compliance_check"'),
      }),
    );
  });

  it("loadPreset() helper sends load_preset action", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          run_id: "run-preset",
          status: "completed",
          result: { scenario: "human-wgs-clinical", intake: {} },
        }),
    } as unknown as Response);
    globalThis.fetch = fetchMock;

    const client = new PepkioClient({ apiKey: "test-key" });
    const res = await client.loadPreset("human-wgs-clinical");

    expect(res.result?.scenario).toBe("human-wgs-clinical");
  });

  it("listBlocks() helper sends list_blocks action", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          run_id: "run-blocks",
          status: "completed",
          result: { blocks: [] },
        }),
    } as unknown as Response);
    globalThis.fetch = fetchMock;

    const client = new PepkioClient({ apiKey: "test-key" });
    const res = await client.listBlocks("genomics");

    expect(res.result?.blocks).toEqual([]);
  });

  it("getRun() queries /runs/{runId}", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          run_id: "run-abc",
          status: "completed",
          result: {},
        }),
    } as unknown as Response);
    globalThis.fetch = fetchMock;

    const client = new PepkioClient({ apiKey: "test-key" });
    const res = await client.getRun("run-abc");

    expect(res.run_id).toBe("run-abc");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://tools.pepkio.com/api/tools/v1/runs/run-abc",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("waitForRun() polls until completed", async () => {
    let callCount = 0;
    globalThis.fetch = vi.fn().mockImplementation(async () => {
      callCount++;
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            run_id: "run-polling",
            status: callCount >= 2 ? "completed" : "running",
            result: callCount >= 2 ? { scenario: "human-wgs-clinical" } : undefined,
          }),
      } as unknown as Response;
    });

    const client = new PepkioClient({ apiKey: "test-key" });
    const result = await client.waitForRun("run-polling", {
      intervalMs: 10,
      timeoutMs: 500,
    });

    expect(result.status).toBe("completed");
    expect(callCount).toBe(2);
  });

  it("waitForRun() throws on timeout", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          run_id: "run-slow",
          status: "running",
        }),
    } as unknown as Response);

    const client = new PepkioClient({ apiKey: "test-key" });
    await expect(
      client.waitForRun("run-slow", { intervalMs: 10, timeoutMs: 50 }),
    ).rejects.toThrow(/Timed out waiting for run/);
  });
});

describe("config helpers", () => {
  it("resolveBaseUrl handles overrides and defaults", () => {
    expect(resolveBaseUrl("https://custom.pepkio.com/")).toBe("https://custom.pepkio.com");
    expect(resolveBaseUrl()).toBe(DEFAULT_API_BASE_URL);
  });

  it("resolveApiKey prefers local key for localtest.me", () => {
    const origLocal = process.env.LOCAL_PEPKIO_API_KEY;
    const origProd = process.env.PEPKIO_API_KEY;

    try {
      process.env.LOCAL_PEPKIO_API_KEY = "local-secret";
      process.env.PEPKIO_API_KEY = "prod-secret";

      expect(resolveApiKey("https://tools.localtest.me")).toBe("local-secret");
      expect(resolveApiKey("https://tools.pepkio.com")).toBe("prod-secret");
      expect(resolveApiKey("https://tools.pepkio.com", "explicit-key")).toBe("explicit-key");
    } finally {
      process.env.LOCAL_PEPKIO_API_KEY = origLocal;
      process.env.PEPKIO_API_KEY = origProd;
    }
  });

  it("apiPath handles slashes correctly", () => {
    expect(apiPath("https://tools.pepkio.com", "/tools/dmp-in-a-flash/manifest")).toBe(
      "https://tools.pepkio.com/api/tools/v1/tools/dmp-in-a-flash/manifest",
    );
    expect(apiPath("https://tools.pepkio.com", "runs/123")).toBe(
      "https://tools.pepkio.com/api/tools/v1/runs/123",
    );
  });
});
