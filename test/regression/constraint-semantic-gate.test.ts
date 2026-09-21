import { describe, expect, it } from "vitest";
import { prepareAnalysis } from "../../src/analysis/prepare-analysis.js";
import { compileConstraints } from "../../src/constraints/compile-constraints.js";
import {
  evaluateAffineSemanticResidual,
  findSemanticTransformViolation,
  SEMANTIC_CONSTRAINT_TOLERANCE,
} from "../../src/constraints/semantic-constraint-validation.js";
import type {
  AffineConstraintEquation,
  AffineConstraintTerm,
} from "../../src/constraints/affine-equation.js";
import { createModelBuilder } from "../../src/model/model-builder.js";
import { parseIdentifier } from "../../src/model/identifier.js";
import { createCaseDiagnostics } from "../../src/results/case-diagnostics.js";

const units = {
  version: "1",
  length: "m",
  force: "N",
  moment: "N*m",
  modulus: "Pa",
  distributedForce: "N/m",
  density: "kg/m^3",
  rotation: "rad",
} as const;

function reproducerModel(coupleId: string, fixId: string) {
  return createModelBuilder()
    .setUnitSystem(units)
    .addNode({ id: "n", coordinates: [0, 0, 0] })
    .addSpring({ id: "ks", startNodeId: "n", stiffness: [10, 20, 0, 0, 0, 0] })
    .addConstraint({
      id: coupleId,
      terms: [
        { nodeId: "n", dof: "ux", coefficient: 2e-14 },
        { nodeId: "n", dof: "uy", coefficient: 1 },
      ],
      rightHandSide: 1,
    })
    .addConstraint({
      id: fixId,
      terms: [{ nodeId: "n", dof: "ux", coefficient: 1 }],
      rightHandSide: 2,
    })
    .addLoadCase({ id: "LC", loads: [] })
    .finalize();
}

describe("affine semantic residual evaluation", () => {
  it("semantic residual is zero for an exact equation", () => {
    const equation: AffineConstraintEquation = {
      sourceId: "s",
      terms: [{ dof: 0, coefficient: 1 }],
      rightHandSide: 2,
    };
    expect(evaluateAffineSemanticResidual(equation, [2, 0])).toBe(0);
  });

  it("semantic residual is one for a fully violated equation", () => {
    // ux = 2 supplied as ux = 0: numerator |0 - 2| = 2, scale |1*0| + 2 = 2.
    const equation: AffineConstraintEquation = {
      sourceId: "s",
      terms: [{ dof: 0, coefficient: 1 }],
      rightHandSide: 2,
    };
    expect(evaluateAffineSemanticResidual(equation, [0, 0])).toBe(1);
  });

  it("semantic residual is invariant to nonzero row scaling", () => {
    const equation: AffineConstraintEquation = {
      sourceId: "s",
      terms: [
        { dof: 0, coefficient: 2 },
        { dof: 1, coefficient: 3 },
      ],
      rightHandSide: 5,
    };
    const displacement = [1.5, -0.25];
    const expected = evaluateAffineSemanticResidual(equation, displacement);
    for (const scale of [7, -3, 1e-6, 1e6, -1]) {
      const scaled: AffineConstraintEquation = {
        sourceId: "s",
        terms: equation.terms.map(({ dof, coefficient }) => ({
          dof,
          coefficient: coefficient * scale,
        })),
        rightHandSide: equation.rightHandSide * scale,
      };
      expect(evaluateAffineSemanticResidual(scaled, displacement)).toBeCloseTo(expected, 12);
    }
  });

  it("semantic residual is invariant to term ordering", () => {
    const displacement = [1.5, -0.25, 0.125];
    const ordered: AffineConstraintEquation = {
      sourceId: "s",
      terms: [
        { dof: 0, coefficient: 2 },
        { dof: 1, coefficient: 3 },
        { dof: 2, coefficient: -1 },
      ],
      rightHandSide: 5,
    };
    const reordered: AffineConstraintEquation = {
      sourceId: "s",
      terms: [
        { dof: 2, coefficient: -1 },
        { dof: 0, coefficient: 2 },
        { dof: 1, coefficient: 3 },
      ],
      rightHandSide: 5,
    };
    expect(evaluateAffineSemanticResidual(reordered, displacement)).toBe(
      evaluateAffineSemanticResidual(ordered, displacement),
    );
  });

  it("semantic residual values are invariant to source ID rename", () => {
    const equation: AffineConstraintEquation = {
      sourceId: "order-a",
      terms: [
        { dof: 0, coefficient: 2 },
        { dof: 1, coefficient: 3 },
      ],
      rightHandSide: 5,
    };
    const renamed: AffineConstraintEquation = {
      sourceId: "order-b",
      terms: equation.terms,
      rightHandSide: equation.rightHandSide,
    };
    const displacement = [1.5, -0.25];
    expect(evaluateAffineSemanticResidual(renamed, displacement)).toBe(
      evaluateAffineSemanticResidual(equation, displacement),
    );
  });

  it("semantic residual aggregates duplicate DOF terms with full contribution", () => {
    const split: AffineConstraintEquation = {
      sourceId: "split",
      terms: [
        { dof: 0, coefficient: 2 },
        { dof: 0, coefficient: 3 },
      ],
      rightHandSide: 5,
    };
    const combined: AffineConstraintEquation = {
      sourceId: "combined",
      terms: [{ dof: 0, coefficient: 5 }],
      rightHandSide: 5,
    };
    expect(evaluateAffineSemanticResidual(split, [1.2])).toBe(
      evaluateAffineSemanticResidual(combined, [1.2]),
    );
    expect(evaluateAffineSemanticResidual(split, [1.2])).toBeCloseTo(1 / 11, 14);
  });

  it("semantic residual treats an exact zero row as satisfied", () => {
    const equation: AffineConstraintEquation = {
      sourceId: "zero-row",
      terms: [{ dof: 0, coefficient: 0 }],
      rightHandSide: 0,
    };
    expect(evaluateAffineSemanticResidual(equation, [3.5])).toBe(0);
  });
});

describe("semantic transform validation", () => {
  it("semantic transform validation accepts an exact transform", () => {
    // u0 = q, u1 = q + 3 satisfies u1 - u0 = 3 for every q.
    const equations: readonly AffineConstraintEquation[] = [
      {
        sourceId: "difference",
        terms: [
          { dof: 0, coefficient: -1 },
          { dof: 1, coefficient: 1 },
        ],
        rightHandSide: 3,
      },
    ];
    const rows = [
      { offset: 0, terms: [{ reducedDof: 0, coefficient: 1 }] },
      { offset: 3, terms: [{ reducedDof: 0, coefficient: 1 }] },
    ];
    expect(findSemanticTransformViolation(equations, rows)).toBeUndefined();
  });

  it("semantic transform validation accepts a column with no contribution", () => {
    const equations: readonly AffineConstraintEquation[] = [
      {
        sourceId: "fix",
        terms: [{ dof: 0, coefficient: 1 }],
        rightHandSide: 2,
      },
    ];
    const rows = [
      { offset: 2, terms: [] },
      { offset: 0, terms: [{ reducedDof: 0, coefficient: 1 }] },
    ];
    expect(findSemanticTransformViolation(equations, rows)).toBeUndefined();
  });

  it("semantic transform validation rejects a corrupted constant vector", () => {
    // u1 - u0 = 3 with u1 offset corrupted to 2.9: constant numerator 0.1, scale 5.9.
    const equations: readonly AffineConstraintEquation[] = [
      {
        sourceId: "difference",
        terms: [
          { dof: 0, coefficient: -1 },
          { dof: 1, coefficient: 1 },
        ],
        rightHandSide: 3,
      },
    ];
    const rows = [
      { offset: 0, terms: [{ reducedDof: 0, coefficient: 1 }] },
      { offset: 2.9, terms: [{ reducedDof: 0, coefficient: 1 }] },
    ];
    const violation = findSemanticTransformViolation(equations, rows);
    expect(violation).toBeDefined();
    expect(violation!.sourceId).toBe("difference");
    expect(violation!.kind).toBe("constant");
    expect(violation!.normalizedResidual).toBeCloseTo(0.1 / 5.9, 14);
  });

  it("semantic transform validation rejects a corrupted transform column", () => {
    // u1 - u0 = 3 with u0 = 1.0000001 q: column residual -1e-7, scale ~2.0000001.
    const equations: readonly AffineConstraintEquation[] = [
      {
        sourceId: "difference",
        terms: [
          { dof: 0, coefficient: -1 },
          { dof: 1, coefficient: 1 },
        ],
        rightHandSide: 3,
      },
    ];
    const rows = [
      { offset: 0, terms: [{ reducedDof: 0, coefficient: 1.0000001 }] },
      { offset: 3, terms: [{ reducedDof: 0, coefficient: 1 }] },
    ];
    const violation = findSemanticTransformViolation(equations, rows);
    expect(violation).toBeDefined();
    expect(violation!.sourceId).toBe("difference");
    expect(violation!.kind).toBe("transform-column");
    expect(violation!.reducedDof).toBe(0);
  });
});

describe("compile-time containment", () => {
  it("reproducer ID order A solves to the exact answer", () => {
    const result = prepareAnalysis(reproducerModel("a", "b")).solveCase("LC");
    expect(result.fullDisplacements[0]).toBeCloseTo(2, 14);
    expect(result.fullDisplacements[1]).toBeCloseTo(1 - 4e-14, 14);
    expect(result.diagnostics.status).toBe("pass");
  });

  it("reproducer ID order B still solves to the exact answer", () => {
    const result = prepareAnalysis(reproducerModel("b", "a")).solveCase("LC");
    expect(result.fullDisplacements[0]).toBeCloseTo(2, 14);
    expect(result.fullDisplacements[1]).toBeCloseTo(1 - 4e-14, 14);
    expect(result.diagnostics.status).toBe("pass");
  });
});

describe("diagnostic hard gate", () => {
  function diagnosticInputWithDisplacements(displacements: ArrayLike<number>) {
    const analysis = prepareAnalysis(reproducerModel("b", "a"));
    const correct = analysis.solveCase("LC");
    const fullDisplacements = Float64Array.from(displacements);
    const product = analysis.fullStiffness.multiply(fullDisplacements);
    const fullResidual = Float64Array.from(
      product,
      (value, index) => value - correct.fullLoad[index]!,
    );
    const springs = [
      Object.freeze({
        id: parseIdentifier("ks", "springs[0].id"),
        grounded: true,
        globalEndForces: Object.freeze([
          10 * fullDisplacements[0]!,
          20 * fullDisplacements[1]!,
          0,
          0,
          0,
          0,
        ]),
      }),
    ];
    return {
      model: analysis.model,
      fullLoad: correct.fullLoad,
      fullResidual,
      fullDisplacements,
      reducedLoad: new Float64Array(analysis.constraints.reducedDofCount),
      reducedDisplacements: new Float64Array(analysis.constraints.reducedDofCount),
      residualMaximum: 0,
      normalizedResidual: 0,
      fullStiffness: analysis.fullStiffness,
      reducedStiffness: analysis.reducedStiffness,
      factor: analysis.factor,
      fullNonzeros: 1,
      reducedNonzeros: 1,
      skylineStorage: 1,
      skylineMaximumRowWidth: 1,
      skylineBandwidth: 1,
      springs,
    };
  }

  it("violated original equation prevents diagnostics pass even when old metrics are tiny", () => {
    // The audited wrong displacement ux = 0 violates ux = 2 while the old
    // self-confirming metrics (reduced residual, force/moment equilibrium,
    // relative energy error) all collapse to zero.
    const diagnostics = createCaseDiagnostics(
      diagnosticInputWithDisplacements([0, 0.99999999999996]),
    );
    expect(diagnostics.normalizedResidual).toBe(0);
    expect(diagnostics.relativeEnergyError).toBeLessThan(1e-12);
    expect(diagnostics.normalizedForceEquilibrium).toBeLessThan(1e-12);
    expect(diagnostics.normalizedMomentEquilibrium).toBeLessThan(1e-12);
    expect(diagnostics.status).toBe("fail");
  });

  it("exact original equation permits semantic diagnostic pass", () => {
    const diagnostics = createCaseDiagnostics(
      diagnosticInputWithDisplacements([2, 0.99999999999996]),
    );
    expect(diagnostics.status).toBe("pass");
  });
});

function cancellationPermutations(): AffineConstraintEquation[] {
  const coefficients = [1e16, 1, -1e16];
  const permutations = new Set<string>();
  const equations: AffineConstraintEquation[] = [];
  for (let first = 0; first < 3; first += 1) {
    for (let second = 0; second < 3; second += 1) {
      if (second === first) continue;
      const third = 3 - first - second;
      const key = `${coefficients[first]}:${coefficients[second]}:${coefficients[third]}`;
      if (permutations.has(key)) continue;
      permutations.add(key);
      equations.push({
        sourceId: `p${equations.length}`,
        terms: [
          { dof: 0, coefficient: coefficients[first]! },
          { dof: 0, coefficient: coefficients[second]! },
          { dof: 0, coefficient: coefficients[third]! },
        ],
        rightHandSide: 0,
      });
    }
  }
  return equations;
}

describe("compensated duplicate-DOF aggregation (reviewer cancellation canary)", () => {
  it("every permutation of [1e16, 1, -1e16] yields the effective equation ux = 0 (test A)", () => {
    const equations = cancellationPermutations();
    expect(equations).toHaveLength(6);
    const combined: AffineConstraintEquation = {
      sourceId: "combined",
      terms: [{ dof: 0, coefficient: 1 }],
      rightHandSide: 0,
    };
    const expectedViolation = evaluateAffineSemanticResidual(combined, [1, 0]);
    expect(expectedViolation).toBe(1);
    for (const equation of equations) {
      const violated = evaluateAffineSemanticResidual(equation, [1, 0]);
      const satisfied = evaluateAffineSemanticResidual(equation, [0, 0]);
      expect(violated).toBe(expectedViolation);
      expect(satisfied).toBe(0);
    }
  });

  it("split coefficients and combined coefficient agree at every displacement (test B)", () => {
    const combined: AffineConstraintEquation = {
      sourceId: "combined",
      terms: [{ dof: 0, coefficient: 1 }],
      rightHandSide: 0,
    };
    for (const equation of cancellationPermutations()) {
      for (const ux of [0, 1, -2, 1e-14, -1e14, 1e16 * 3]) {
        expect(evaluateAffineSemanticResidual(equation, [ux, 0])).toBe(
          evaluateAffineSemanticResidual(combined, [ux, 0]),
        );
      }
    }
  });

  it("unconstrained transform ux = q is a transform-column violation for every permutation (test C)", () => {
    const rows = [
      { offset: 0, terms: [{ reducedDof: 0, coefficient: 1 }] },
      { offset: 0, terms: [] },
    ];
    for (const equation of cancellationPermutations()) {
      const violation = findSemanticTransformViolation([equation], rows);
      expect(violation).toBeDefined();
      expect(violation!.kind).toBe("transform-column");
    }
  });

  it("end-to-end canary: every permutation compiles to the effective constraint ux = 0 (test D)", () => {
    for (const equation of cancellationPermutations()) {
      const compiled = compileConstraints(1, [equation]);
      expect(compiled.reducedDofCount).toBe(0);
      expect(compiled.freeDofs).toEqual([]);
      expect(compiled.pivotDofs).toEqual([0]);
      expect(Array.from(compiled.recover([]))).toEqual([0]);
      expect(findSemanticTransformViolation([equation], compiled.rows)).toBeUndefined();
    }
  });

  it("cancellation classification is invariant under finite nonzero row scaling (test E)", () => {
    const combined: AffineConstraintEquation = {
      sourceId: "combined",
      terms: [{ dof: 0, coefficient: 1 }],
      rightHandSide: 0,
    };
    for (const scale of [1, -1, 7, -7, 1e-6, 1e6]) {
      for (const equation of cancellationPermutations()) {
        const scaled: AffineConstraintEquation = {
          sourceId: "scaled",
          terms: equation.terms.map(({ coefficient }) => ({
            dof: 0,
            coefficient: coefficient * scale,
          })),
          rightHandSide: 0,
        };
        for (const ux of [1, 0]) {
          expect(evaluateAffineSemanticResidual(scaled, [ux, 0])).toBe(
            evaluateAffineSemanticResidual(combined, [ux, 0]),
          );
        }
      }
    }
  });
});

describe("benign regression", () => {
  it("ordinary prescribed-displacement and MPC models retain their exact results", () => {
    const model = createModelBuilder()
      .setUnitSystem(units)
      .addNode({ id: "n", coordinates: [0, 0, 0] })
      .addSpring({
        id: "ks",
        startNodeId: "n",
        stiffness: [10, 20, 0, 0, 0, 0],
      })
      .addConstraint({
        id: "e1",
        terms: [
          { nodeId: "n", dof: "ux", coefficient: 1 },
          { nodeId: "n", dof: "uy", coefficient: -1 },
        ],
        rightHandSide: 1,
      })
      .addConstraint({
        id: "e2",
        terms: [{ nodeId: "n", dof: "ux", coefficient: 1 }],
        rightHandSide: 2,
      })
      .addLoadCase({ id: "LC", loads: [] })
      .finalize();
    const result = prepareAnalysis(model).solveCase("LC");
    expect(result.fullDisplacements[0]).toBeCloseTo(2, 14);
    expect(result.fullDisplacements[1]).toBeCloseTo(1, 14);
    expect(result.diagnostics.status).toBe("pass");
  });
});

// a0 = 1, a_i = 1e-16 for 1..N, a_{N+1} = -1, rhs = 0. Against a unit
// displacement the exact numerator is N * 1e-16 and the exact scale is
// 2 + N * 1e-16; naive accumulation absorbs every tiny contribution into
// the leading ones and returns residual 0.
function longRowEquation(count: number, sourceId: string): AffineConstraintEquation {
  const terms: AffineConstraintTerm[] = [
    { dof: 0, coefficient: 1 },
    { dof: count + 1, coefficient: -1 },
  ];
  for (let dof = 1; dof <= count; dof += 1) {
    terms.push({ dof, coefficient: 1e-16 });
  }
  return { sourceId, terms, rightHandSide: 0 };
}

function identityRows(count: number): { offset: 0; terms: [{ reducedDof: 0; coefficient: 1 }] }[] {
  return Array.from({ length: count + 2 }, () => ({
    offset: 0,
    terms: [{ reducedDof: 0, coefficient: 1 }],
  }));
}

describe("compensated long-row accumulation (reviewer Phase 1.2)", () => {
  it("long-row evaluator retains tiny contributions at hand-derived residual (test A)", () => {
    const count = 2000;
    const displacement = Float64Array.from({ length: count + 2 }, () => 1);
    const expectedNumerator = count * 1e-16;
    const expectedNormalized = expectedNumerator / (2 + expectedNumerator);
    const residual = evaluateAffineSemanticResidual(
      longRowEquation(count, "long-row"),
      displacement,
    );
    expect(residual).toBeGreaterThan(SEMANTIC_CONSTRAINT_TOLERANCE);
    expect(residual).not.toBe(0);
    expect(residual).toBeCloseTo(expectedNormalized, 14);
  });

  it("long-row transform column is a violation with reduced DOF 0 (test B)", () => {
    const count = 2000;
    const expectedNumerator = count * 1e-16;
    const expectedNormalized = expectedNumerator / (2 + expectedNumerator);
    const violation = findSemanticTransformViolation(
      [longRowEquation(count, "long-row")],
      identityRows(count),
    );
    expect(violation).toBeDefined();
    expect(violation!.sourceId).toBe("long-row");
    expect(violation!.kind).toBe("transform-column");
    expect(violation!.reducedDof).toBe(0);
    expect(violation!.normalizedResidual).toBeGreaterThan(SEMANTIC_CONSTRAINT_TOLERANCE);
    expect(violation!.normalizedResidual).not.toBe(0);
    expect(violation!.normalizedResidual).toBeCloseTo(expectedNormalized, 14);
  });

  it("3003-DOF compiler canary compiles to full rank and recovers zero (test C)", () => {
    // u_i = u_master for i = 0..N, u_special = 2 * u_master, then the original
    // semantic equation 2*u0 + sum(1e-16 * u_i, i = 1..N) - u_special = 0 pins
    // u_master to zero. The canonicalizer must retain the tiny terms so the
    // compiled transform is full rank, recovers exactly zero, and satisfies
    // every original equation within the frozen semantic tolerance.
    const count = 3000;
    const masterDof = count + 2;
    const specialDof = count + 1;
    const fullDofCount = count + 3;
    const equations: AffineConstraintEquation[] = [];
    for (let dof = 0; dof <= count; dof += 1) {
      equations.push({
        sourceId: `eq${String(dof).padStart(4, "0")}`,
        terms: [
          { dof, coefficient: 1 },
          { dof: masterDof, coefficient: -1 },
        ],
        rightHandSide: 0,
      });
    }
    equations.push({
      sourceId: "eq-special",
      terms: [
        { dof: specialDof, coefficient: 1 },
        { dof: masterDof, coefficient: -2 },
      ],
      rightHandSide: 0,
    });
    const semanticTerms: AffineConstraintTerm[] = [
      { dof: 0, coefficient: 2 },
      { dof: specialDof, coefficient: -1 },
    ];
    for (let dof = 1; dof <= count; dof += 1) {
      semanticTerms.push({ dof, coefficient: 1e-16 });
    }
    equations.push({
      sourceId: "z-semantic",
      terms: semanticTerms,
      rightHandSide: 0,
    });
    expect(equations).toHaveLength(fullDofCount);
    const compiled = compileConstraints(fullDofCount, equations);
    expect(compiled.reducedDofCount).toBe(0);
    expect(compiled.freeDofs).toEqual([]);
    expect(compiled.pivotDofs).toHaveLength(fullDofCount);
    expect([...compiled.pivotDofs].toSorted((a, b) => a - b)).toEqual(
      Array.from({ length: fullDofCount }, (_, index) => index),
    );
    expect(Array.from(compiled.recover([])).every((value) => value === 0)).toBe(true);
    expect(findSemanticTransformViolation(equations, compiled.rows)).toBeUndefined();
  }, 30_000);

  it("compensated accumulation retains tiny scale contributions (test D)", () => {
    const count = 2000;
    // Constant check with every offset at 1: exact numerator N * 1e-16, exact
    // scale 2 + N * 1e-16. Both fields surface in the violation and must carry
    // the absorbed tiny contributions, not just the signed numerator.
    const equation = longRowEquation(count, "long-row");
    const constantRows = Array.from({ length: count + 2 }, () => ({
      offset: 1,
      terms: [],
    }));
    const expectedNumerator = count * 1e-16;
    const expectedScale = 2 + expectedNumerator;
    const violation = findSemanticTransformViolation([equation], constantRows);
    expect(violation).toBeDefined();
    expect(violation!.kind).toBe("constant");
    expect(violation!.numerator).toBeCloseTo(expectedNumerator, 15);
    expect(violation!.scale).toBeCloseTo(expectedScale, 15);
    expect(violation!.normalizedResidual).toBeGreaterThan(SEMANTIC_CONSTRAINT_TOLERANCE);
    expect(violation!.normalizedResidual).toBeCloseTo(expectedNumerator / expectedScale, 14);
    // All-displacement-two variant: exact numerator 2 * N * 1e-16, exact scale
    // 4 + 2 * N * 1e-16, so the compensated scale retains the absolute
    // contributions as well as the signed ones.
    const twos = Float64Array.from({ length: count + 2 }, () => 2);
    const expectedTwos = (2 * count * 1e-16) / (4 + 2 * count * 1e-16);
    const residual = evaluateAffineSemanticResidual(equation, twos);
    expect(residual).toBeGreaterThan(SEMANTIC_CONSTRAINT_TOLERANCE);
    expect(residual).toBeCloseTo(expectedTwos, 14);
  });
});
