import { describe, expect, it } from "vitest";
import { compileConstraints } from "../../src/constraints/compile-constraints.js";
import { XFrameError } from "../../src/errors/xframe-error.js";

describe("constraint failures", () => {
  it("FR-CON-002: classifies a directed equal-DOF cycle", () => {
    expect(() =>
      compileConstraints(3, [
        {
          sourceId: "c1",
          terms: [
            { dof: 0, coefficient: 1 },
            { dof: 1, coefficient: -1 },
          ],
          rightHandSide: 0,
        },
        {
          sourceId: "c2",
          terms: [
            { dof: 1, coefficient: 1 },
            { dof: 2, coefficient: -1 },
          ],
          rightHandSide: 0,
        },
        {
          sourceId: "c3",
          terms: [
            { dof: 2, coefficient: 1 },
            { dof: 0, coefficient: -1 },
          ],
          rightHandSide: 0,
        },
      ]),
    ).toThrow(XFrameError);
  });

  it("FR-CON-003: rejects out-of-range DOFs and unsafe transform storage", () => {
    expect(() =>
      compileConstraints(2, [
        { sourceId: "bad", terms: [{ dof: 2, coefficient: 1 }], rightHandSide: 0 },
      ]),
    ).toThrow(XFrameError);
    expect(() => compileConstraints(100, [], { maximumTransformNonzeros: 50 })).toThrow(
      XFrameError,
    );
  });

  it.each([1e-300, -1e-300, 1e300, -1e300])(
    "FR-SAFE-003: preserves compiled rank and pivots after cancellation at scale %s",
    (scale) => {
      const compiled = compileConstraints(2, [
        {
          sourceId: "a",
          terms: [
            { dof: 0, coefficient: scale },
            { dof: 1, coefficient: scale * 2e-14 },
          ],
          rightHandSide: 0,
        },
        {
          sourceId: "b",
          terms: [
            { dof: 0, coefficient: scale },
            { dof: 1, coefficient: scale * 3e-14 },
          ],
          rightHandSide: 0,
        },
      ]);
      expect(compiled.pivotDofs).toEqual([0, 1]);
      expect(compiled.freeDofs).toEqual([]);
      expect(compiled.redundantSourceIds).toEqual([]);
    },
  );

  it("FR-SAFE-003: preserves a small contradictory residual independently of coefficient scale", () => {
    let thrown: unknown;
    try {
      compileConstraints(2, [
        {
          sourceId: "a",
          terms: [
            { dof: 0, coefficient: -1e300 },
            { dof: 1, coefficient: -2e286 },
          ],
          rightHandSide: -1e286,
        },
        {
          sourceId: "b",
          terms: [
            { dof: 0, coefficient: -1e300 },
            { dof: 1, coefficient: -2e286 },
          ],
          rightHandSide: -2e286,
        },
      ]);
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(XFrameError);
    expect((thrown as XFrameError).code).toBe("CONSTRAINT_CONTRADICTION");
  });

  it.each([1, -1, 2 ** 986, -(2 ** 986), 2 ** -986, -(2 ** -986)])(
    "FR-SAFE-003: keeps a scale-invariant independent public chain at scale %s",
    (scale) => {
      const q = 3.2515731794557063e-14;
      const f = 3.251573179455313e-14;
      const compiled = compileConstraints(24, [
        ...Array.from({ length: 23 }, (_, index) => ({
          sourceId: `a${String(index).padStart(2, "0")}`,
          terms: [
            { dof: index, coefficient: scale },
            { dof: index + 1, coefficient: scale * q },
          ],
          rightHandSide: 0,
        })),
        {
          sourceId: "z",
          terms: [
            { dof: 0, coefficient: scale },
            { dof: 1, coefficient: scale * f },
          ],
          rightHandSide: 0,
        },
      ]);
      expect(compiled.pivotDofs).toEqual(Array.from({ length: 24 }, (_, index) => index));
      expect(compiled.redundantSourceIds).toEqual([]);
    },
  );

  it.each([1, 2 ** 45])(
    "FR-SAFE-003: retains the backward tail through a normalized public chain at tail scale %s",
    (tailScale) => {
      const q = 3.2515731794557063e-14;
      const r = 0.999999999999943;
      const compiled = compileConstraints(26, [
        ...Array.from({ length: 23 }, (_, index) => ({
          sourceId: `a${String(index).padStart(2, "0")}`,
          terms: [
            { dof: index, coefficient: 1 },
            { dof: index + 1, coefficient: q },
          ],
          rightHandSide: 0,
        })),
        {
          sourceId: "a23",
          terms: [
            { dof: 23, coefficient: 1 },
            { dof: 24, coefficient: tailScale },
            { dof: 25, coefficient: tailScale * r },
          ],
          rightHandSide: 0,
        },
        {
          sourceId: "z",
          terms: [
            { dof: 24, coefficient: 1 },
            { dof: 25, coefficient: 1 },
          ],
          rightHandSide: 0,
        },
      ]);
      expect(compiled.pivotDofs).toEqual(Array.from({ length: 25 }, (_, index) => index));
      expect(compiled.rows[0]!.terms.some(({ reducedDof }) => reducedDof === 0)).toBe(true);
    },
  );

  it.each([1, -1])(
    "FR-SAFE-003: rejects a subnormal contradictory RHS residual at sign %s",
    (sign) => {
      const m = sign * 6e-311;
      const p = sign * (6e-311 - Number.MIN_VALUE);
      let thrown: unknown;
      try {
        compileConstraints(1, [
          { sourceId: "a", terms: [{ dof: 0, coefficient: 1 }], rightHandSide: p },
          { sourceId: "b", terms: [{ dof: 0, coefficient: 1 }], rightHandSide: m },
        ]);
      } catch (error) {
        thrown = error;
      }
      expect(thrown).toBeInstanceOf(XFrameError);
      expect((thrown as XFrameError).code).toBe("CONSTRAINT_CONTRADICTION");
    },
  );

  it("FR-SAFE-003: reports nonfinite backward elimination arithmetic structurally", () => {
    let thrown: unknown;
    try {
      compileConstraints(3, [
        {
          sourceId: "a",
          terms: [
            { dof: 0, coefficient: 1 },
            { dof: 1, coefficient: 1e13 },
          ],
          rightHandSide: 0,
        },
        {
          sourceId: "b",
          terms: [
            { dof: 1, coefficient: 1 },
            { dof: 2, coefficient: 1 },
          ],
          rightHandSide: Number.MAX_VALUE,
        },
      ]);
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(XFrameError);
    expect((thrown as XFrameError).code).toBe("NON_FINITE_VALUE");
  });
});
