import { describe, expect, it } from "vitest";
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

function randomGenerator(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

describe("seeded structural model invariants", () => {
  it("twenty-five spring chains match exact series compliance", () => {
    for (let seed = 1; seed <= 25; seed += 1) {
      const random = randomGenerator(seed);
      const count = 10;
      const stiffnesses = Array.from({ length: count }, () => 500 + 9500 * random());
      const load = 10 + 990 * random();
      const builder = createModelBuilder().setUnitSystem(units);
      for (let index = 0; index < count; index += 1) {
        builder.addNode({ id: `n${String(index).padStart(2, "0")}`, coordinates: [index, 0, 0] });
      }
      builder.addSpring({
        id: "ground",
        startNodeId: "n00",
        stiffness: [stiffnesses[0]!, 0, 0, 0, 0, 0],
      });
      for (let index = 1; index < count; index += 1) {
        builder.addSpring({
          id: `link${String(index).padStart(2, "0")}`,
          startNodeId: `n${String(index - 1).padStart(2, "0")}`,
          endNodeId: `n${String(index).padStart(2, "0")}`,
          stiffness: [stiffnesses[index]!, 0, 0, 0, 0, 0],
        });
      }
      const result = prepareAnalysis(
        builder
          .addLoadCase({ id: "P", loads: [{ kind: "nodal", nodeId: "n09", force: [load, 0, 0] }] })
          .finalize(),
      ).solveCase("P");
      let compliance = 0;
      for (let index = 0; index < count; index += 1) {
        compliance += 1 / stiffnesses[index]!;
        const node = result.nodes.find(({ id }) => id === `n${String(index).padStart(2, "0")}`)!;
        expect(node.displacements[0]!.value).toBeCloseTo(load * compliance, 11);
      }
      for (const spring of result.springs) {
        expect(Math.max(...spring.globalEndForces.map(Math.abs))).toBeCloseTo(load, 9);
      }
      expect(result.diagnostics.normalizedResidual).toBeLessThan(1e-12);
      expect(result.diagnostics.relativeEnergyError).toBeLessThan(1e-12);
    }
  });
});
