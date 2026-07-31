import type { FinalizedModel } from "../model/finalized-model.js";

export function analysisCacheKey(model: FinalizedModel): string {
  return `analysis:${model.loadCases[0]?.compatibilityKey ?? model.fingerprint}`;
}
