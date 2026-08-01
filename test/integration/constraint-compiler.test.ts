import { describe, expect, it, vi } from "vitest";
import { compileConstraints } from "../../src/constraints/compile-constraints.js";
import { recoverConstrainedState } from "../../src/constraints/recover-constrained-state.js";
import { buildLocalAxes } from "../../src/geometry/local-axes.js";
import { prepareAnalysis } from "../../src/analysis/prepare-analysis.js";

describe("constraint compiler", () => {
  it("FR-CON-003: compiles prescribed and equal-DOF equations to a sparse affine map", () => {
    const compiled = compileConstraints(4, [
      { sourceId: "fix", terms: [{ dof: 0, coefficient: 1 }], rightHandSide: 2 },
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
    expect(compiled.rows[1]).toEqual({ offset: -3, terms: [{ reducedDof: 0, coefficient: 1 }] });
    expect(compiled.transformNonzeroCount).toBe(3);
  });

  it("FR-CON-003: deterministic output ignores equation insertion order", () => {
    const equations = [
      { sourceId: "b", terms: [{ dof: 2, coefficient: 1 }], rightHandSide: 4 },
      { sourceId: "a", terms: [{ dof: 0, coefficient: 1 }], rightHandSide: 1 },
    ] as const;
    const forward = compileConstraints(3, equations);
    const reverse = compileConstraints(3, equations.toReversed());
    expect(forward.rows).toEqual(reverse.rows);
    expect(forward.freeDofs).toEqual(reverse.freeDofs);
  });

  it("FR-SAFE-010: constraint source ordering uses ECMAScript code units without host collation", () => {
    const localeCompare = vi.spyOn(String.prototype, "localeCompare").mockImplementation(() => {
      throw new Error("localeCompare used");
    });
    try {
      const compiled = compileConstraints(1, [
        { sourceId: "ä", terms: [{ dof: 0, coefficient: 1 }], rightHandSide: 0 },
        { sourceId: "z", terms: [{ dof: 0, coefficient: 1 }], rightHandSide: 0 },
      ]);
      expect(compiled.equations.map(({ sourceId }) => sourceId)).toEqual(["z"]);
      expect(compiled.redundantSourceIds).toEqual(["ä"]);
    } finally {
      localeCompare.mockRestore();
    }
  });

  it("FR-CON-004: recovers full displacement and source-traced constraint forces", () => {
    const compiled = compileConstraints(2, [
      { sourceId: "support", terms: [{ dof: 0, coefficient: 1 }], rightHandSide: 0 },
    ]);
    const recovered = recoverConstrainedState(compiled, [3], [-10, 0]);
    expect(Array.from(recovered.fullDisplacements)).toEqual([0, 3]);
    expect(Array.from(recovered.dofReactions)).toEqual([-10, 0]);
    expect(recovered.constraintForces).toEqual([
      { sourceId: "support", multiplier: 10, dofForces: [{ dof: 0, force: 10 }] },
    ]);
  });
});

it("FR-CON-001/FR-MOD-005: expands a rigid diaphragm atomically into affine equations", () => {
  const { createModelBuilder } = requireModelBuilder();
  const builder = createModelBuilder()
    .addNode({ id: "m", coordinates: [0, 0, 0] })
    .addNode({ id: "s", coordinates: [2, 3, 0] })
    .addRigidDiaphragm({ id: "d", plane: "xy", masterNodeId: "m", slaveNodeIds: ["s"] });
  expect(builder.snapshot().constraints).toEqual([
    {
      id: "d:s:tx",
      terms: [
        { nodeId: "s", dof: "tx", coefficient: 1 },
        { nodeId: "m", dof: "tx", coefficient: -1 },
        { nodeId: "m", dof: "rz", coefficient: 3 },
      ],
      rightHandSide: 0,
    },
    {
      id: "d:s:ty",
      terms: [
        { nodeId: "s", dof: "ty", coefficient: 1 },
        { nodeId: "m", dof: "ty", coefficient: -1 },
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

it("FR-CON-003/NFR-COR-001: two oblique restraints preserve the exact free-axis stiffness", () => {
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
    .addTruss({ id: "t", startNodeId: "a", endNodeId: "b", materialId: "m", sectionId: "s" });
  for (const dof of ["tx", "ty", "tz"] as const) {
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
      terms: (["tx", "ty", "tz"] as const).map((dof, index) => ({
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
