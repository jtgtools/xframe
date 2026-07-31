import {
  artifactHash,
  canonicalJson,
  createModelBuilder,
  modelToJsonValue,
  parseModelJson,
  prepareAnalysis,
} from "../src/index.js";

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

/** Demonstrates canonical version-one JSON, SHA-256 hashing, parsing, and solving. */
export async function runJsonRoundtripExample() {
  const model = createModelBuilder()
    .setUnitSystem(units)
    .addNode({ id: "node", coordinates: [0, 0, 0] })
    .addSpring({ id: "spring", startNodeId: "node", stiffness: [500, 0, 0, 0, 0, 0] })
    .addLoadCase({
      id: "service",
      loads: [{ kind: "nodal", nodeId: "node", force: [25, 0, 0] }],
    })
    .finalize();
  const jsonValue = modelToJsonValue(model);
  const canonical = canonicalJson(jsonValue);
  const parsed = parseModelJson(JSON.parse(canonical));
  const result = prepareAnalysis(parsed).solveCase("service");

  return Object.freeze({
    sameCanonicalJson: canonicalJson(modelToJsonValue(parsed)) === canonical,
    hash: await artifactHash(jsonValue),
    displacement: result.nodes[0]!.displacements[0]!.value,
  });
}
