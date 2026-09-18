import { expect, it } from "vitest";
import { prepareAnalysis } from "../../src/analysis/prepare-analysis.js";
import { createModelBuilder } from "../../src/model/model-builder.js";

it("reuses one assembled stiffness and factorization for compatible load cases", () => {
  const model = createModelBuilder()
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
    .addNode({ id: "n", coordinates: [0, 0, 0] })
    .addSpring({ id: "k", startNodeId: "n", stiffness: [100, 0, 0, 0, 0, 0] })
    .addLoadCase({ id: "A", loads: [{ kind: "nodal", nodeId: "n", force: [10, 0, 0] }] })
    .addLoadCase({ id: "B", loads: [{ kind: "nodal", nodeId: "n", force: [-25, 0, 0] }] })
    .finalize();
  const prepared = prepareAnalysis(model);
  const results = prepared.solveCases(["A", "B"]);
  expect(results[0]!.fullDisplacements[0]).toBeCloseTo(0.1, 14);
  expect(results[1]!.fullDisplacements[0]).toBeCloseTo(-0.25, 14);
  expect(prepared.statistics.assemblyCount).toBe(1);
  expect(prepared.statistics.factorizationCount).toBe(1);
  expect(prepared.statistics.solveCount).toBe(2);
});
