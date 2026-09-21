import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { createModelBuilder } from "../../src/model/model-builder.js";
import { prepareAnalysis } from "../../src/analysis/prepare-analysis.js";
import { MODEL_SCHEMA_VERSION, modelToJsonValue } from "../../src/serialization/model-schema.js";
import { RESULT_SCHEMA_VERSION, resultToJsonValue } from "../../src/serialization/result-schema.js";
import { unitsSI } from "../../src/units/unit-presets.js";

function tinyModel() {
  return createModelBuilder()
    .setUnitSystem(unitsSI())
    .addNode({ id: "support", coordinates: [0, 0, 0] })
    .addNode({ id: "tip", coordinates: [2, 0, 0] })
    .addMaterial({ id: "steel", elasticModulus: 200e9, poissonRatio: 0.3 })
    .addTrussSection({ id: "bar", area: 0.01 })
    .addTruss({
      id: "member",
      startNodeId: "support",
      endNodeId: "tip",
      materialId: "steel",
      sectionId: "bar",
    })
    .supportNode("support", ["ux", "uy", "uz"])
    .supportNode("tip", ["uy", "uz"])
    .addLoadCase({
      id: "service",
      loads: [{ kind: "nodal", nodeId: "tip", force: [10_000, 0, 0] }],
    })
    .finalize();
}

it("publishes model schema version 2 and result schema version 3", () => {
  expect(MODEL_SCHEMA_VERSION).toBe("2");
  expect(RESULT_SCHEMA_VERSION).toBe("3");
});

it("emits matching schema versions from model and result serializers", () => {
  const model = tinyModel();
  const result = prepareAnalysis(model).solveCase("service");
  expect(modelToJsonValue(model).schemaVersion).toBe("2");
  expect(resultToJsonValue(result).schemaVersion).toBe("3");
});

it("documents the current schema versions without stale predecessors", () => {
  const publicApi = readFileSync("docs/api/public-api.md", "utf8");
  expect(publicApi).toContain('`MODEL_SCHEMA_VERSION` is `"2"`');
  expect(publicApi).toContain('`RESULT_SCHEMA_VERSION` is `"3"`');

  const jsonInput = readFileSync("docs/api/json-input.md", "utf8");
  expect(jsonInput).toContain('`schemaVersion: "2"`');

  const architecture = readFileSync("docs/architecture/system-architecture.md", "utf8");
  expect(architecture).toContain("model schema version `2`");
  expect(architecture).toContain("result schema version `3`");

  const supersession = readFileSync("docs/verification/json-api-report.md", "utf8");
  expect(supersession).toContain("Current model JSON remains schema version `2`");
  expect(supersession).toContain("current result JSON is schema version `3`");
});
