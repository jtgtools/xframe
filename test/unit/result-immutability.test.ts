import { expect, it } from "vitest";
import { prepareAnalysis } from "../../src/analysis/prepare-analysis.js";
import { createModelBuilder } from "../../src/model/model-builder.js";

it("FR-RES-001/NFR-SEC-001: solved results own immutable identity, units, node, and element data", () => {
  const model = createModelBuilder()
    .setUnitSystem({ version: "1", length: "m", force: "N", moment: "N*m", modulus: "Pa", distributedForce: "N/m", density: "kg/m^3", rotation: "rad" })
    .addNode({ id: "n", coordinates: [0, 0, 0] })
    .addSpring({ id: "k", startNodeId: "n", stiffness: [100, 0, 0, 0, 0, 0] })
    .addLoadCase({ id: "P", loads: [{ kind: "nodal", nodeId: "n", force: [10, 0, 0] }] })
    .finalize();
  const result = prepareAnalysis(model).solveCase("P");
  expect(result.kind).toBe("case");
  expect(result.modelFingerprint).toBe(model.fingerprint);
  expect(result.unitSystem).toEqual(model.unitSystem);
  expect(result.nodes[0]!.displacements).toEqual([{ dof: "tx", value: 0.1 }]);
  expect(Object.isFrozen(result)).toBe(true);
  expect(Object.isFrozen(result.nodes)).toBe(true);
  expect(Object.isFrozen(result.nodes[0]!.displacements)).toBe(true);
});
