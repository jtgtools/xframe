import { expect, it, vi } from "vitest";
import { prepareAnalysis } from "../../src/analysis/prepare-analysis.js";
import { createModelBuilder } from "../../src/model/model-builder.js";
import { XFrameError } from "../../src/errors/xframe-error.js";
import * as choleskyModule from "../../src/linalg/skyline-cholesky.js";

function mechanismError(model: Parameters<typeof prepareAnalysis>[0]): XFrameError {
  try {
    prepareAnalysis(model);
  } catch (error) {
    if (error instanceof XFrameError) return error;
    throw error;
  }
  throw new Error("expected mechanism");
}

it("rejects an under-restrained truss as a physical global mechanism", () => {
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
    .addNode({ id: "a", coordinates: [0, 0, 0] })
    .addNode({ id: "b", coordinates: [1, 0, 0] })
    .addMaterial({ id: "m", elasticModulus: 1000, shearModulus: 400 })
    .addTrussSection({ id: "s", area: 1 })
    .addTruss({ id: "t", startNodeId: "a", endNodeId: "b", materialId: "m", sectionId: "s" })
    .finalize();
  const error = mechanismError(model);
  expect(error.code).toBe("GLOBAL_MECHANISM");
  expect(error.context.kind).toBe("analysis");
});

it("rejects genuinely free eccentric truss rotations as a global mechanism", () => {
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
    .addMaterial({ id: "m", elasticModulus: 1000, shearModulus: 400 })
    .addTrussSection({ id: "s", area: 1 })
    .addTruss({
      id: "t",
      startNodeId: "a",
      endNodeId: "b",
      materialId: "m",
      sectionId: "s",
      rigidOffsets: { start: [0, 1, 0], end: [0, 1, 0] },
    });
  for (const nodeId of ["a", "b"] as const) {
    for (const dof of ["ux", "uy", "uz", "rx", "ry"] as const)
      builder.addConstraint({
        id: `fix:${nodeId}:${dof}`,
        terms: [{ nodeId, dof, coefficient: 1 }],
        rightHandSide: 0,
      });
  }

  expect(mechanismError(builder.finalize()).toJSON()).toMatchObject({
    name: "XFrameError",
    code: "GLOBAL_MECHANISM",
    context: { kind: "analysis", stage: "global-factorization" },
    causeSummary: { name: "XFrameError", code: "FACTORIZATION_FAILED" },
  });
});

it("wraps unexpected factorization failures with a stable error code", () => {
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
    .addNode({ id: "a", coordinates: [0, 0, 0] })
    .addNode({ id: "b", coordinates: [1, 0, 0] })
    .addMaterial({ id: "m", elasticModulus: 1000, shearModulus: 400 })
    .addTrussSection({ id: "s", area: 1 })
    .addTruss({ id: "t", startNodeId: "a", endNodeId: "b", materialId: "m", sectionId: "s" })
    .supportNode("a", ["ux", "uy", "uz"])
    .supportNode("b", ["uy", "uz"])
    .addLoadCase({ id: "L", loads: [{ kind: "nodal", nodeId: "b", force: [1, 0, 0] }] })
    .finalize();
  const failure = vi.spyOn(choleskyModule, "factorSkylineCholesky").mockImplementationOnce(() => {
    throw new RangeError("simulated host failure");
  });
  let caught: unknown;
  try {
    prepareAnalysis(model);
  } catch (error) {
    caught = error;
  } finally {
    failure.mockRestore();
  }
  expect(caught).toBeInstanceOf(XFrameError);
  expect((caught as XFrameError).code).not.toBe("FACTORIZATION_FAILED");
  expect((caught as XFrameError).causeSummary?.name).toBe("RangeError");
});
