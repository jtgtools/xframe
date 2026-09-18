import { writeFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import { createModelBuilder, prepareAnalysis } from "../dist/index.js";

const units = {
  version: "1",
  length: "m",
  force: "N",
  moment: "N*m",
  modulus: "Pa",
  distributedForce: "N/m",
  density: "kg/m^3",
  rotation: "rad",
};

function timed(operation) {
  const start = performance.now();
  const value = operation();
  return { value, milliseconds: performance.now() - start };
}

function buildMomentFrame(stories, bays, bayWidth = 6, storyHeight = 3) {
  const builder = createModelBuilder().setUnitSystem(units);
  for (let s = 0; s <= stories; s += 1)
    for (let b = 0; b <= bays; b += 1)
      builder.addNode({ id: `n${s}-${b}`, coordinates: [b * bayWidth, s * storyHeight, 0] });
  builder
    .addMaterial({ id: "steel", elasticModulus: 200e9, shearModulus: 76.92e9, density: 7850 })
    .addFrameSection({
      id: "col",
      area: 0.02,
      torsionalConstant: 8e-6,
      momentOfInertiaY: 10e-6,
      momentOfInertiaZ: 18e-6,
    })
    .addFrameSection({
      id: "beam",
      area: 0.016,
      torsionalConstant: 6e-6,
      momentOfInertiaY: 8e-6,
      momentOfInertiaZ: 14e-6,
    });
  for (let s = 0; s < stories; s += 1)
    for (let b = 0; b <= bays; b += 1)
      builder.addFrame({
        id: `c${s}-${b}`,
        startNodeId: `n${s}-${b}`,
        endNodeId: `n${s + 1}-${b}`,
        materialId: "steel",
        sectionId: "col",
        theory: { kind: "euler-bernoulli" },
        orientation: [1, 0, 0],
      });
  for (let s = 1; s <= stories; s += 1)
    for (let b = 0; b < bays; b += 1)
      builder.addFrame({
        id: `b${s}-${b}`,
        startNodeId: `n${s}-${b}`,
        endNodeId: `n${s}-${b + 1}`,
        materialId: "steel",
        sectionId: "beam",
        theory: { kind: "euler-bernoulli" },
        orientation: [0, 1, 0],
      });
  for (let b = 0; b <= bays; b += 1)
    for (const dof of ["tx", "ty", "tz", "rx", "ry", "rz"])
      builder.addConstraint({
        id: `fix:n0-${b}:${dof}`,
        terms: [{ nodeId: `n0-${b}`, dof, coefficient: 1 }],
        rightHandSide: 0,
      });
  const lateral = (scale) => {
    const loads = [];
    for (let s = 1; s <= stories; s += 1)
      loads.push({ kind: "nodal", nodeId: `n${s}-${bays}`, force: [1000 * scale, 0, 0] });
    return loads;
  };
  return builder
    .addLoadCase({ id: "P1", loads: lateral(1) })
    .addLoadCase({ id: "P2", loads: lateral(2) })
    .finalize();
}

function buildTowerGrid() {
  const builder = createModelBuilder().setUnitSystem(units);
  const ids = ["f11", "f21", "f31", "f12", "f22", "f32", "f13", "f23", "f33"];
  const coords = {
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
  for (const [id, c] of Object.entries(coords)) builder.addNode({ id, coordinates: c });
  builder
    .addMaterial({ id: "concrete", elasticModulus: 30e9, shearModulus: 12.5e9 })
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
    });
  const beams = [
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
  for (const [id, s, e] of beams)
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
  builder
    .addSpring({ id: "soil-11", startNodeId: "b11", stiffness: [20e6, 50e6, 20e6, 5e6, 5e6, 5e6] })
    .addSpring({ id: "soil-33", startNodeId: "b33", stiffness: [20e6, 50e6, 20e6, 5e6, 5e6, 5e6] })
    .addSpring({ id: "soil-22", startNodeId: "b22", stiffness: [20e6, 80e6, 20e6, 5e6, 5e6, 5e6] });
  builder.addRigidDiaphragm({
    id: "floor",
    plane: "zx",
    masterNodeId: "f22",
    slaveNodeIds: ids.filter((n) => n !== "f22"),
  });
  return builder
    .addLoadCase({ id: "P1", loads: [{ kind: "nodal", nodeId: "f22", force: [60000, 0, 0] }] })
    .addLoadCase({ id: "P2", loads: [{ kind: "nodal", nodeId: "f22", force: [120000, 0, 0] }] })
    .finalize();
}

function run(label, stories, bays, build) {
  const topology = timed(build);
  const preparation = timed(() => prepareAnalysis(topology.value));
  const firstCase = timed(() => preparation.value.solveCase("P1"));
  const secondCase = timed(() => preparation.value.solveCase("P2"));
  const statistics = preparation.value.statistics;
  const equations = firstCase.value.fullDisplacements.length;
  const coordinateNonzeros = statistics.fullNonzeros;
  const estimatedBytes =
    coordinateNonzeros * 24 + statistics.skylineStorage * 8 + equations * 8 * 5;
  const first = firstCase.value.fullDisplacements;
  let probe = 0;
  for (let i = 1; i < first.length; i += 1)
    if (Math.abs(first[i]) > Math.abs(first[probe])) probe = i;
  return {
    label,
    stories,
    bays,
    equations,
    coordinateNonzeros,
    skylineStorage: statistics.skylineStorage,
    skylineBandwidth: statistics.skylineBandwidth,
    skylineMaximumRowWidth: statistics.skylineMaximumRowWidth,
    estimatedSparseWorkingBytes: estimatedBytes,
    timingsMilliseconds: {
      topology: topology.milliseconds,
      prepareEndToEnd: preparation.milliseconds,
      firstCase: firstCase.milliseconds,
      reusedSecondCase: secondCase.milliseconds,
    },
    reuse: statistics,
    checks: {
      finalDisplacement: firstCase.value.fullDisplacements[probe],
      loadScalingRatio:
        secondCase.value.fullDisplacements[probe] / firstCase.value.fullDisplacements[probe],
      normalizedResidual: firstCase.value.diagnostics.normalizedResidual,
    },
  };
}

const scenarios = [
  { label: "2-story-2-bay", stories: 2, bays: 2, build: () => buildMomentFrame(2, 2) },
  { label: "5-story-3-bay", stories: 5, bays: 3, build: () => buildMomentFrame(5, 3) },
  { label: "10-story-4-bay", stories: 10, bays: 4, build: () => buildMomentFrame(10, 4) },
  { label: "15-story-4-bay", stories: 15, bays: 4, build: () => buildMomentFrame(15, 4) },
  { label: "tower-grid", stories: 1, bays: 2, build: buildTowerGrid },
];

const report = {
  schemaVersion: "2",
  runtime: { node: process.version, platform: process.platform, architecture: process.arch },
  model:
    "deterministic real-building suite: 6-DOF steel moment frames (2/5/10/15 stories) plus a concrete tower-grid floor on soil springs with rigid diaphragm, each with two proportional lateral load cases",
  cases: scenarios.map((s) => run(s.label, s.stories, s.bays, s.build)),
};
writeFileSync("docs/verification/benchmark-results.json", `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
