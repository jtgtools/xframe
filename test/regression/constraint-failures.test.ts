import { describe, expect, it } from "vitest";
import { compileConstraints } from "../../src/constraints/compile-constraints.js";
import { XFrameError } from "../../src/errors/xframe-error.js";

describe("constraint failures", () => {
  it("FR-CON-002: classifies a directed equal-DOF cycle", () => {
    expect(() =>
      compileConstraints(3, [
        { sourceId: "c1", terms: [{ dof: 0, coefficient: 1 }, { dof: 1, coefficient: -1 }], rightHandSide: 0 },
        { sourceId: "c2", terms: [{ dof: 1, coefficient: 1 }, { dof: 2, coefficient: -1 }], rightHandSide: 0 },
        { sourceId: "c3", terms: [{ dof: 2, coefficient: 1 }, { dof: 0, coefficient: -1 }], rightHandSide: 0 },
      ]),
    ).toThrow(XFrameError);
  });

  it("FR-CON-003: rejects out-of-range DOFs and unsafe transform storage", () => {
    expect(() =>
      compileConstraints(2, [
        { sourceId: "bad", terms: [{ dof: 2, coefficient: 1 }], rightHandSide: 0 },
      ]),
    ).toThrow(XFrameError);
    expect(() => compileConstraints(100, [], { maximumTransformNonzeros: 50 })).toThrow(XFrameError);
  });
});
