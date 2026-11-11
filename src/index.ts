// SPDX-License-Identifier: MIT

export {
  PepkioClient,
  type PepkioClientOptions,
  type GenerateDmpOptions,
  type CheckComplianceOptions,
  type ExportDocxOptions,
} from "./client.js";

export {
  TOOL_ID,
  DEFAULT_API_BASE_URL,
  resolveBaseUrl,
  resolveApiKey,
  apiPath,
} from "./config.js";

export {
  ACTIONS,
  FUNDERS,
  DATA_CATEGORIES,
  ACCESS_LEVELS,
  SCENARIOS,
  BLOCK_CATEGORIES,
  dmpInputSchema,
  dmpIntakeSchema,
  dmpProjectSchema,
  parseRunInput,
  type DmpAction,
  type DmpFunder,
  type DmpDataCategory,
  type DmpAccessLevel,
  type DmpScenario,
  type DmpBlockCategory,
  type DmpIntake,
  type DmpProject,
  type DmpInput,
} from "./schemas.js";

export {
  PepkioAPIError,
  type RunStatus,
  type RunOptions,
  type RunResult,
  type ManifestExample,
  type ToolManifest,
  type ExampleMeta,
  type DmpComplianceStatus,
  type DmpComplianceItem,
  type DmpBlock,
  type DmpResult,
} from "./types.js";
