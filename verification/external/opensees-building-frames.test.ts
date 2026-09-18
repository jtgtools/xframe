import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { prepareAnalysis } from "../../src/analysis/prepare-analysis.js";
import { createModelBuilder } from "../../src/model/model-builder.js";

const OPENSEES_ORACLE = {
  name: "OpenSees",
  version: "3.8.0",
  commit: "6e55293513192aa05c7e1205e66a5a1a1ed088c4",
  binarySha256: "5aa4e9c80c410c510ca62ac3b2f1d64a8e50679f0238e140b5bebcd6d5ddbe6d",
} as const;

interface BuildingReference {
  readonly oracle: {
    readonly name: "OpenSees";
    readonly version: "3.8.0";
    readonly commit: string;
    readonly binarySha256: string;
    readonly inputSha256: string;
    readonly command: readonly [string, string];
  };
  readonly units: { readonly length: string; readonly force: string };
  readonly tolerances: { readonly relative: number; readonly absolute: number };
  readonly nodes: readonly {
    readonly id: string;
    readonly displacements: readonly number[];
    readonly reactions: readonly number[];
  }[];
  readonly frames?: readonly {
    readonly id: string;
    readonly localEndForces: readonly number[];
  }[];
  readonly trusses?: readonly { readonly id: string; readonly axialForce: number }[];
}

function readBuildingReference(name: string): {
  readonly tcl: string;
  readonly reference: BuildingReference;
} {
  const tclPath = join(process.cwd(), `verification/reference-data/opensees/${name}.tcl`);
  const referencePath = join(
    process.cwd(),
    `verification/reference-data/opensees/${name}-reference.json`,
  );
  expect(existsSync(tclPath), `missing OpenSees Tcl input ${name}.tcl`).toBe(true);
  expect(existsSync(referencePath), `missing OpenSees reference ${name}-reference.json`).toBe(true);
  const tcl = readFileSync(tclPath, "utf8");
  const reference = JSON.parse(readFileSync(referencePath, "utf8")) as BuildingReference;
  return { tcl, reference };
}

function checkOracle(name: string): BuildingReference {
  const { tcl, reference } = readBuildingReference(name);
  expect(reference.oracle.name).toBe(OPENSEES_ORACLE.name);
  expect(reference.oracle.version).toBe(OPENSEES_ORACLE.version);
  expect(reference.oracle.commit).toBe(OPENSEES_ORACLE.commit);
  expect(reference.oracle.binarySha256).toBe(OPENSEES_ORACLE.binarySha256);
  expect(reference.oracle.command).toEqual(["OPENSEES_BIN", `${name}.tcl`]);
  // Normalize CRLF so Windows checkouts hash identically to LF blobs.
  const normalized = tcl.replace(/\r\n/gu, "\n");
  expect(reference.oracle.inputSha256).toBe(createHash("sha256").update(normalized).digest("hex"));
  return reference;
}

function expectArrayClose(
  actual: ArrayLike<number>,
  expected: ArrayLike<number>,
  relative: number,
  absolute: number,
): void {
  expect(actual.length).toBe(expected.length);
  for (let index = 0; index < expected.length; index += 1) {
    const limit =
      absolute + relative * Math.max(Math.abs(expected[index]!), Math.abs(actual[index]!));
    if (Math.abs(actual[index]! - expected[index]!) > limit)
      throw new Error(
        `comparison ${index}: actual=${actual[index]} expected=${expected[index]} limit=${limit}`,
      );
  }
}

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

function fixAll(builder: ReturnType<typeof createModelBuilder>, nodeId: string): void {
  for (const dof of ["tx", "ty", "tz", "rx", "ry", "rz"] as const)
    builder.addConstraint({
      id: `fixed:${nodeId}:${dof}`,
      terms: [{ nodeId, dof, coefficient: 1 }],
      rightHandSide: 0,
    });
}

function cantileverModel() {
  return createModelBuilder()
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
}

function portalModel() {
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
  return builder;
}

function twoStoryModel() {
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
  coords.forEach((c, i) => builder.addNode({ id: String(i + 1), coordinates: [...c] }));
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
  ] as const;
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
  return builder;
}

describe("OpenSees building-frame oracles", () => {
  it("cantilever matches the committed OpenSees portal-grade oracle", () => {
    const reference = checkOracle("cantilever-euler");
    const builder = cantileverModel();
    fixAll(builder, "n1");
    const result = prepareAnalysis(
      builder
        .addLoadCase({
          id: "1",
          loads: [{ kind: "nodal", nodeId: "n2", force: [0, -2000, 0], moment: [0, 0, -3000] }],
        })
        .finalize(),
    ).solveCase("1");
    for (const node of result.nodes) {
      const expected = reference.nodes.find((n) => n.id === node.id)!;
      expect(expected, `missing node ${node.id} in oracle`).toBeDefined();
      expectArrayClose(
        node.displacements.map(({ value }) => value),
        expected.displacements,
        reference.tolerances.relative,
        reference.tolerances.absolute,
      );
      expectArrayClose(
        node.reactions.map(({ value }) => value),
        expected.reactions,
        reference.tolerances.relative,
        reference.tolerances.absolute,
      );
    }
    for (const frame of result.frames) {
      const expected = reference.frames!.find((f) => f.id === frame.id)!;
      expectArrayClose(
        frame.localEndForces,
        expected.localEndForces,
        reference.tolerances.relative,
        reference.tolerances.absolute,
      );
    }
  });

  it("single-bay portal matches the committed OpenSees oracle", () => {
    const reference = checkOracle("portal-frame");
    const result = prepareAnalysis(
      portalModel()
        .addLoadCase({ id: "1", loads: [{ kind: "nodal", nodeId: "3", force: [2000, -5000, 0] }] })
        .finalize(),
    ).solveCase("1");
    for (const node of result.nodes) {
      const expected = reference.nodes.find((n) => n.id === node.id)!;
      expect(expected).toBeDefined();
      expectArrayClose(
        node.displacements.map(({ value }) => value),
        expected.displacements,
        reference.tolerances.relative,
        reference.tolerances.absolute,
      );
      expectArrayClose(
        node.reactions.map(({ value }) => value),
        expected.reactions,
        reference.tolerances.relative,
        reference.tolerances.absolute,
      );
    }
    for (const frame of result.frames) {
      const expected = reference.frames!.find((f) => f.id === frame.id)!;
      expectArrayClose(
        frame.localEndForces,
        expected.localEndForces,
        reference.tolerances.relative,
        reference.tolerances.absolute,
      );
    }
  });

  it("two-story two-bay frame matches the committed OpenSees oracle", () => {
    const reference = checkOracle("two-story-two-bay");
    const result = prepareAnalysis(
      twoStoryModel()
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
    for (const node of result.nodes) {
      const expected = reference.nodes.find((n) => n.id === node.id)!;
      expect(expected).toBeDefined();
      expectArrayClose(
        node.displacements.map(({ value }) => value),
        expected.displacements,
        reference.tolerances.relative,
        reference.tolerances.absolute,
      );
      expectArrayClose(
        node.reactions.map(({ value }) => value),
        expected.reactions,
        reference.tolerances.relative,
        reference.tolerances.absolute,
      );
    }
  });

  it("triangular truss with settlement matches the committed OpenSees oracle", () => {
    const reference = checkOracle("triangular-truss");
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
    ] as const)
      builder.addConstraint({
        id,
        terms: [{ nodeId, dof, coefficient: 1 }],
        rightHandSide: rhs,
      });
    const result = prepareAnalysis(
      builder
        .addLoadCase({ id: "1", loads: [{ kind: "nodal", nodeId: "3", force: [1000, -5000, 0] }] })
        .finalize(),
    ).solveCase("1");
    for (const node of result.nodes) {
      const expected = reference.nodes.find((n) => n.id === node.id)!;
      expect(expected).toBeDefined();
      expectArrayClose(
        node.displacements.map(({ value }) => value).slice(0, 3),
        expected.displacements.slice(0, 3),
        reference.tolerances.relative,
        reference.tolerances.absolute,
      );
    }
    for (const truss of result.trusses) {
      const expected = reference.trusses!.find((t) => t.id === truss.id)!;
      expect(Math.abs(truss.axialForce - expected.axialForce)).toBeLessThanOrEqual(
        reference.tolerances.absolute +
          reference.tolerances.relative *
            Math.max(Math.abs(truss.axialForce), Math.abs(expected.axialForce)),
      );
    }
  });
});
