import type { StructuralResult } from "../results/result-types.js";
import { canonicalJson } from "./canonical-json.js";

export const RESULT_SCHEMA_VERSION = "3" as const;

export interface ResultJsonV3 {
  readonly schemaVersion: typeof RESULT_SCHEMA_VERSION;
  readonly result: StructuralResult;
}

/** Deprecated alias for ResultJsonV3, retained for compatibility. */
export type ResultJsonV2 = ResultJsonV3;

/** Converts an immutable structural result to the complete version-three JSON result representation. */
export function resultToJsonValue(result: StructuralResult): ResultJsonV3 {
  return {
    schemaVersion: RESULT_SCHEMA_VERSION,
    result: JSON.parse(canonicalJson(result)) as StructuralResult,
  };
}
