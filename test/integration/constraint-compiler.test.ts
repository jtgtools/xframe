import { describe, expect, it, vi } from "vitest";
import { compileConstraints } from "../../src/constraints/compile-constraints.js";
import { recoverConstrainedState } from "../../src/constraints/recover-constrained-state.js";
import { findSemanticTransformViolation } from "../../src/constraints/semantic-constraint-validation.js";
import { XFrameError } from "../../src/errors/xframe-error.js";
import { buildLocalAxes } from "../../src/geometry/local-axes.js";
import { prepareAnalysis } from "../../src/analysis/prepare-analysis.js";

function inputFailure(action: () => unknown): XFrameError {
  try {
    action();
  } catch (error) {
    if (error instanceof XFrameError) return error;
    throw error;
  }
  throw new Error("Expected an input error.");
}

describe("constraint compiler", () => {
  it("compiles prescribed and equal-DOF equations to a sparse affine map", () => {
    const compiled = compileConstraints(4, [
      {
        sourceId: "fix",
        terms: [{ dof: 0, coefficient: 1 }],
        rightHandSide: 2,
      },
      {
        sourceId: "equal",
        terms: [
          { dof: 2, coefficient: 1 },
          { dof: 1, coefficient: -1 },
        ],
        rightHandSide: 3,
      },
    ]);
    expect(compiled.reducedDofCount).toBe(2);
    expect(compiled.freeDofs).toEqual([2, 3]);
    expect(Array.from(compiled.recover([5, 7]))).toEqual([2, 2, 5, 7]);
    expect(compiled.rows[0]).toEqual({ offset: 2, terms: [] });
    expect(compiled.rows[1]).toEqual({
      offset: -3,
      terms: [{ reducedDof: 0, coefficient: 1 }],
    });
    expect(compiled.transformNonzeroCount).toBe(3);
  });

  it("deterministic output ignores equation insertion order", () => {
    const equations = [
      { sourceId: "b", terms: [{ dof: 2, coefficient: 1 }], rightHandSide: 4 },
      { sourceId: "a", terms: [{ dof: 0, coefficient: 1 }], rightHandSide: 1 },
    ] as const;
    const forward = compileConstraints(3, equations);
    const reverse = compileConstraints(3, equations.toReversed());
    expect(forward.rows).toEqual(reverse.rows);
    expect(forward.freeDofs).toEqual(reverse.freeDofs);
  });

  it("constraint source ordering uses ECMAScript code units without host collation", () => {
    const localeCompare = vi.spyOn(String.prototype, "localeCompare").mockImplementation(() => {
      throw new Error("localeCompare used");
    });
    try {
      const compiled = compileConstraints(1, [
        {
          sourceId: "ä",
          terms: [{ dof: 0, coefficient: 1 }],
          rightHandSide: 0,
        },
        {
          sourceId: "z",
          terms: [{ dof: 0, coefficient: 1 }],
          rightHandSide: 0,
        },
      ]);
      expect(compiled.equations.map(({ sourceId }) => sourceId)).toEqual(["z"]);
      expect(compiled.redundantSourceIds).toEqual(["ä"]);
    } finally {
      localeCompare.mockRestore();
    }
  });

  it.each([1e-300, -1e-300, 1e-120, -1e-120, 1, -1, 1e120, -1e120, 1e300, -1e300])(
    "preserves compiled pivot/free topology and kinematics at scale %s",
    (scale) => {
      const compiled = compileConstraints(2, [
        {
          sourceId: "scaled-fix",
          terms: [{ dof: 0, coefficient: scale }],
          rightHandSide: 2 * scale,
        },
      ]);
      expect(compiled.pivotDofs).toEqual([0]);
      expect(compiled.freeDofs).toEqual([1]);
      expect(compiled.rows).toEqual([
        { offset: 2, terms: [] },
        { offset: 0, terms: [{ reducedDof: 0, coefficient: 1 }] },
      ]);
      expect(Array.from(compiled.recover([7]))).toEqual([2, 7]);
    },
  );

  it("recovers full displacement and source-traced constraint forces", () => {
    const compiled = compileConstraints(2, [
      {
        sourceId: "support",
        terms: [{ dof: 0, coefficient: 1 }],
        rightHandSide: 0,
      },
    ]);
    const recovered = recoverConstrainedState(compiled, [3], [-10, 0]);
    expect(Array.from(recovered.fullDisplacements)).toEqual([0, 3]);
    expect(Array.from(recovered.dofReactions)).toEqual([-10, 0]);
    expect(recovered.constraintForces).toEqual([
      {
        sourceId: "support",
        multiplier: 10,
        dofForces: [{ dof: 0, force: 10 }],
      },
    ]);
  });

  it("rejects dense constraint-force recovery that exceeds the Gram storage limit", () => {
    const coupled = compileConstraints(3, [
      {
        sourceId: "a",
        terms: [
          { dof: 0, coefficient: 1 },
          { dof: 1, coefficient: 1 },
        ],
        rightHandSide: 0,
      },
      {
        sourceId: "b",
        terms: [
          { dof: 1, coefficient: 1 },
          { dof: 2, coefficient: 1 },
        ],
        rightHandSide: 0,
      },
    ]);
    expect(() =>
      recoverConstrainedState(coupled, [7], [-1, -2, -3], { maximumGramEntries: 3 }),
    ).toThrowError(XFrameError);
    expect(
      inputFailure(() =>
        recoverConstrainedState(coupled, [7], [-1, -2, -3], { maximumGramEntries: 3 }),
      ).code,
    ).toBe("MEMORY_LIMIT_EXCEEDED");
  });

  it("recovers coupled constraint reactions and rejects incompatible recovery vectors", () => {
    const coupled = compileConstraints(3, [
      {
        sourceId: "a",
        terms: [
          { dof: 0, coefficient: 1 },
          { dof: 1, coefficient: 1 },
        ],
        rightHandSide: 0,
      },
      {
        sourceId: "b",
        terms: [
          { dof: 1, coefficient: 1 },
          { dof: 2, coefficient: 1 },
        ],
        rightHandSide: 0,
      },
    ]);
    const recovered = recoverConstrainedState(coupled, [7], [-1, -2, -3]);
    expect(Array.from(recovered.fullDisplacements)).toEqual([7, -7, 7]);
    expect(
      recovered.constraintForces.map(({ sourceId, dofForces }) => ({
        sourceId,
        dofs: dofForces.map(({ dof }) => dof),
      })),
    ).toEqual([
      { sourceId: "a", dofs: [0, 1] },
      { sourceId: "b", dofs: [1, 2] },
    ]);
    expect(recovered.constraintForces[0]!.multiplier).toBeCloseTo(1 / 3, 14);
    expect(recovered.constraintForces[1]!.multiplier).toBeCloseTo(7 / 3, 14);
    for (const force of recovered.constraintForces[0]!.dofForces)
      expect(force.force).toBeCloseTo(1 / 3, 14);
    for (const force of recovered.constraintForces[1]!.dofForces)
      expect(force.force).toBeCloseTo(7 / 3, 14);

    expect(inputFailure(() => recoverConstrainedState(coupled, [7], [-1, -2]))).toMatchObject({
      code: "INPUT_INVALID",
      context: {
        kind: "input",
        path: "fullResidual",
        expected: "array-like of length 3",
        actual: "length 2",
      },
    });
    expect(inputFailure(() => recoverConstrainedState(coupled, [], [-1, -2, -3]))).toMatchObject({
      code: "INPUT_INVALID",
      context: {
        kind: "input",
        path: "reducedDisplacements",
        expected: "array-like of length 1",
        actual: "length 0",
      },
    });

    const unconstrained = recoverConstrainedState(compileConstraints(2, []), [4, 5], [-3, 2]);
    expect(Array.from(unconstrained.fullDisplacements)).toEqual([4, 5]);
    expect(unconstrained.constraintForces).toEqual([]);
  });

  it("preserves compiled topology and recovery across exact subnormal scaling", () => {
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

    const baseCompiled = compileConstraints(3, [base]);
    const scaledCompiled = compileConstraints(3, [scaled]);
    expect(scaledCompiled.pivotDofs).toEqual(baseCompiled.pivotDofs);
    expect(scaledCompiled.freeDofs).toEqual(baseCompiled.freeDofs);
    expect(Array.from(scaledCompiled.recover([7, 11]))).toEqual(
      Array.from(baseCompiled.recover([7, 11])),
    );
  });

  it("metamorphic: transform is invariant under source-ID rename, equation/term order, and row scale", () => {
    const base = [
      {
        sourceId: "a",
        terms: [
          { dof: 0, coefficient: 1 },
          { dof: 1, coefficient: 2 },
          { dof: 3, coefficient: -1 },
        ],
        rightHandSide: 3,
      },
      {
        sourceId: "b",
        terms: [
          { dof: 1, coefficient: 1 },
          { dof: 2, coefficient: -1 },
        ],
        rightHandSide: -1,
      },
      {
        sourceId: "c",
        terms: [
          { dof: 2, coefficient: 1 },
          { dof: 3, coefficient: 1 },
        ],
        rightHandSide: 4,
      },
      {
        sourceId: "redundant",
        terms: [
          { dof: 0, coefficient: 2 },
          { dof: 1, coefficient: 4 },
          { dof: 3, coefficient: -2 },
        ],
        rightHandSide: 6,
      },
    ] as const;
    const transformRows = ({
      ids,
      reverseEquations = false,
      reverseTerms = false,
      scales = [1, 1, 1, 1],
    }: {
      ids?: readonly string[];
      reverseEquations?: boolean;
      reverseTerms?: boolean;
      scales?: readonly number[];
    }) => {
      let rows = base.map((equation, index) => ({
        sourceId: ids?.[index] ?? equation.sourceId,
        terms: equation.terms.map((term) => ({
          ...term,
          coefficient: term.coefficient * scales[index]!,
        })),
        rightHandSide: equation.rightHandSide * scales[index]!,
      }));
      if (reverseTerms)
        rows = rows.map((row) => ({
          ...row,
          terms: [...row.terms].toReversed(),
        }));
      if (reverseEquations) rows = rows.toReversed();
      return rows;
    };
    const variants = [
      ["reference", transformRows({})],
      ["renamed", transformRows({ ids: ["zz", "aa", "mm", "rr"] })],
      ["reversed", transformRows({ reverseEquations: true })],
      ["terms-reversed", transformRows({ reverseTerms: true })],
      ["scaled", transformRows({ scales: [-7, 1e120, -1e-120, 3] })],
      [
        "combined",
        transformRows({
          ids: ["k9", "k1", "k5", "k0"],
          reverseEquations: true,
          reverseTerms: true,
          scales: [-7, 1e120, -1e-120, 3],
        }),
      ],
    ] as const;
    const compiled: Array<
      [string, ReturnType<typeof transformRows>, ReturnType<typeof compileConstraints>]
    > = variants.map(([name, equations]) => [name, equations, compileConstraints(4, equations)]);
    const reference = compiled[0]![2]!;
    for (const [, equations, candidate] of compiled) {
      expect(candidate.reducedDofCount).toBe(reference.reducedDofCount);
      expect(candidate.pivotDofs).toEqual(reference.pivotDofs);
      expect(candidate.freeDofs).toEqual(reference.freeDofs);
      for (const q of [-3, 0, 2.5]) {
        const actual = Array.from(candidate.recover([q]));
        const expected = Array.from(reference.recover([q]));
        for (let index = 0; index < actual.length; index += 1)
          expect(actual[index]!).toBeCloseTo(expected[index]!, 11);
      }
      expect(findSemanticTransformViolation(equations, candidate.rows)).toBeUndefined();
    }
  });

  it("affine back substitution: triangular nonzero-RHS system with one free DOF recovers u = Tq + c", () => {
    const compiled = compileConstraints(4, [
      {
        sourceId: "a",
        terms: [
          { dof: 0, coefficient: 1 },
          { dof: 1, coefficient: -1 },
          { dof: 2, coefficient: 2 },
        ],
        rightHandSide: 1,
      },
      {
        sourceId: "b",
        terms: [
          { dof: 1, coefficient: 1 },
          { dof: 2, coefficient: 1 },
        ],
        rightHandSide: 2,
      },
      {
        sourceId: "c",
        terms: [
          { dof: 2, coefficient: 1 },
          { dof: 3, coefficient: -1 },
        ],
        rightHandSide: 4,
      },
    ]);
    expect(compiled.reducedDofCount).toBe(1);
    expect(compiled.freeDofs).toEqual([0]);
    for (const q of [-3, 0, 2.5]) {
      const actual = Array.from(compiled.recover([q]));
      expect(actual[0]!).toBeCloseTo(q, 14);
      expect(actual[1]!).toBeCloseTo(1 + q / 3, 14);
      expect(actual[2]!).toBeCloseTo(1 - q / 3, 14);
      expect(actual[3]!).toBeCloseTo(-3 - q / 3, 14);
    }
  });
});

it("expands a rigid diaphragm atomically into affine equations", () => {
  const { createModelBuilder } = requireModelBuilder();
  const builder = createModelBuilder()
    .addNode({ id: "m", coordinates: [0, 0, 0] })
    .addNode({ id: "s", coordinates: [2, 3, 0] })
    .addRigidDiaphragm({
      id: "d",
      plane: "xy",
      masterNodeId: "m",
      slaveNodeIds: ["s"],
    });
  expect(builder.snapshot().constraints).toEqual([
    {
      id: "d:s:ux",
      terms: [
        { nodeId: "s", dof: "ux", coefficient: 1 },
        { nodeId: "m", dof: "ux", coefficient: -1 },
        { nodeId: "m", dof: "rz", coefficient: 3 },
      ],
      rightHandSide: 0,
    },
    {
      id: "d:s:uy",
      terms: [
        { nodeId: "s", dof: "uy", coefficient: 1 },
        { nodeId: "m", dof: "uy", coefficient: -1 },
        { nodeId: "m", dof: "rz", coefficient: -2 },
      ],
      rightHandSide: 0,
    },
  ]);
  const before = JSON.stringify(builder.snapshot());
  expect(() =>
    builder.addRigidDiaphragm({
      id: "bad",
      plane: "xy",
      masterNodeId: "m",
      slaveNodeIds: ["s", "missing"],
    }),
  ).toThrowError(/missing node/u);
  expect(JSON.stringify(builder.snapshot())).toBe(before);
});

function requireModelBuilder(): typeof import("../../src/model/model-builder.js") {
  // Static import behavior without widening every earlier test import.
  return modelBuilderModule;
}

import * as modelBuilderModule from "../../src/model/model-builder.js";

it("two oblique restraints preserve the exact free-axis stiffness", () => {
  const end = [2.3, 3.7, 1.4] as const;
  const length = Math.hypot(...end);
  const direction = end.map((entry) => entry / length);
  const axes = buildLocalAxes([0, 0, 0], end, [0, 0, 1]);
  const elasticModulus = 205e9;
  const area = 0.018;
  const load = 22_000;
  const builder = modelBuilderModule
    .createModelBuilder()
    .setUnitSystem({
      version: "1",
      length: "m",
      force: "N",
      moment: "N*m",
      modulus: "Pa",
      distributedForce: "N/m",
      density: "kg/m^3",
      rotation: "rad",
    })
    .addNode({ id: "a", coordinates: [0, 0, 0] })
    .addNode({ id: "b", coordinates: end })
    .addMaterial({ id: "m", elasticModulus, shearModulus: 79e9 })
    .addTrussSection({ id: "s", area })
    .addTruss({
      id: "t",
      startNodeId: "a",
      endNodeId: "b",
      materialId: "m",
      sectionId: "s",
    });
  for (const dof of ["ux", "uy", "uz"] as const) {
    builder.addConstraint({
      id: `a:${dof}`,
      terms: [{ nodeId: "a", dof, coefficient: 1 }],
      rightHandSide: 0,
    });
  }
  for (const [id, normal] of [
    ["y", axes.y],
    ["z", axes.z],
  ] as const) {
    builder.addConstraint({
      id: `b:${id}`,
      terms: (["ux", "uy", "uz"] as const).map((dof, index) => ({
        nodeId: "b",
        dof,
        coefficient: normal[index]!,
      })),
      rightHandSide: 0,
    });
  }
  const result = prepareAnalysis(
    builder
      .addLoadCase({
        id: "LC",
        loads: [
          {
            kind: "nodal",
            nodeId: "b",
            force: direction.map((entry) => entry * load),
          },
        ],
      })
      .finalize(),
  ).solveCase("LC");
  const node = result.nodes.find(({ id }) => id === "b")!;
  const displacement = node.displacements.reduce(
    (sum, entry, index) => sum + entry.value * direction[index]!,
    0,
  );
  expect(displacement).toBeCloseTo((load * length) / (elasticModulus * area), 13);
  expect(result.trusses[0]!.axialForce).toBeCloseTo(load, 8);
});
