import {
  createEnvelopeCompatibility,
  createModelBuilder,
  prepareAnalysis,
  streamEnvelope,
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

/**
 * Tower floor grid on soil springs with a rigid diaphragm.
 * Orthogonal Timoshenko grillage beams, a concrete core column,
 * grounded + two-node soil springs, and wind from two directions.
 * Demonstrates diaphragms, springs, Timoshenko theory, and envelopes.
 */
type TowerResult = {
  nodes: readonly { id: string; displacements: readonly { dof: string; value: number }[] }[];
};

function diaphragmValue(result: TowerResult, dof: "tx" | "tz"): number {
  return result.nodes.find((n) => n.id === "f22")!.displacements.find((d) => d.dof === dof)!.value;
}

export function runTowerGridExample() {
  const builder = createModelBuilder().setUnitSystem(units);
  // 2x2 bay floor at z=3, 6 m grid, columns down to grade springs.
  const floor = ["f11", "f21", "f31", "f12", "f22", "f32", "f13", "f23", "f33"] as const;
  const coords: Record<string, readonly [number, number, number]> = {
    f11: [0, 0, 3],
    f21: [6, 0, 3],
    f31: [12, 0, 3],
    f12: [0, 6, 3],
    f22: [6, 6, 3],
    f32: [12, 6, 3],
    f13: [0, 12, 3],
    f23: [6, 12, 3],
    f33: [12, 12, 3],
    b11: [0, 0, 0],
    b22: [6, 6, 0],
    b33: [12, 12, 0],
  };
  for (const [id, c] of Object.entries(coords)) builder.addNode({ id, coordinates: [...c] });
  builder
    .addMaterial({ id: "concrete", elasticModulus: 30e9, shearModulus: 12.5e9, density: 2500 })
    .addMaterial({ id: "steel", elasticModulus: 200e9, shearModulus: 76.92e9 })
    .addFrameSection({
      id: "grid",
      area: 0.12,
      shearAreaY: 0.1,
      shearAreaZ: 0.1,
      torsionalConstant: 0.002,
      momentOfInertiaY: 0.0016,
      momentOfInertiaZ: 0.0016,
    })
    .addFrameSection({
      id: "core",
      area: 0.25,
      shearAreaY: 0.2,
      shearAreaZ: 0.2,
      torsionalConstant: 0.005,
      momentOfInertiaY: 0.005,
      momentOfInertiaZ: 0.005,
    })
    .addTrussSection({ id: "brace", area: 0.002 });

  const gridBeams: readonly (readonly [string, string, string])[] = [
    ["gx11", "f11", "f21"],
    ["gx12", "f21", "f31"],
    ["gx21", "f12", "f22"],
    ["gx22", "f22", "f32"],
    ["gx31", "f13", "f23"],
    ["gx32", "f23", "f33"],
    ["gz11", "f11", "f12"],
    ["gz12", "f12", "f13"],
    ["gz21", "f21", "f22"],
    ["gz22", "f22", "f23"],
    ["gz31", "f31", "f32"],
    ["gz32", "f32", "f33"],
  ];
  for (const [id, s, e] of gridBeams)
    builder.addFrame({
      id,
      startNodeId: s,
      endNodeId: e,
      materialId: "concrete",
      sectionId: "grid",
      theory: { kind: "timoshenko" },
      orientation: [0, 0, 1],
    });
  builder.addFrame({
    id: "core",
    startNodeId: "b22",
    endNodeId: "f22",
    materialId: "concrete",
    sectionId: "core",
    theory: { kind: "timoshenko" },
    orientation: [1, 0, 0],
  });
  // Soil: full 6-DOF grounded springs so every base DOF stays physical.
  // No extra grade fixities: the building floats on soil stiffness alone.
  builder
    .addSpring({ id: "soil-11", startNodeId: "b11", stiffness: [20e6, 50e6, 20e6, 5e6, 5e6, 5e6] })
    .addSpring({ id: "soil-33", startNodeId: "b33", stiffness: [20e6, 50e6, 20e6, 5e6, 5e6, 5e6] })
    .addSpring({ id: "soil-22", startNodeId: "b22", stiffness: [20e6, 80e6, 20e6, 5e6, 5e6, 5e6] });

  // Floor diaphragm in xz plane: master f22 drives in-plane translation + yaw.
  builder.addRigidDiaphragm({
    id: "floor",
    plane: "zx",
    masterNodeId: "f22",
    slaveNodeIds: floor.filter((n) => n !== "f22"),
  });

  const model = builder
    .addLoadCase({
      id: "wind-x",
      loads: [{ kind: "nodal", nodeId: "f22", force: [120000, 0, 0] }],
    })
    .addLoadCase({
      id: "wind-z",
      loads: [{ kind: "nodal", nodeId: "f22", force: [0, 0, 90000] }],
    })
    .finalize();

  const prepared = prepareAnalysis(model);
  const windX = prepared.solveCase("wind-x");
  const windZ = prepared.solveCase("wind-z");
  const components = Object.freeze([
    Object.freeze({ component: "tx", entityId: "f22" }),
    Object.freeze({ component: "tz", entityId: "f22" }),
  ]);
  const compatibility = createEnvelopeCompatibility(windX, components);
  const envelope = streamEnvelope(
    [
      {
        resultId: windX.id,
        resultKind: windX.kind,
        compatibility,
        values: [diaphragmValue(windX, "tx"), diaphragmValue(windX, "tz")],
      },
      {
        resultId: windZ.id,
        resultKind: windZ.kind,
        compatibility: createEnvelopeCompatibility(windZ, components),
        values: [diaphragmValue(windZ, "tx"), diaphragmValue(windZ, "tz")],
      },
    ],
    components,
  );

  const drift = windX.nodes
    .find((n) => n.id === "f22")!
    .displacements.find((d) => d.dof === "tx")!.value;
  const springShear = windX.springs.reduce((sum, s) => sum + s.globalEndForces[0]!, 0);
  const envelopeMax = Math.max(...envelope.maximum.map((m) => m.value));
  const envelopeMin = Math.min(...envelope.minimum.map((m) => m.value));

  return Object.freeze({
    diaphragmDrift: drift,
    springShear,
    envelopeMax,
    envelopeMin,
    diagnosticStatus: windX.diagnostics.status,
  });
}
