import { combineResults, createModelBuilder, prepareAnalysis, unitsSI } from "../src/index.js";

const units = unitsSI();

/**
 * Two-story two-bay steel moment frame: a real office-building slice.
 * Columns fixed at grade, beams carry gravity UDL, roof carries wind.
 * Demonstrates frames, distributed + nodal + self-weight loads,
 * and factored result combination (1.2 gravity + 1.6 lateral).
 */
function nodeDisp(
  result: {
    nodes: readonly { id: string; displacements: readonly { dof: string; value: number }[] }[];
  },
  id: string,
  dof: "tx" | "ty",
): number {
  return result.nodes.find((n) => n.id === id)!.displacements.find((d) => d.dof === dof)!.value;
}

export function runTwoStoryTwoBayExample() {
  const builder = createModelBuilder().setUnitSystem(units);
  const coords: readonly (readonly [number, number, number])[] = [
    [0, 0, 0],
    [4, 0, 0],
    [8, 0, 0],
    [0, 3, 0],
    [4, 3, 0],
    [8, 3, 0],
    [0, 6, 0],
    [4, 6, 0],
    [8, 6, 0],
  ];
  coords.forEach((c, i) => builder.addNode({ id: `n${i + 1}`, coordinates: [...c] }));
  builder
    .addMaterial({ id: "steel", elasticModulus: 200e9, shearModulus: 76.92e9, density: 7850 })
    .addFrameSection({
      id: "col",
      area: 0.022,
      torsionalConstant: 9e-6,
      momentOfInertiaY: 12e-6,
      momentOfInertiaZ: 22e-6,
    })
    .addFrameSection({
      id: "beam",
      area: 0.017,
      torsionalConstant: 7e-6,
      momentOfInertiaY: 8.5e-6,
      momentOfInertiaZ: 16e-6,
    });
  const members: readonly (readonly [string, string, string, string])[] = [
    ["c11", "n1", "n4", "col"],
    ["c21", "n2", "n5", "col"],
    ["c31", "n3", "n6", "col"],
    ["c12", "n4", "n7", "col"],
    ["c22", "n5", "n8", "col"],
    ["c32", "n6", "n9", "col"],
    ["b11", "n4", "n5", "beam"],
    ["b21", "n5", "n6", "beam"],
    ["b12", "n7", "n8", "beam"],
    ["b22", "n8", "n9", "beam"],
  ];
  for (const [id, s, e, sec] of members)
    builder.addFrame({
      id,
      startNodeId: s,
      endNodeId: e,
      materialId: "steel",
      sectionId: sec,
      theory: { kind: "euler-bernoulli" },
      orientation: sec === "col" ? [1, 0, 0] : [0, 1, 0],
    });
  for (const n of ["n1", "n2", "n3"]) builder.fixNode(n);

  const model = builder
    .addLoadCase({
      id: "gravity",
      loads: [
        {
          kind: "member-distributed",
          frameId: "b11",
          coordinateSystem: "local",
          startIntensity: [0, -8000, 0],
          endIntensity: [0, -8000, 0],
        },
        {
          kind: "member-distributed",
          frameId: "b21",
          coordinateSystem: "local",
          startIntensity: [0, -8000, 0],
          endIntensity: [0, -8000, 0],
        },
        { kind: "self-weight", gravity: [0, -9.80665, 0] },
      ],
    })
    .addLoadCase({
      id: "lateral",
      loads: [
        { kind: "nodal", nodeId: "n7", force: [3000, 0, 0] },
        { kind: "nodal", nodeId: "n8", force: [3000, 0, 0] },
        { kind: "nodal", nodeId: "n9", force: [3000, 0, 0] },
      ],
    })
    .finalize();

  const prepared = prepareAnalysis(model);
  const gravity = prepared.solveCase("gravity");
  const lateral = prepared.solveCase("lateral");
  const combined = combineResults("1.2D+1.6W", [
    { result: gravity, factor: 1.2 },
    { result: lateral, factor: 1.6 },
  ]);

  const roofDrift = nodeDisp(lateral, "n8", "tx");
  const baseShear = lateral.nodes
    .filter((n) => ["n1", "n2", "n3"].includes(n.id))
    .reduce((s, n) => s + n.reactions.find((r) => r.dof === "tx")!.value, 0);
  const baseMoment = lateral.nodes
    .filter((n) => ["n1", "n2", "n3"].includes(n.id))
    .reduce((s, n) => s + n.reactions.find((r) => r.dof === "rz")!.value, 0);

  return Object.freeze({
    roofDrift,
    gravityRoofDrift: nodeDisp(gravity, "n8", "tx"),
    lateralRoofDrift: roofDrift,
    combinedRoofDrift: combined.nodes
      .find((n) => n.id === "n8")!
      .displacements.find((d) => d.dof === "tx")!.value,
    gravityRoofSettlement: nodeDisp(gravity, "n8", "ty"),
    baseShear,
    baseMoment,
    diagnosticStatus: lateral.diagnostics.status,
  });
}
