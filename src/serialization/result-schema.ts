import type { StructuralResult } from "../results/result-types.js";
import { canonicalJson } from "./canonical-json.js";

export const RESULT_SCHEMA_VERSION = "3" as const;

export interface ResultJsonV2 {
  readonly schemaVersion: typeof RESULT_SCHEMA_VERSION;
  readonly result: StructuralResult;
}

/** Converts an immutable structural result to the complete version-two JSON result representation. */
export function resultToJsonValue(result: StructuralResult): ResultJsonV2 {
  return {
    schemaVersion: RESULT_SCHEMA_VERSION,
    result: JSON.parse(canonicalJson(result)) as StructuralResult,
  };
}
