import { expect, it } from "vitest";
import { canonicalJson } from "../../src/serialization/canonical-json.js";
import { modelToJsonValue } from "../../src/serialization/model-schema.js";
import { parseModelJson } from "../../src/serialization/parse-model-json.js";

it("FR-JSON-006/NFR-DET-001: seed 25301 round-trips 50 generated spring models deterministically", () => {
  let state = 25301;
  const random = () => ((state = (1664525 * state + 1013904223) >>> 0) / 2 ** 32);
  for (let index = 0; index < 50; index += 1) {
    const stiffness = 1 + Math.floor(random() * 1e6);
    const json = {
      schemaVersion: "1",
      unitSystem: { version: "1", length: "m", force: "N", moment: "N*m", modulus: "Pa", distributedForce: "N/m", density: "kg/m^3", rotation: "rad" },
      nodes: [{ id: `n${index}`, coordinates: [random(), random(), random()] }],
      materials: [], frameSections: [], trussSections: [], frames: [], trusses: [],
      springs: [{ id: `k${index}`, startNodeId: `n${index}`, stiffness: [stiffness, 0, 0, 0, 0, 0] }],
      constraints: [],
      loadCases: [{ id: `L${index}`, loads: [{ kind: "nodal", nodeId: `n${index}`, force: [1, 0, 0] }] }],
      combinations: [],
    };
    const first = canonicalJson(modelToJsonValue(parseModelJson(json)));
    const second = canonicalJson(modelToJsonValue(parseModelJson(first)));
    expect(second).toBe(first);
  }
});
