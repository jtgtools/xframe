import { expect, it } from "vitest";
import { XFrameError } from "../../src/errors/xframe-error.js";
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

it("FR-MOD-006: aggregates missing references in deterministic entity/path order", () => {
  const builder = createModelBuilder()
    .setUnitSystem(units)
    .addNode({ id: "n1", coordinates: [0, 0, 0] })
    .addFrame({
      id: "z-frame",
      startNodeId: "n1",
      endNodeId: "missing-node",
      materialId: "missing-material",
      sectionId: "missing-section",
      theory: { kind: "euler-bernoulli" },
    })
    .addTruss({
      id: "a-truss",
      startNodeId: "missing-start",
      endNodeId: "missing-end",
      materialId: "missing-material",
      sectionId: "missing-section",
    });

  try {
    builder.finalize();
    throw new Error("expected finalization to fail");
  } catch (error) {
    expect(error).toBeInstanceOf(XFrameError);
    const xframe = error as XFrameError;
    expect(xframe.code).toBe("REFERENCE_NOT_FOUND");
    expect(xframe.context).toEqual({
      kind: "reference",
      issues: [
        { entityType: "frame", id: "z-frame", path: "endNodeId", referencedId: "missing-node", expectedType: "node" },
        { entityType: "frame", id: "z-frame", path: "materialId", referencedId: "missing-material", expectedType: "material" },
        { entityType: "frame", id: "z-frame", path: "sectionId", referencedId: "missing-section", expectedType: "frame section" },
        { entityType: "truss", id: "a-truss", path: "endNodeId", referencedId: "missing-end", expectedType: "node" },
        { entityType: "truss", id: "a-truss", path: "materialId", referencedId: "missing-material", expectedType: "material" },
        { entityType: "truss", id: "a-truss", path: "sectionId", referencedId: "missing-section", expectedType: "truss section" },
        { entityType: "truss", id: "a-truss", path: "startNodeId", referencedId: "missing-start", expectedType: "node" },
      ],
    });
  }
});
