import { describe, expect, it } from "vitest";
import { prepareAnalysis } from "../../src/analysis/prepare-analysis.js";
import type { ModelBuilder } from "../../src/model/model-builder.js";
import { createModelBuilder } from "../../src/model/model-builder.js";

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
const allDofs = ["tx", "ty", "tz", "rx", "ry", "rz"] as const;

function constrain(builder: ModelBuilder, nodeId: string, dofs: readonly (typeof allDofs)[number][], values?: readonly number[]): void {
  for (const [index, dof] of dofs.entries()) {
    builder.addConstraint({ id: `${nodeId}:${dof}`, terms: [{ nodeId, dof, coefficient: 1 }], rightHandSide: values?.[index] ?? 0 });
  }
}

function frameBuilder(length: number, elasticModulus: number, inertiaY: number, inertiaZ: number): ModelBuilder {
  return createModelBuilder()
    .setUnitSystem(units)
    .addNode({ id: "a", coordinates: [0, 0, 0] })
    .addNode({ id: "b", coordinates: [length, 0, 0] })
    .addMaterial({ id: "m", elasticModulus, poissonRatio: 0.3 })
    .addFrameSection({ id: "s", area: 0.02, torsionalConstant: 2e-5, momentOfInertiaY: inertiaY, momentOfInertiaZ: inertiaZ })
    .addFrame({ id: "f", startNodeId: "a", endNodeId: "b", materialId: "m", sectionId: "s", theory: { kind: "euler-bernoulli" }, orientation: [0, 1, 0] });
}

describe("extended analytical verification", () => {
  it("VER-ANA-007: simply supported beam center deflection matches PL^3/(48EI)", () => {
    const length = 8;
    const elasticModulus = 200e9;
    const inertia = 6e-5;
    const load = -24000;
    const builder = createModelBuilder()
      .setUnitSystem(units)
      .addNode({ id: "a", coordinates: [0, 0, 0] })
      .addNode({ id: "m", coordinates: [length / 2, 0, 0] })
      .addNode({ id: "b", coordinates: [length, 0, 0] })
      .addMaterial({ id: "mat", elasticModulus, poissonRatio: 0.3 })
      .addFrameSection({ id: "sec", area: 0.02, torsionalConstant: 2e-5, momentOfInertiaY: inertia, momentOfInertiaZ: inertia })
      .addFrame({ id: "left", startNodeId: "a", endNodeId: "m", materialId: "mat", sectionId: "sec", theory: { kind: "euler-bernoulli" }, orientation: [0, 1, 0] })
      .addFrame({ id: "right", startNodeId: "m", endNodeId: "b", materialId: "mat", sectionId: "sec", theory: { kind: "euler-bernoulli" }, orientation: [0, 1, 0] });
    constrain(builder, "a", ["tx", "ty", "tz", "rx"]);
    constrain(builder, "b", ["ty", "tz"]);
    const result = prepareAnalysis(builder.addLoadCase({ id: "P", loads: [{ kind: "nodal", nodeId: "m", force: [0, load, 0] }] }).finalize()).solveCase("P");
    const mid = result.nodes.find(({ id }) => id === "m")!;
    expect(mid.displacements.find(({ dof }) => dof === "ty")!.value).toBeCloseTo((load * length ** 3) / (48 * elasticModulus * inertia), 12);
    const reactions = result.nodes.filter(({ id }) => id !== "m").map((node) => node.reactions.find(({ dof }) => dof === "ty")?.value ?? 0);
    expect(reactions[0]).toBeCloseTo(-load / 2, 8);
    expect(reactions[1]).toBeCloseTo(-load / 2, 8);
  });

  it("VER-ANA-008: prescribed axial displacement produces EAΔ/L and no spurious transverse action", () => {
    const length = 3;
    const elasticModulus = 210e9;
    const area = 0.004;
    const delta = 0.002;
    const builder = createModelBuilder()
      .setUnitSystem(units)
      .addNode({ id: "a", coordinates: [0, 0, 0] })
      .addNode({ id: "b", coordinates: [length, 0, 0] })
      .addMaterial({ id: "m", elasticModulus, poissonRatio: 0.3 })
      .addTrussSection({ id: "s", area })
      .addTruss({ id: "t", startNodeId: "a", endNodeId: "b", materialId: "m", sectionId: "s" });
    constrain(builder, "a", ["tx", "ty", "tz"]);
    constrain(builder, "b", ["ty", "tz", "tx"], [0, 0, delta]);
    const result = prepareAnalysis(builder.addLoadCase({ id: "D" }).finalize()).solveCase("D");
    const force = (elasticModulus * area * delta) / length;
    expect(result.trusses[0]!.axialForce).toBeCloseTo(force, 8);
    expect(result.nodes.find(({ id }) => id === "a")!.reactions.find(({ dof }) => dof === "tx")!.value).toBeCloseTo(-force, 8);
    expect(result.nodes.find(({ id }) => id === "b")!.reactions.find(({ dof }) => dof === "tx")!.value).toBeCloseTo(force, 8);
  });

  it("VER-ANA-009: interior point moment matches exact cantilever tip displacement and rotation", () => {
    const length = 5;
    const position = 2;
    const elasticModulus = 205e9;
    const inertia = 7e-5;
    const moment = 18000;
    const builder = frameBuilder(length, elasticModulus, inertia, inertia);
    constrain(builder, "a", allDofs);
    const result = prepareAnalysis(builder.addLoadCase({ id: "M", loads: [{ kind: "member-point-moment", frameId: "f", coordinateSystem: "local", distanceFromElasticStart: position, moment: [0, 0, moment] }] }).finalize()).solveCase("M");
    const tip = result.nodes.find(({ id }) => id === "b")!;
    expect(tip.displacements.find(({ dof }) => dof === "ty")!.value).toBeCloseTo((moment * position * (2 * length - position)) / (2 * elasticModulus * inertia), 12);
    expect(tip.displacements.find(({ dof }) => dof === "rz")!.value).toBeCloseTo((moment * position) / (elasticModulus * inertia), 12);
    expect(result.frames[0]!.localEndForces[5]).toBeCloseTo(-moment, 8);
  });

  it("VER-ANA-010: partial triangular load reactions equal independent resultant and centroid moment", () => {
    const length = 6;
    const start = 1;
    const end = 5;
    const peak = -12;
    const builder = frameBuilder(length, 200e9, 5e-5, 5e-5);
    constrain(builder, "a", allDofs);
    const result = prepareAnalysis(builder.addLoadCase({ id: "w", loads: [{ kind: "member-distributed", frameId: "f", coordinateSystem: "local", startDistanceFromElasticStart: start, endDistanceFromElasticStart: end, startIntensity: [0, 0, 0], endIntensity: [0, peak, 0] }] }).finalize()).solveCase("w");
    const resultant = 0.5 * (end - start) * peak;
    const centroid = start + (2 * (end - start)) / 3;
    const base = result.nodes.find(({ id }) => id === "a")!;
    expect(base.reactions.find(({ dof }) => dof === "ty")!.value).toBeCloseTo(-resultant, 9);
    expect(base.reactions.find(({ dof }) => dof === "rz")!.value).toBeCloseTo(-resultant * centroid, 8);
  });
});
