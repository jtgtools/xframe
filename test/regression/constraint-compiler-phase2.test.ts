import { describe, expect, it } from "vitest";
import { compileConstraints } from "../../src/constraints/compile-constraints.js";
import { maximumSemanticConstraintResidual } from "../../src/constraints/semantic-constraint-validation.js";
import { XFrameError } from "../../src/errors/xframe-error.js";

describe("constraint compiler canaries", () => {
  it("XF-001 recover compensation: 20,000 tiny coefficients do not vanish from the pivot displacement", () => {
    const count = 20000;
    const fullDofCount = count + 2;
    const equation = {
      sourceId: "tiny-sum",
      terms: [
        { dof: 0, coefficient: 1 },
        { dof: 1, coefficient: -1 },
        ...Array.from({ length: count }, (_, i) => ({ dof: i + 2, coefficient: 1e-17 })),
      ],
      rightHandSide: 0,
    };
    const compiled = compileConstraints(fullDofCount, [equation]);
    expect(compiled.reducedDofCount).toBe(fullDofCount - 1);
    const unit = new Float64Array(compiled.reducedDofCount).fill(1);
    const recovered = compiled.recover(unit);
    expect(recovered[0]).toBeCloseTo(0.9999999999998, 13);
    const residual = maximumSemanticConstraintResidual([equation], recovered);
    expect(residual).toBeLessThanOrEqual(256 * Number.EPSILON);
  });

  it("XF-001 back-substitution compensation: 2,000 tiny coefficients accumulate through pivot-expression composition", () => {
    const count = 2000;
    const qDof = count + 2;
    const fullDofCount = qDof + 1;
    const equations = [
      {
        sourceId: "root",
        terms: [
          { dof: 0, coefficient: 1 },
          { dof: 1, coefficient: 1 },
          ...Array.from({ length: count }, (_, i) => ({ dof: i + 2, coefficient: 1e-16 })),
          { dof: qDof, coefficient: -1 },
        ],
        rightHandSide: 0,
      },
      ...Array.from({ length: count + 1 }, (_, i) => ({
        sourceId: `link-${i + 1}`,
        terms: [
          { dof: i + 1, coefficient: 1 },
          { dof: qDof, coefficient: -1 },
        ],
        rightHandSide: 0,
      })),
    ];
    const compiled = compileConstraints(fullDofCount, equations);
    expect(compiled.reducedDofCount).toBe(1);
    expect(compiled.freeDofs).toEqual([qDof]);
    expect(compiled.recover([1])[0]).toBeCloseTo(-2e-13, 15);
    expect(compiled.recover([-0.5])[0]).toBeCloseTo(1e-13, 15);
  }, 30_000);

  it("FR-SAFE-003: pivot-expression growth stays within maximumTransformNonzeros", () => {
    const fullDofCount = 201;
    const equations = [
      {
        sourceId: "wide",
        terms: Array.from({ length: fullDofCount }, (_, i) => ({ dof: i, coefficient: 1 })),
        rightHandSide: 0,
      },
    ];
    const thrown = (() => {
      try {
        compileConstraints(fullDofCount, equations, { maximumTransformNonzeros: 300 });
        return undefined;
      } catch (error) {
        return error as XFrameError;
      }
    })();
    expect(thrown).toBeDefined();
    expect(thrown!.code).toBe("MEMORY_LIMIT_EXCEEDED");
    const compiled = compileConstraints(fullDofCount, equations);
    expect(compiled.transformNonzeroCount).toBe(400);
  });
});
