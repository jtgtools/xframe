import { describe, expect, it } from "vitest";
import { canonicalizeConstraint } from "../../src/constraints/canonicalize-constraint.js";
import { XFrameError } from "../../src/errors/xframe-error.js";

const COEFFICIENT_SCALES = [
  1e-300, -1e-300, 1e-120, -1e-120, 1, -1, 1e120, -1e120, 1e300, -1e300,
] as const;

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
    expect(() => canonicalizeConstraint({ sourceId: "bad", terms: [], rightHandSide: 1 })).toThrow(
      XFrameError,
    );
    expect(canonicalizeConstraint({ sourceId: "zero", terms: [], rightHandSide: 0 }).terms).toEqual(
      [],
    );
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

  it.each(COEFFICIENT_SCALES)(
    "FR-SAFE-003: canonical topology is invariant at coefficient scale %s",
    (scale) => {
      const reference = canonicalizeConstraint({
        sourceId: "scaled",
        terms: [
          { dof: 0, coefficient: 1 },
          { dof: 1, coefficient: -2 },
          { dof: 2, coefficient: 4 },
        ],
        rightHandSide: 8,
      });
      expect(
        canonicalizeConstraint({
          sourceId: "scaled",
          terms: [
            { dof: 0, coefficient: scale },
            { dof: 1, coefficient: -2 * scale },
            { dof: 2, coefficient: 4 * scale },
          ],
          rightHandSide: 8 * scale,
        }),
      ).toEqual(reference);
    },
  );

  it("FR-SAFE-003: sums duplicate coefficients before scale-relative pruning", () => {
    expect(
      canonicalizeConstraint({
        sourceId: "duplicates",
        terms: [
          { dof: 0, coefficient: 1e-120 },
          { dof: 0, coefficient: 1e-120 },
          { dof: 1, coefficient: -1e-120 },
        ],
        rightHandSide: 3e-120,
      }),
    ).toEqual({
      sourceId: "duplicates",
      terms: [
        { dof: 0, coefficient: 1 },
        { dof: 1, coefficient: -0.5 },
      ],
      rightHandSide: 1.5,
    });
  });

  it("FR-SAFE-003: retains a valid coefficient below the absolute unit floor", () => {
    expect(
      canonicalizeConstraint({
        sourceId: "sub-unit",
        terms: [{ dof: 0, coefficient: 1e-20 }],
        rightHandSide: 2e-20,
      }),
    ).toEqual({
      sourceId: "sub-unit",
      terms: [{ dof: 0, coefficient: 1 }],
      rightHandSide: 2,
    });
  });

  it("FR-SAFE-003: keeps coefficient pruning independent of RHS magnitude", () => {
    const terms = [
      { dof: 0, coefficient: 1e-8 },
      { dof: 1, coefficient: 1e-13 },
    ] as const;
    const zeroRhs = canonicalizeConstraint({ sourceId: "rhs", terms, rightHandSide: 0 });
    const largeRhs = canonicalizeConstraint({
      sourceId: "rhs",
      terms,
      rightHandSide: 1e300,
    });
    expect(largeRhs.terms).toEqual(zeroRhs.terms);
    expect(largeRhs.rightHandSide).toBe(1e308);
  });

  it("FR-SAFE-003: prunes duplicate cancellation relative to original coefficient scale", () => {
    const scale = 1e-120;
    const retained = canonicalizeConstraint({
      sourceId: "near-retained",
      terms: [
        { dof: 0, coefficient: scale },
        { dof: 0, coefficient: -(1 - 1e-10) * scale },
        { dof: 1, coefficient: scale },
      ],
      rightHandSide: 0,
    });
    expect(retained.terms.map(({ dof }) => dof)).toEqual([0, 1]);

    const pruned = canonicalizeConstraint({
      sourceId: "near-pruned",
      terms: [
        { dof: 0, coefficient: scale },
        { dof: 0, coefficient: -(1 - 1e-15) * scale },
        { dof: 1, coefficient: scale },
      ],
      rightHandSide: 0,
    });
    expect(pruned.terms.map(({ dof }) => dof)).toEqual([1]);
  });

  it("FR-SAFE-003: treats every exact nonzero zero-term RHS as contradictory", () => {
    let thrown: unknown;
    try {
      canonicalizeConstraint({
        sourceId: "tiny-contradiction",
        terms: [],
        rightHandSide: Number.MIN_VALUE,
      });
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(XFrameError);
    expect((thrown as XFrameError).code).toBe("CONSTRAINT_CONTRADICTION");
  });

  it("FR-SAFE-003: retains subnormal cancellation across exact power-of-two scaling", () => {
    const m = 3e-310;
    const p = m - Number.MIN_VALUE;
    const residual = m - p;
    const scale = 2 ** 996;
    const base = {
      sourceId: "subnormal-cancellation",
      terms: [
        { dof: 0, coefficient: m },
        { dof: 0, coefficient: -p },
      ],
      rightHandSide: residual,
    };
    const scaled = {
      sourceId: "subnormal-cancellation",
      terms: [
        { dof: 0, coefficient: m * scale },
        { dof: 0, coefficient: -p * scale },
      ],
      rightHandSide: residual * scale,
    };

    const baseCanonical = canonicalizeConstraint(base);
    const scaledCanonical = canonicalizeConstraint(scaled);
    expect(baseCanonical.terms.map(({ dof }) => dof)).toEqual([0]);
    expect(scaledCanonical.terms.map(({ dof }) => dof)).toEqual([0]);
    expect(scaledCanonical).toEqual(baseCanonical);
  });
});
