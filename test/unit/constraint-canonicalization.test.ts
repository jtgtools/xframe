import { describe, expect, it } from "vitest";
import { canonicalizeConstraint } from "../../src/constraints/canonicalize-constraint.js";
import { XFrameError } from "../../src/errors/xframe-error.js";

describe("constraint canonicalization", () => {
  it("FR-CON-001: combines duplicate terms, removes zeros, and normalizes sign and scale", () => {
    const result = canonicalizeConstraint({
      sourceId: "c1",
      terms: [
        { dof: 2, coefficient: 4 },
        { dof: 0, coefficient: -2 },
        { dof: 2, coefficient: -2 },
        { dof: 1, coefficient: 0 },
      ],
      rightHandSide: 6,
    });
    expect(result).toEqual({
      sourceId: "c1",
      terms: [
        { dof: 0, coefficient: 1 },
        { dof: 2, coefficient: -1 },
      ],
      rightHandSide: -3,
    });
  });

  it("FR-CON-001: rejects empty contradictory equations and accepts zero identities", () => {
    expect(() =>
      canonicalizeConstraint({ sourceId: "bad", terms: [], rightHandSide: 1 }),
    ).toThrow(XFrameError);
    expect(canonicalizeConstraint({ sourceId: "zero", terms: [], rightHandSide: 0 }).terms).toEqual([]);
  });

  it("FR-CON-001/FR-JSON-004: rejects invalid indices and nonfinite coefficients", () => {
    expect(() =>
      canonicalizeConstraint({
        sourceId: "bad-index",
        terms: [{ dof: -1, coefficient: 1 }],
        rightHandSide: 0,
      }),
    ).toThrow(XFrameError);
    expect(() =>
      canonicalizeConstraint({
        sourceId: "bad-number",
        terms: [{ dof: 0, coefficient: Number.NaN }],
        rightHandSide: 0,
      }),
    ).toThrow(XFrameError);
  });
});
