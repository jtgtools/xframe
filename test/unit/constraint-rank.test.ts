import { describe, expect, it } from "vitest";
import { analyzeConstraintRank } from "../../src/constraints/constraint-rank.js";
import { canonicalizeConstraint } from "../../src/constraints/canonicalize-constraint.js";
import { XFrameError } from "../../src/errors/xframe-error.js";

const equation = (sourceId: string, coefficients: readonly number[], rhs: number) =>
  canonicalizeConstraint({
    sourceId,
    terms: coefficients.flatMap((coefficient, dof) =>
      coefficient === 0 ? [] : [{ dof, coefficient }],
    ),
    rightHandSide: rhs,
  });

describe("constraint rank", () => {
  it("FR-CON-002: identifies independent pivots and harmless redundancy", () => {
    const result = analyzeConstraintRank([
      equation("c1", [1, -1, 0], 0),
      equation("c2", [0, 1, -1], 0),
      equation("c3", [1, 0, -1], 0),
    ]);
    expect(result.rank).toBe(2);
    expect(result.redundantSourceIds).toEqual(["c3"]);
  });

  it("FR-CON-002: rejects conflicting dependent right-hand sides", () => {
    expect(() =>
      analyzeConstraintRank([equation("c1", [1, -1], 0), equation("c2", [2, -2], 1)]),
    ).toThrow(XFrameError);
  });

  it.each([1e-300, -1e-300, 1e300, -1e300])(
    "FR-SAFE-003: retains independent rows after small coefficient cancellation at scale %s",
    (scale) => {
      const result = analyzeConstraintRank([
        equation("a", [scale, scale * 2e-14], 0),
        equation("b", [scale, scale * 3e-14], 0),
      ]);
      expect(result.rank).toBe(2);
      expect(result.redundantSourceIds).toEqual([]);
      expect(result.rows.map(({ pivotDof }) => pivotDof)).toEqual([0, 1]);
    },
  );

  it.each([1e-300, -1e-300, 1e300, -1e300])(
    "FR-SAFE-003: reports a scaled contradictory dependent row at scale %s",
    (scale) => {
      let thrown: unknown;
      try {
        analyzeConstraintRank([
          equation("a", [scale, scale * 2e-14], scale * 1e-14),
          equation("b", [scale, scale * 2e-14], scale * 2e-14),
        ]);
      } catch (error) {
        thrown = error;
      }
      expect(thrown).toBeInstanceOf(XFrameError);
      expect((thrown as XFrameError).code).toBe("CONSTRAINT_CONTRADICTION");
    },
  );

  it("FR-SAFE-003: keeps relative coefficient cancellation during backward elimination", () => {
    const result = analyzeConstraintRank([
      equation("a", [1, 1e-4, 1.000001e-8], 0),
      equation("b", [0, 1, 1e-4], 0),
    ]);
    expect(result.rank).toBe(2);
    expect(result.redundantSourceIds).toEqual([]);
    expect(result.rows.map(({ pivotDof }) => pivotDof)).toEqual([0, 1]);
    expect(result.rows[0]!.coefficients.has(1)).toBe(false);
    expect(result.rows[0]!.coefficients.get(2)).toBeGreaterThan(0);
    expect(result.rows[0]!.coefficients.get(2)).toBeLessThan(2e-14);
  });
});
