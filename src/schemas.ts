// SPDX-License-Identifier: MIT
import { z } from "zod";

export const ACTIONS = [
  "generate",
  "compliance_check",
  "export_docx",
  "load_preset",
  "list_blocks",
] as const;
export type DmpAction = (typeof ACTIONS)[number];

export const FUNDERS = ["nih-2023", "nih-2026", "nsf", "generic"] as const;
export type DmpFunder = (typeof FUNDERS)[number];

export const DATA_CATEGORIES = [
  "human",
  "model_organism",
  "imaging",
  "clinical",
  "other",
] as const;
export type DmpDataCategory = (typeof DATA_CATEGORIES)[number];

export const ACCESS_LEVELS = ["open", "controlled"] as const;
export type DmpAccessLevel = (typeof ACCESS_LEVELS)[number];

export const SCENARIOS = [
  "human-wgs-clinical",
  "mouse-rnaseq",
  "cryo-em-structural",
  "human-imaging",
  "microbiome-metagenomics",
] as const;
export type DmpScenario = (typeof SCENARIOS)[number];

export const BLOCK_CATEGORIES = ["genomics", "imaging", "clinical"] as const;
export type DmpBlockCategory = (typeof BLOCK_CATEGORIES)[number];

export const dmpIntakeSchema = z.object({
  dataCategory: z.enum(DATA_CATEGORIES).optional(),
  dataDescription: z.string().optional(),
  dataVolume: z.string().optional(),
  repository: z.string().optional(),
  accessLevel: z.enum(ACCESS_LEVELS).optional(),
  sharingTimelineMonths: z.number().optional(),
  preservationStrategy: z.string().optional(),
  irbStatus: z.string().optional(),
  embargoMonths: z.number().optional(),
});
export type DmpIntake = z.infer<typeof dmpIntakeSchema>;

export const dmpProjectSchema = z.object({
  piName: z.string().optional(),
  proposalTitle: z.string().optional(),
  appId: z.string().optional(),
});
export type DmpProject = z.infer<typeof dmpProjectSchema>;

export const dmpInputSchema = z.object({
  action: z.enum(ACTIONS).optional(),
  funder: z.enum(FUNDERS).optional(),
  intake: dmpIntakeSchema.optional(),
  project: dmpProjectSchema.optional(),
  scenarioId: z.enum(SCENARIOS).optional(),
  text: z.string().optional(),
  useAi: z.boolean().optional(),
  includeTitleBlock: z.boolean().optional(),
  blockCategory: z.enum(BLOCK_CATEGORIES).optional(),
  blockQuery: z.string().optional(),
});
export type DmpInput = z.infer<typeof dmpInputSchema>;

export function parseRunInput(input: unknown): DmpInput {
  return dmpInputSchema.parse(input);
}
