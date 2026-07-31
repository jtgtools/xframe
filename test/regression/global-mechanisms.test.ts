import { expect, it } from "vitest";
import { prepareAnalysis } from "../../src/analysis/prepare-analysis.js";
import { createModelBuilder } from "../../src/model/model-builder.js";
import { XFrameError } from "../../src/errors/xframe-error.js";

it("FR-SOL-007: rejects an under-restrained truss as a physical global mechanism", () => {
  const model = createModelBuilder()
    .setUnitSystem({ version: "1", length: "m", force: "N", moment: "N*m", modulus: "Pa", distributedForce: "N/m", density: "kg/m^3", rotation: "rad" })
    .addNode({ id: "a", coordinates: [0, 0, 0] })
    .addNode({ id: "b", coordinates: [1, 0, 0] })
    .addMaterial({ id: "m", elasticModulus: 1000, shearModulus: 400 })
    .addTrussSection({ id: "s", area: 1 })
    .addTruss({ id: "t", startNodeId: "a", endNodeId: "b", materialId: "m", sectionId: "s" })
    .finalize();
  try {
    prepareAnalysis(model);
    throw new Error("expected mechanism");
  } catch (error) {
    expect(error).toBeInstanceOf(XFrameError);
    expect((error as XFrameError).code).toBe("GLOBAL_MECHANISM");
    expect((error as XFrameError).context.kind).toBe("analysis");
  }
});
