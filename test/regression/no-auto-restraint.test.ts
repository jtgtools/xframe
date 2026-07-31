import { expect, it } from "vitest";
import { createModelBuilder } from "../../src/model/model-builder.js";

it("FR-DOF-002/FR-DOF-003: finalization preserves every free truss translation without invented restraints", () => {
  const model = createModelBuilder()
    .setUnitSystem({ version: "1", length: "m", force: "N", moment: "N*m", modulus: "Pa", distributedForce: "N/m", density: "kg/m^3", rotation: "rad" })
    .addNode({ id: "a", coordinates: [0, 0, 0] })
    .addNode({ id: "b", coordinates: [1, 0, 0] })
    .addMaterial({ id: "m", elasticModulus: 1, shearModulus: 1 })
    .addTrussSection({ id: "s", area: 1 })
    .addTruss({ id: "t", startNodeId: "a", endNodeId: "b", materialId: "m", sectionId: "s" })
    .finalize();

  expect(model.physicalDofs.size).toBe(6);
  expect(model.constraints).toEqual([]);
  expect(Array.from(model.physicalDofs.values(), ({ requestedBy }) => requestedBy)).toEqual([
    ["truss:t"], ["truss:t"], ["truss:t"], ["truss:t"], ["truss:t"], ["truss:t"],
  ]);
});
