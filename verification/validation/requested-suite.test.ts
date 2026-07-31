import { describe, expect, it } from "vitest";
import { requestedValidationCases } from "./requested-validation-cases.js";

const requiredCategories = Array.from({ length: 12 }, (_, index) => index + 1);

describe("requested comprehensive validation matrix", () => {
  it("VAL-MATRIX-000: includes every requested category", () => {
    expect([...new Set(requestedValidationCases.map(({ category }) => category))].sort((a, b) => a - b)).toEqual(requiredCategories);
  });

  for (const validationCase of requestedValidationCases) {
    it(`${validationCase.id}: ${validationCase.description}`, () => {
      const result = validationCase.run();
      expect(Number.isFinite(result.maxErrorPercent)).toBe(true);
      expect(result.values.length).toBeGreaterThan(0);
      expect(result.pass).toBe(true);
    });
  }
});
