import { XFrameError } from "../errors/xframe-error.js";
import { finiteNumber } from "../geometry/finite.js";
import type { CombinationInput, CombinationRecord } from "../model/domain-records.js";
import { parseIdentifier } from "../model/identifier.js";

export function createLoadCombination(input: CombinationInput): CombinationRecord {
  if (!Array.isArray(input.factors) || input.factors.length === 0) {
    throw new XFrameError("INPUT_INVALID", "A load combination requires at least one factor.", {
      kind: "input", path: "combination.factors", expected: "nonempty array", actual: Array.isArray(input.factors) ? String(input.factors.length) : typeof input.factors,
    });
  }
  const seen = new Set<string>();
  const factors = input.factors.map((factor, index) => {
    const resultId = parseIdentifier(factor.resultId, `combination.factors[${index}].resultId`);
    if (seen.has(resultId)) {
      throw new XFrameError("INPUT_INVALID", "Combination factors cannot repeat a result identifier.", {
        kind: "input", path: `combination.factors[${index}].resultId`, expected: "unique result identifier", actual: resultId,
      });
    }
    seen.add(resultId);
    const value = finiteNumber(factor.factor, `combination.factors[${index}].factor`);
    if (value === 0) {
      throw new XFrameError("INPUT_INVALID", "Combination factors cannot be zero.", {
        kind: "input", path: `combination.factors[${index}].factor`, expected: "finite nonzero factor", actual: "0",
      });
    }
    return Object.freeze({ resultId, factor: value });
  });
  return Object.freeze({ id: parseIdentifier(input.id, "combination.id"), factors: Object.freeze(factors) });
}
