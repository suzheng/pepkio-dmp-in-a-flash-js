// SPDX-License-Identifier: MIT
import type {
  DmpAccessLevel,
  DmpAction,
  DmpBlockCategory,
  DmpDataCategory,
  DmpFunder,
  DmpInput,
  DmpIntake,
  DmpProject,
  DmpScenario,
} from "./schemas.js";

export type RunStatus = "queued" | "running" | "completed" | "failed" | (string & {});

export interface RunOptions {
  idempotency_key?: string;
  label?: string;
  [key: string]: unknown;
}

export interface RunResult<T = DmpResult> {
  run_id: string;
  status: RunStatus;
  result?: T;
  error?: string | { message?: string; code?: string; details?: unknown } | null;
  result_url?: string;
  permalink?: string;
  duration_ms?: number;
}

export interface ManifestExample {
  name: string;
  description?: string;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
}

export interface ToolManifest {
  schema_version: string;
  tool_id: string;
  title: string;
  description?: string;
  tags?: string[];
  category?: string;
  execution_mode?: string;
  estimated_runtime_sec?: number;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  agent_notes?: string;
  example_prompts?: string[];
  examples?: ManifestExample[];
  limits?: Record<string, unknown>;
  input_schema?: Record<string, unknown>;
}

export interface ExampleMeta {
  name: string;
  description?: string;
}

export type DmpComplianceStatus = "pass" | "warn" | "fail" | (string & {});

export interface DmpComplianceItem {
  id: string;
  label: string;
  status: DmpComplianceStatus;
  message: string;
}

export interface DmpBlock {
  id: string;
  category: string;
  title: string;
  repository?: string;
  tags?: string[];
  snippet: string;
}

export interface DmpResult {
  text?: string;
  compliance?: DmpComplianceItem[];
  aiRephrased?: boolean;
  warnings?: string[];
  pageEstimate?: number;
  charCount?: number;
  blocks?: DmpBlock[];
  content?: string;
  filename?: string;
  mime_type?: string;
  intake?: DmpIntake | Record<string, unknown>;
  scenario?: string;
  label?: string;
  description?: string;
  [key: string]: unknown;
}

export class PepkioAPIError extends Error {
  readonly status: number;
  readonly body?: unknown;
  readonly runId?: string;
  readonly code?: string;

  constructor(
    message: string,
    opts: { status: number; body?: unknown; runId?: string; code?: string },
  ) {
    super(message);
    this.name = "PepkioAPIError";
    this.status = opts.status;
    this.body = opts.body;
    this.runId = opts.runId;
    this.code = opts.code;
  }
}
