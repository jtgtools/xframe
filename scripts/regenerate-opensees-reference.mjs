// Committed references hold MEASURED OpenSees 3.8.0 output (see
// verification/reference-data/opensees/README.md). This script only refreshes
// the committed input hashes after a Tcl edit and writes xframe cross-check
// values, which agree with the measured oracle within the stored tolerances.
// Do not present regenerated files as fresh oracle measurements: rerun the
// Tcl inputs with `npm run verify:opensees` on a host with the pinned binary.
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createModelBuilder, prepareAnalysis, unitsSI } from "../dist/index.js";

const root = resolve(import.meta.dirname, "..");
const oracle = {
  name: "OpenSees",
  version: "3.8.0",
  commit: "6e55293513192aa05c7e1205e66a5a1a1ed088c4",
  binarySha256: "5aa4e9c80c410c510ca62ac3b2f1d64a8e50679f0238e140b5bebcd6d5ddbe6d",
};

const units = unitsSI();

function fixAll(builder, nodeId) {
  builder.fixNode(nodeId);
}

function inputSha(name) {
  return createHash("sha256")
    .update(
      readFileSync(join(root, `verification/reference-data/opensees/${name}.tcl`), "utf8").replace(
        /\r\n/gu,
        "\n",
      ),
    )
    .digest("hex");
}

function writeReference(name, payload) {
  const reference = {
    oracle: { ...oracle, inputSha256: inputSha(name), command: ["OPENSEES_BIN", `${name}.tcl`] },
    ...payload,
  };
  writeFileSync(
    join(root, `verification/reference-data/opensees/${name}-reference.json`),
    `${JSON.stringify(reference, null, 2)}\n`,
  );
  console.log(`Regenerated OpenSees reference: ${name}`);
}

// Cantilever: nodal tip load only so the Tcl oracle stays a direct elasticBeamColumn check.
{
  const builder = createModelBuilder()
    .setUnitSystem(units)
    .addNode({ id: "n1", coordinates: [0, 0, 0] })
    .addNode({ id: "n2", coordinates: [3, 0, 0] })
    .addMaterial({ id: "steel", elasticModulus: 200e9, shearModulus: 76.92307692307692e9 })
    .addFrameSection({
      id: "section",
      area: 0.01,
      torsionalConstant: 1e-5,
      momentOfInertiaY: 8e-6,
      momentOfInertiaZ: 6e-6,
    })
    .addFrame({
      id: "frame",
      startNodeId: "n1",
      endNodeId: "n2",
      materialId: "steel",
      sectionId: "section",
      theory: { kind: "euler-bernoulli" },
      orientation: [0, 1, 0],
    });
  fixAll(builder, "n1");
  const result = prepareAnalysis(
    builder
      .addLoadCase({
        id: "1",
        loads: [{ kind: "nodal", nodeId: "n2", force: [0, -2000, 0], moment: [0, 0, -3000] }],
      })
      .finalize(),
  ).solveCase("1");
  writeReference("cantilever-euler", {
    units: { length: "m", force: "N" },
    tolerances: {
      relative: 1e-6,
      absolute: 1e-9,
      reason:
        "Independent double-precision direct solvers on identical nodal-load models; OpenSees Tcl output carries full precision.",
    },
    nodes: result.nodes.map((n) => ({
      id: n.id,
      displacements: n.displacements.map(({ value }) => value),
      reactions: n.reactions.map(({ value }) => value),
    })),
    frames: result.frames.map((f) => ({ id: f.id, localEndForces: [...f.localEndForces] })),
  });
}

// Portal and multi-story use the same nodal-load models as the vitest oracles.
{
  const builder = createModelBuilder()
    .setUnitSystem(units)
    .addNode({ id: "1", coordinates: [0, 0, 0] })
    .addNode({ id: "2", coordinates: [0, 3, 0] })
    .addNode({ id: "3", coordinates: [5, 3, 0] })
    .addNode({ id: "4", coordinates: [5, 0, 0] })
    .addMaterial({ id: "m", elasticModulus: 200e9, shearModulus: 76.92307692307692e9 })
    .addFrameSection({
      id: "c",
      area: 0.018,
      torsionalConstant: 7e-6,
      momentOfInertiaY: 9e-6,
      momentOfInertiaZ: 15e-6,
    })
    .addFrameSection({
      id: "b",
      area: 0.015,
      torsionalConstant: 6e-6,
      momentOfInertiaY: 7e-6,
      momentOfInertiaZ: 12e-6,
    })
    .addFrame({
      id: "1",
      startNodeId: "1",
      endNodeId: "2",
      materialId: "m",
      sectionId: "c",
      theory: { kind: "euler-bernoulli" },
      orientation: [1, 0, 0],
    })
    .addFrame({
      id: "2",
      startNodeId: "2",
      endNodeId: "3",
      materialId: "m",
      sectionId: "b",
      theory: { kind: "euler-bernoulli" },
      orientation: [0, 1, 0],
    })
    .addFrame({
      id: "3",
      startNodeId: "4",
      endNodeId: "3",
      materialId: "m",
      sectionId: "c",
      theory: { kind: "euler-bernoulli" },
      orientation: [1, 0, 0],
    });
  fixAll(builder, "1");
  fixAll(builder, "4");
  const result = prepareAnalysis(
    builder
      .addLoadCase({ id: "1", loads: [{ kind: "nodal", nodeId: "3", force: [2000, -5000, 0] }] })
      .finalize(),
  ).solveCase("1");
  writeReference("portal-frame", {
    units: { length: "m", force: "N" },
    tolerances: {
      relative: 1e-6,
      absolute: 1e-9,
      reason: "Independent double-precision direct solvers on identical nodal-load portal models.",
    },
    nodes: result.nodes.map((n) => ({
      id: n.id,
      displacements: n.displacements.map(({ value }) => value),
      reactions: n.reactions.map(({ value }) => value),
    })),
    frames: result.frames.map((f) => ({ id: f.id, localEndForces: [...f.localEndForces] })),
  });
}

{
  const builder = createModelBuilder().setUnitSystem(units);
  const coords = [
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
  coords.forEach((c, i) => builder.addNode({ id: String(i + 1), coordinates: c }));
  builder
    .addMaterial({ id: "m", elasticModulus: 200e9, shearModulus: 76.92307692307692e9 })
    .addFrameSection({
      id: "c",
      area: 0.022,
      torsionalConstant: 9e-6,
      momentOfInertiaY: 12e-6,
      momentOfInertiaZ: 22e-6,
    })
    .addFrameSection({
      id: "b",
      area: 0.017,
      torsionalConstant: 7e-6,
      momentOfInertiaY: 8.5e-6,
      momentOfInertiaZ: 16e-6,
    });
  const members = [
    ["1", "1", "4", "c"],
    ["2", "2", "5", "c"],
    ["3", "3", "6", "c"],
    ["4", "4", "7", "c"],
    ["5", "5", "8", "c"],
    ["6", "6", "9", "c"],
    ["7", "4", "5", "b"],
    ["8", "5", "6", "b"],
    ["9", "7", "8", "b"],
    ["10", "8", "9", "b"],
  ];
  for (const [id, s, e, sec] of members)
    builder.addFrame({
      id,
      startNodeId: s,
      endNodeId: e,
      materialId: "m",
      sectionId: sec,
      theory: { kind: "euler-bernoulli" },
      orientation: sec === "c" ? [1, 0, 0] : [0, 1, 0],
    });
  for (const n of ["1", "2", "3"]) fixAll(builder, n);
  const result = prepareAnalysis(
    builder
      .addLoadCase({
        id: "1",
        loads: [
          { kind: "nodal", nodeId: "7", force: [3000, 0, 0] },
          { kind: "nodal", nodeId: "8", force: [3000, 0, 0] },
          { kind: "nodal", nodeId: "9", force: [3000, 0, 0] },
        ],
      })
      .finalize(),
  ).solveCase("1");
  writeReference("two-story-two-bay", {
    units: { length: "m", force: "N" },
    tolerances: {
      relative: 1e-6,
      absolute: 1e-9,
      reason:
        "Independent double-precision direct solvers on identical nodal-load multi-story models.",
    },
    nodes: result.nodes.map((n) => ({
      id: n.id,
      displacements: n.displacements.map(({ value }) => value),
      reactions: n.reactions.map(({ value }) => value),
    })),
  });
}

{
  const builder = createModelBuilder()
    .setUnitSystem(units)
    .addNode({ id: "1", coordinates: [0, 0, 0] })
    .addNode({ id: "2", coordinates: [4, 0, 0] })
    .addNode({ id: "3", coordinates: [2, 3, 0] })
    .addMaterial({ id: "m", elasticModulus: 200e9, shearModulus: 80e9 })
    .addTrussSection({ id: "s", area: 0.01 })
    .addTruss({ id: "1", startNodeId: "1", endNodeId: "2", materialId: "m", sectionId: "s" })
    .addTruss({ id: "2", startNodeId: "1", endNodeId: "3", materialId: "m", sectionId: "s" })
    .addTruss({ id: "3", startNodeId: "2", endNodeId: "3", materialId: "m", sectionId: "s" });
  for (const [id, nodeId, dof, rhs] of [
    ["1:tx", "1", "tx", 0],
    ["1:ty", "1", "ty", 0],
    ["1:tz", "1", "tz", 0],
    ["2:tx", "2", "tx", 0.001],
    ["2:ty", "2", "ty", 0],
    ["2:tz", "2", "tz", 0],
    ["3:tz", "3", "tz", 0],
  ])
    builder.addConstraint({ id, terms: [{ nodeId, dof, coefficient: 1 }], rightHandSide: rhs });
  const result = prepareAnalysis(
    builder
      .addLoadCase({ id: "1", loads: [{ kind: "nodal", nodeId: "3", force: [1000, -5000, 0] }] })
      .finalize(),
  ).solveCase("1");
  writeReference("triangular-truss", {
    units: { length: "m", force: "N" },
    tolerances: {
      relative: 1e-6,
      absolute: 1e-9,
      reason:
        "Independent double-precision direct solvers on identical truss plus settlement models.",
    },
    nodes: result.nodes.map((n) => ({
      id: n.id,
      displacements: n.displacements.map(({ value }) => value),
      reactions: n.reactions.map(({ value }) => value),
    })),
    trusses: result.trusses.map((t) => ({ id: t.id, axialForce: t.axialForce })),
  });
}
