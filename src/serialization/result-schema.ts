import type { StructuralResult } from "../results/result-types.js";
import { canonicalJson } from "./canonical-json.js";

export const RESULT_SCHEMA_VERSION = "1" as const;

export interface ResultJsonV1 {
  readonly schemaVersion: typeof RESULT_SCHEMA_VERSION;
  readonly result: StructuralResult;
}

/** Converts an immutable structural result to the complete version-one JSON result representation. */
export function resultToJsonValue(result: StructuralResult): ResultJsonV1 {
  return {
    schemaVersion: RESULT_SCHEMA_VERSION,
    result: JSON.parse(canonicalJson(result)) as StructuralResult,
  };
}
