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
      analyzeConstraintRank([
        equation("c1", [1, -1], 0),
        equation("c2", [2, -2], 1),
      ]),
    ).toThrow(XFrameError);
  });
});
