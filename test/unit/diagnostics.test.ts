import { expect, it } from "vitest";
import { prepareAnalysis } from "../../src/analysis/prepare-analysis.js";
import { createModelBuilder } from "../../src/model/model-builder.js";

it("FR-DIA-001: reports raw residual, equilibrium, energy, pivot, storage, and reuse diagnostics", () => {
  const model = createModelBuilder()
    .setUnitSystem({ version: "1", length: "m", force: "N", moment: "N*m", modulus: "Pa", distributedForce: "N/m", density: "kg/m^3", rotation: "rad" })
    .addNode({ id: "n", coordinates: [0, 0, 0] })
    .addSpring({ id: "k", startNodeId: "n", stiffness: [100, 0, 0, 0, 0, 0] })
    .addLoadCase({ id: "P", loads: [{ kind: "nodal", nodeId: "n", force: [10, 0, 0] }] })
    .finalize();
  const result = prepareAnalysis(model).solveCase("P");
  expect(result.diagnostics.status).toBe("pass");
  expect(result.diagnostics.maximumAbsoluteResidual).toBeLessThan(1e-13);
  expect(result.diagnostics.forceEquilibrium).toEqual([0, 0, 0]);
  expect(result.diagnostics.momentEquilibrium).toEqual([0, 0, 0]);
  expect(result.diagnostics.strainEnergy).toBeCloseTo(0.5, 14);
  expect(result.diagnostics.externalWork).toBeCloseTo(0.5, 14);
  expect(result.diagnostics.relativeEnergyError).toBeLessThan(1e-14);
  expect(result.diagnostics.minimumNormalizedPivot).toBeGreaterThan(0);
  expect(result.diagnostics.equationCount).toBe(1);
  expect(result.diagnostics.skylineStorage).toBe(1);
  expect(result.diagnostics.skylineMaximumRowWidth).toBe(1);
  expect(result.diagnostics.skylineBandwidth).toBe(1);
});


it("FR-DIA-001: includes prescribed-displacement reaction work in energy balance", () => {
  const model = createModelBuilder()
    .setUnitSystem({ version: "1", length: "m", force: "N", moment: "N*m", modulus: "Pa", distributedForce: "N/m", density: "kg/m^3", rotation: "rad" })
    .addNode({ id: "n", coordinates: [0, 0, 0] })
    .addSpring({ id: "k", startNodeId: "n", stiffness: [100, 0, 0, 0, 0, 0] })
    .addConstraint({ id: "u", terms: [{ nodeId: "n", dof: "tx", coefficient: 1 }], rightHandSide: 0.1 })
    .addLoadCase({ id: "settlement", loads: [] })
    .finalize();
  const result = prepareAnalysis(model).solveCase("settlement");
  expect(result.diagnostics.strainEnergy).toBeCloseTo(0.5, 14);
  expect(result.diagnostics.externalWork).toBeCloseTo(0.5, 14);
  expect(result.diagnostics.relativeEnergyError).toBeLessThan(1e-14);
});
