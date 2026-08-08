import { expect, it } from "vitest";
import { XFrameError } from "../../src/errors/xframe-error.js";
import { createModelBuilder } from "../../src/model/model-builder.js";

it("FR-MAT-002/FR-LOD-006: self-weight aggregates every affected material missing density", () => {
  const builder = createModelBuilder()
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
    .addNode({ id: "b", coordinates: [1, 0, 0] })
    .addNode({ id: "c", coordinates: [2, 0, 0] })
    .addMaterial({ id: "m-frame", elasticModulus: 1, shearModulus: 1 })
    .addMaterial({ id: "m-truss", elasticModulus: 1, shearModulus: 1 })
    .addFrameSection({
      id: "fs",
      area: 1,
      torsionalConstant: 1,
      momentOfInertiaY: 1,
      momentOfInertiaZ: 1,
    })
    .addTrussSection({ id: "ts", area: 1 })
    .addFrame({
      id: "f",
      startNodeId: "a",
      endNodeId: "b",
      materialId: "m-frame",
      sectionId: "fs",
      theory: { kind: "euler-bernoulli" },
    })
    .addTruss({ id: "t", startNodeId: "b", endNodeId: "c", materialId: "m-truss", sectionId: "ts" })
    .addLoadCase({ id: "SW", loads: [{ kind: "self-weight", gravity: [0, 0, -9.81] }] });

  let caught: unknown;
  try {
    builder.finalize();
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(XFrameError);
  if (!(caught instanceof XFrameError)) throw new Error("Expected missing-density failure.");
  expect(caught.code).toBe("MATERIAL_INVALID");
  expect(caught.context).toEqual({
    kind: "material-dependency",
    loadCaseId: "SW",
    missingMaterialIds: ["m-frame", "m-truss"],
    affectedElementIds: ["f", "t"],
    reason: "self-weight requires density",
  });
});
