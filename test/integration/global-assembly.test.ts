import { describe, expect, it } from "vitest";
import { assembleStiffness } from "../../src/analysis/assemble-stiffness.js";
import { prepareAnalysis } from "../../src/analysis/prepare-analysis.js";
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

function restrainedTruss() {
  const builder = createModelBuilder()
    .setUnitSystem(units)
    .addNode({ id: "a", coordinates: [0, 0, 0] })
    .addNode({ id: "b", coordinates: [2, 0, 0] })
    .addMaterial({ id: "m", elasticModulus: 1000, shearModulus: 400 })
    .addTrussSection({ id: "s", area: 3 })
    .addTruss({ id: "t", startNodeId: "a", endNodeId: "b", materialId: "m", sectionId: "s" });
  for (const [nodeId, dofs] of [
    ["a", ["ux", "uy", "uz"]],
    ["b", ["uy", "uz"]],
  ] as const) {
    for (const dof of dofs)
      builder.addConstraint({
        id: `fix:${nodeId}:${dof}`,
        terms: [{ nodeId, dof, coefficient: 1 }],
        rightHandSide: 0,
      });
  }
  return builder
    .addLoadCase({ id: "P", loads: [{ kind: "nodal", nodeId: "b", force: [15, 0, 0] }] })
    .finalize();
}

function eccentricTruss() {
  return createModelBuilder()
    .setUnitSystem(units)
    .addNode({ id: "a", coordinates: [0, 0, 0] })
    .addNode({ id: "b", coordinates: [1, 0, 0] })
    .addMaterial({ id: "m", elasticModulus: 1000, shearModulus: 400 })
    .addTrussSection({ id: "s", area: 1 })
    .addTruss({
      id: "t",
      startNodeId: "a",
      endNodeId: "b",
      materialId: "m",
      sectionId: "s",
      rigidOffsets: { start: [0, 1, 0], end: [0, 1, 0] },
    })
    .finalize();
}

describe("global sparse assembly", () => {
  it("reduces a restrained axial truss to the exact EA/L scalar", () => {
    const prepared = prepareAnalysis(restrainedTruss());
    expect(prepared.fullStiffness.size).toBe(6);
    expect(prepared.reducedStiffness.size).toBe(1);
    expect(Array.from(prepared.reducedStiffness.entries())).toEqual([
      { row: 0, column: 0, value: 1500 },
    ]);
  });

  it("reports sparse storage and never exposes a dense global matrix", () => {
    const prepared = prepareAnalysis(restrainedTruss());
    expect(prepared.statistics.fullNonzeros).toBeLessThanOrEqual(21);
    expect(prepared.statistics.skylineStorage).toBe(1);
    expect("denseStiffness" in prepared).toBe(false);
  });

  it("scatters eccentric truss stiffness as the hand-derived sparse B transpose B", () => {
    const assembled = assembleStiffness(eccentricTruss());

    expect(assembled.full.size).toBe(12);
    expect([...assembled.full.entries()]).toEqual([
      { row: 0, column: 0, value: 1000 },
      { row: 5, column: 0, value: -1000 },
      { row: 5, column: 5, value: 1000 },
      { row: 6, column: 0, value: -1000 },
      { row: 6, column: 5, value: 1000 },
      { row: 6, column: 6, value: 1000 },
      { row: 11, column: 0, value: 1000 },
      { row: 11, column: 5, value: -1000 },
      { row: 11, column: 6, value: -1000 },
      { row: 11, column: 11, value: 1000 },
    ]);
  });
});
