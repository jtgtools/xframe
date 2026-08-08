import { expect, it } from "vitest";
import { createModelBuilder } from "../../src/model/model-builder.js";

it("NFR-SEC-001: prototype-like case and combination references remain ordinary Map keys", () => {
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
    .addSpring({ id: "s", startNodeId: "a", stiffness: { tx: 1 } })
    .addLoadCase({ id: "__proto__", loads: [] })
    .addCombination({ id: "constructor", factors: [{ resultId: "__proto__", factor: 1 }] })
    .finalize();
  expect(model.loadCases[0]?.id).toBe("__proto__");
  expect(model.combinations[0]?.id).toBe("constructor");
  expect(model.combinationEvaluationOrder).toEqual(["constructor"]);
});
