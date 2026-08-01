import { expect, it, vi } from "vitest";
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

  let failure: unknown;
  try {
    builder.finalize();
  } catch (error) {
    failure = error;
  }
  expect(failure).toBeInstanceOf(XFrameError);
  const xframe = failure as XFrameError;
  expect(xframe.code).toBe("REFERENCE_NOT_FOUND");
  expect(xframe.context).toEqual({
    kind: "reference",
    issues: [
      {
        entityType: "frame",
        id: "z-frame",
        path: "endNodeId",
        referencedId: "missing-node",
        expectedType: "node",
      },
      {
        entityType: "frame",
        id: "z-frame",
        path: "materialId",
        referencedId: "missing-material",
        expectedType: "material",
      },
      {
        entityType: "frame",
        id: "z-frame",
        path: "sectionId",
        referencedId: "missing-section",
        expectedType: "frame section",
      },
      {
        entityType: "truss",
        id: "a-truss",
        path: "endNodeId",
        referencedId: "missing-end",
        expectedType: "node",
      },
      {
        entityType: "truss",
        id: "a-truss",
        path: "materialId",
        referencedId: "missing-material",
        expectedType: "material",
      },
      {
        entityType: "truss",
        id: "a-truss",
        path: "sectionId",
        referencedId: "missing-section",
        expectedType: "truss section",
      },
      {
        entityType: "truss",
        id: "a-truss",
        path: "startNodeId",
        referencedId: "missing-start",
        expectedType: "node",
      },
    ],
  });
});

it("FR-SAFE-010: reference diagnostics use ECMAScript identifier order without host collation", () => {
  const builder = createModelBuilder()
    .setUnitSystem(units)
    .addNode({ id: "anchor", coordinates: [0, 0, 0] })
    .addMaterial({ id: "material", elasticModulus: 200e9, poissonRatio: 0.3 })
    .addFrameSection({
      id: "section",
      area: 1,
      torsionalConstant: 1,
      momentOfInertiaY: 1,
      momentOfInertiaZ: 1,
    })
    .addFrame({
      id: "ä",
      startNodeId: "anchor",
      endNodeId: "missing-a",
      materialId: "material",
      sectionId: "section",
      theory: { kind: "euler-bernoulli" },
    })
    .addFrame({
      id: "z",
      startNodeId: "anchor",
      endNodeId: "missing-z",
      materialId: "material",
      sectionId: "section",
      theory: { kind: "euler-bernoulli" },
    });
  const localeCompare = vi.spyOn(String.prototype, "localeCompare").mockImplementation(() => {
    throw new Error("localeCompare used");
  });
  try {
    let failure: unknown;
    try {
      builder.finalize();
    } catch (error) {
      failure = error;
    }
    expect(failure).toBeInstanceOf(XFrameError);
    const xframe = failure as XFrameError;
    expect(xframe.code).toBe("REFERENCE_NOT_FOUND");
    expect(
      (xframe.context as { readonly issues: readonly { readonly id: string }[] }).issues.map(
        ({ id }) => id,
      ),
    ).toEqual(["z", "ä"]);
  } finally {
    localeCompare.mockRestore();
  }
});
