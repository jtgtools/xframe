import {
  artifactHash,
  canonicalJson,
  createModelBuilder,
  modelToJsonValue,
  parseModelJson,
  prepareAnalysis,
  unitsSI,
} from "../src/index.js";

const units = unitsSI();

/** Canonical JSON round-trip of a real two-story building slice. */
export async function runBuildingJsonRoundtripExample() {
  const builder = createModelBuilder().setUnitSystem(units);
  const coords: readonly (readonly [number, number, number])[] = [
    [0, 0, 0],
    [4, 0, 0],
    [0, 3, 0],
    [4, 3, 0],
  ];
  ["p1", "p2", "p3", "p4"].forEach((id, i) =>
    builder.addNode({ id, coordinates: [...coords[i]!] }),
  );
  builder
    .addMaterial({ id: "steel", elasticModulus: 200e9, shearModulus: 76.92e9 })
    .addFrameSection({
      id: "sec",
      area: 0.02,
      torsionalConstant: 8e-6,
      momentOfInertiaY: 10e-6,
      momentOfInertiaZ: 18e-6,
    })
    .addFrame({
      id: "c1",
      startNodeId: "p1",
      endNodeId: "p3",
      materialId: "steel",
      sectionId: "sec",
      theory: { kind: "euler-bernoulli" },
      orientation: [1, 0, 0],
    })
    .addFrame({
      id: "c2",
      startNodeId: "p2",
      endNodeId: "p4",
      materialId: "steel",
      sectionId: "sec",
      theory: { kind: "euler-bernoulli" },
      orientation: [1, 0, 0],
    })
    .addFrame({
      id: "b1",
      startNodeId: "p3",
      endNodeId: "p4",
      materialId: "steel",
      sectionId: "sec",
      theory: { kind: "euler-bernoulli" },
      orientation: [0, 1, 0],
      releases: { end: ["ry"] },
    });
  for (const n of ["p1", "p2"]) builder.fixNode(n);
  const model = builder
    .addLoadCase({
      id: "service",
      loads: [
        {
          kind: "member-distributed",
          frameId: "b1",
          coordinateSystem: "local",
          startIntensity: [0, -6000, 0],
          endIntensity: [0, -6000, 0],
        },
        { kind: "nodal", nodeId: "p4", force: [4000, 0, 0] },
      ],
    })
    .finalize();

  const jsonValue = modelToJsonValue(model);
  const canonical = canonicalJson(jsonValue);
  const parsed = parseModelJson(JSON.parse(canonical));
  const result = prepareAnalysis(parsed).solveCase("service");
  const roofDrift = result.nodes
    .find((n) => n.id === "p4")!
    .displacements.find((d) => d.dof === "ux")!.value;

  return Object.freeze({
    sameCanonicalJson: canonicalJson(modelToJsonValue(parsed)) === canonical,
    hash: await artifactHash(jsonValue),
    roofDrift,
    diagnosticStatus: result.diagnostics.status,
  });
}
