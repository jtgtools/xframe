import { describe, expect, it } from "vitest";
import { prepareAnalysis } from "../../src/analysis/prepare-analysis.js";
import type { ModelBuilder } from "../../src/model/model-builder.js";
import { createModelBuilder } from "../../src/model/model-builder.js";
import { combineResults } from "../../src/results/combine-results.js";

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
const dofs = ["tx", "ty", "tz", "rx", "ry", "rz"] as const;

function fix(
  builder: ModelBuilder,
  nodeId: string,
  selected: readonly (typeof dofs)[number][],
): void {
  for (const dof of selected) {
    builder.addConstraint({
      id: `${nodeId}:${dof}`,
      terms: [{ nodeId, dof, coefficient: 1 }],
      rightHandSide: 0,
    });
  }
}

function cantilever(
  options: {
    readonly origin?: readonly [number, number, number];
    readonly elasticModulus?: number;
  } = {},
) {
  const origin = options.origin ?? [0, 0, 0];
  const length = 4;
  const builder = createModelBuilder()
    .setUnitSystem(units)
    .addNode({ id: "a", coordinates: origin })
    .addNode({ id: "b", coordinates: [origin[0] + length, origin[1], origin[2]] })
    .addMaterial({ id: "m", elasticModulus: options.elasticModulus ?? 200e9, poissonRatio: 0.3 })
    .addFrameSection({
      id: "s",
      area: 0.02,
      torsionalConstant: 1e-5,
      momentOfInertiaY: 3e-5,
      momentOfInertiaZ: 4e-5,
    })
    .addFrame({
      id: "f",
      startNodeId: "a",
      endNodeId: "b",
      materialId: "m",
      sectionId: "s",
      theory: { kind: "euler-bernoulli" },
      orientation: [0, 1, 0],
    });
  fix(builder, "a", dofs);
  builder
    .addLoadCase({
      id: "P",
      loads: [{ kind: "nodal", nodeId: "b", force: [1200, -3500, 2700], moment: [300, -500, 800] }],
    })
    .addLoadCase({
      id: "2P",
      loads: [
        { kind: "nodal", nodeId: "b", force: [2400, -7000, 5400], moment: [600, -1000, 1600] },
      ],
    })
    .addLoadCase({ id: "Fy", loads: [{ kind: "nodal", nodeId: "b", force: [0, 1, 0] }] })
    .addLoadCase({ id: "Mz", loads: [{ kind: "nodal", nodeId: "b", moment: [0, 0, 1] }] })
    .addLoadCase({
      id: "FyMz",
      loads: [{ kind: "nodal", nodeId: "b", force: [0, 1, 0], moment: [0, 0, 1] }],
    });
  return builder.finalize();
}

function expectScaled(
  actual: readonly number[],
  base: readonly number[],
  scale: number,
  digits = 10,
): void {
  expect(actual).toHaveLength(base.length);
  for (let index = 0; index < base.length; index += 1)
    expect(actual[index]).toBeCloseTo(scale * base[index]!, digits);
}

function axialTruss(axis: "x" | "y", reversed = false) {
  const end = axis === "x" ? ([3, 0, 0] as const) : ([0, 3, 0] as const);
  const builder = createModelBuilder()
    .setUnitSystem(units)
    .addNode({ id: "a", coordinates: [0, 0, 0] })
    .addNode({ id: "b", coordinates: end })
    .addMaterial({ id: "m", elasticModulus: 210e9, poissonRatio: 0.3 })
    .addTrussSection({ id: "s", area: 0.003 })
    .addTruss({
      id: "t",
      startNodeId: reversed ? "b" : "a",
      endNodeId: reversed ? "a" : "b",
      materialId: "m",
      sectionId: "s",
    });
  fix(builder, "a", ["tx", "ty", "tz"]);
  fix(builder, "b", axis === "x" ? ["ty", "tz"] : ["tx", "tz"]);
  builder.addLoadCase({
    id: "P",
    loads: [{ kind: "nodal", nodeId: "b", force: axis === "x" ? [12000, 0, 0] : [0, 12000, 0] }],
  });
  return builder.finalize();
}

describe("metamorphic structural properties", () => {
  it("NFR-COR-001: rigid translation of all coordinates leaves structural response unchanged", () => {
    const base = prepareAnalysis(cantilever()).solveCase("P");
    const moved = prepareAnalysis(cantilever({ origin: [1e6, -2e6, 3e6] })).solveCase("P");
    expect(moved.fullDisplacements).toHaveLength(base.fullDisplacements.length);
    expectScaled(moved.fullDisplacements, base.fullDisplacements, 1, 11);
    expectScaled(moved.frames[0]!.localEndForces, base.frames[0]!.localEndForces, 1, 7);
  });

  it("NFR-COR-001: rotating an axial truss and load rotates displacement without changing axial force", () => {
    const x = prepareAnalysis(axialTruss("x")).solveCase("P");
    const y = prepareAnalysis(axialTruss("y")).solveCase("P");
    expect(x.nodes[1]!.displacements.find(({ dof }) => dof === "tx")!.value).toBeCloseTo(
      y.nodes[1]!.displacements.find(({ dof }) => dof === "ty")!.value,
      14,
    );
    expect(x.trusses[0]!.axialForce).toBeCloseTo(y.trusses[0]!.axialForce, 10);
  });

  it("NFR-DET-001: reversing truss connectivity preserves the physical solution", () => {
    const forward = prepareAnalysis(axialTruss("x")).solveCase("P");
    const reverse = prepareAnalysis(axialTruss("x", true)).solveCase("P");
    expectScaled(reverse.fullDisplacements, forward.fullDisplacements, 1, 14);
    expect(reverse.trusses[0]!.axialForce).toBeCloseTo(forward.trusses[0]!.axialForce, 10);
  });

  it("NFR-COR-001: response scales linearly with load", () => {
    const prepared = prepareAnalysis(cantilever());
    const base = prepared.solveCase("P");
    const doubled = prepared.solveCase("2P");
    expect(doubled.fullDisplacements).toHaveLength(base.fullDisplacements.length);
    expectScaled(doubled.fullDisplacements, base.fullDisplacements, 2, 10);
    expectScaled(doubled.frames[0]!.localEndForces, base.frames[0]!.localEndForces, 2, 7);
  });

  it("NFR-COR-001: doubling all elastic moduli halves displacement and preserves reactions", () => {
    const base = prepareAnalysis(cantilever()).solveCase("P");
    const stiff = prepareAnalysis(cantilever({ elasticModulus: 400e9 })).solveCase("P");
    expect(stiff.fullDisplacements).toHaveLength(base.fullDisplacements.length);
    expectScaled(stiff.fullDisplacements, base.fullDisplacements, 0.5, 10);
    expectScaled(stiff.fullResidual, base.fullResidual, 1, 6);
  });

  it("NFR-COR-001: axial subdivision is equivalent to one unsplit member", () => {
    const single = prepareAnalysis(axialTruss("x")).solveCase("P");
    const builder = createModelBuilder()
      .setUnitSystem(units)
      .addNode({ id: "a", coordinates: [0, 0, 0] })
      .addNode({ id: "m", coordinates: [1.5, 0, 0] })
      .addNode({ id: "b", coordinates: [3, 0, 0] })
      .addMaterial({ id: "mat", elasticModulus: 210e9, poissonRatio: 0.3 })
      .addTrussSection({ id: "sec", area: 0.003 })
      .addTruss({ id: "t1", startNodeId: "a", endNodeId: "m", materialId: "mat", sectionId: "sec" })
      .addTruss({
        id: "t2",
        startNodeId: "m",
        endNodeId: "b",
        materialId: "mat",
        sectionId: "sec",
      });
    fix(builder, "a", ["tx", "ty", "tz"]);
    fix(builder, "m", ["ty", "tz"]);
    fix(builder, "b", ["ty", "tz"]);
    const split = prepareAnalysis(
      builder
        .addLoadCase({ id: "P", loads: [{ kind: "nodal", nodeId: "b", force: [12000, 0, 0] }] })
        .finalize(),
    ).solveCase("P");
    expect(split.nodes.find(({ id }) => id === "b")!.displacements[0]!.value).toBeCloseTo(
      single.nodes.find(({ id }) => id === "b")!.displacements[0]!.value,
      14,
    );
    expect(split.trusses[0]!.axialForce).toBeCloseTo(12000, 10);
    expect(split.trusses[1]!.axialForce).toBeCloseTo(12000, 10);
  });

  it("NFR-COR-001: Maxwell-Betti reciprocity holds for force and moment load cases", () => {
    const prepared = prepareAnalysis(cantilever());
    const force = prepared.solveCase("Fy");
    const moment = prepared.solveCase("Mz");
    const rotationFromForce = force.nodes[1]!.displacements.find(({ dof }) => dof === "rz")!.value;
    const displacementFromMoment = moment.nodes[1]!.displacements.find(
      ({ dof }) => dof === "ty",
    )!.value;
    expect(rotationFromForce).toBeCloseTo(displacementFromMoment, 13);
  });

  it("NFR-COR-001: direct superposition equals both a combined load case and result combination", () => {
    const prepared = prepareAnalysis(cantilever());
    const force = prepared.solveCase("Fy");
    const moment = prepared.solveCase("Mz");
    const direct = prepared.solveCase("FyMz");
    const combined = combineResults("superposed", [
      { result: force, factor: 1 },
      { result: moment, factor: 1 },
    ]);
    expect(direct.fullDisplacements).toHaveLength(combined.fullDisplacements.length);
    expectScaled(direct.fullDisplacements, combined.fullDisplacements, 1, 13);
    expectScaled(direct.frames[0]!.localEndForces, combined.frames[0]!.localEndForces, 1, 9);
  });

  it("NFR-COR-001: solved cases satisfy equilibrium and energy identities", () => {
    const result = prepareAnalysis(cantilever()).solveCase("P");
    expect(result.diagnostics.normalizedResidual).toBeLessThan(1e-12);
    expect(result.diagnostics.normalizedForceEquilibrium).toBeLessThan(1e-12);
    expect(result.diagnostics.normalizedMomentEquilibrium).toBeLessThan(1e-12);
    expect(result.diagnostics.relativeEnergyError).toBeLessThan(1e-12);
  });
});
