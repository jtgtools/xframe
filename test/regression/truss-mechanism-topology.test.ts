import { expect, it } from "vitest";
import { createModelBuilder } from "../../src/model/model-builder.js";
import { createDofKey } from "../../src/model/dof-key.js";

it("FR-DOF-002/FR-DOF-003: a truss-only model exposes translations and never manufactures rotations or restraints", () => {
  const model = createModelBuilder()
    .setUnitSystem({ version: "1", length: "m", force: "N", moment: "N*m", modulus: "Pa", distributedForce: "N/m", density: "kg/m^3", rotation: "rad" })
    .addNode({ id: "left", coordinates: [0, 0, 0] })
    .addNode({ id: "right", coordinates: [3, 4, 0] })
    .addMaterial({ id: "steel", elasticModulus: 200e9, poissonRatio: 0.3 })
    .addTrussSection({ id: "bar", area: 0.001 })
    .addTruss({ id: "tie", startNodeId: "left", endNodeId: "right", materialId: "steel", sectionId: "bar" })
    .finalize();

  expect(model.physicalDofs.size).toBe(6);
  for (const nodeId of ["left", "right"] as const) {
    for (const dof of ["tx", "ty", "tz"] as const) expect(model.physicalDofs.has(createDofKey(nodeId, dof))).toBe(true);
    for (const dof of ["rx", "ry", "rz"] as const) expect(model.physicalDofs.has(createDofKey(nodeId, dof))).toBe(false);
  }
  expect(model.constraints).toHaveLength(0);
});
