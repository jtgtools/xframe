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
});
