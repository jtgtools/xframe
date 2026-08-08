import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { prepareAnalysis } from "../../src/analysis/prepare-analysis.js";
import { computeFrameLocalStiffness } from "../../src/elements/frame/local-stiffness.js";
import {
  condenseFrameEndReleases,
  frameReleaseMask,
} from "../../src/elements/frame/release-condensation.js";
import { createFrameRigidOffsetTransform } from "../../src/elements/frame/rigid-offset-transform.js";
import type { SymmetricCoordinateMatrix } from "../../src/linalg/symmetric-coordinate-matrix.js";
import type { ResolvedFrameRecord } from "../../src/model/finalized-model.js";
import { createModelBuilder, type ModelBuilder } from "../../src/model/model-builder.js";

interface ReferenceNode {
  readonly id: string;
  readonly displacements: readonly number[];
  readonly reactions: readonly number[];
}

interface ReferenceElement {
  readonly id: string;
  readonly localEndForces: readonly number[];
}

interface ReferenceData {
  readonly oracle: {
    readonly name: "Frame3DD";
    readonly version: string;
    readonly binarySha256: string;
    readonly inputSha256: string;
    readonly note?: string;
  };
  readonly elementStiffness?: readonly (readonly number[])[];
  readonly globalStiffness?: readonly number[];
  readonly nodes: readonly ReferenceNode[];
  readonly elements: readonly ReferenceElement[];
}

const frameUnits = {
  version: "1",
  length: "mm",
  force: "N",
  moment: "N*mm",
  modulus: "N/mm^2",
  distributedForce: "N/mm",
  density: "tonne/mm^3",
  rotation: "rad",
} as const;

const trussUnits = {
  version: "1",
  length: "m",
  force: "N",
  moment: "N*m",
  modulus: "Pa",
  distributedForce: "N/m",
  density: "kg/m^3",
  rotation: "rad",
} as const;

function reference(name: string): ReferenceData {
  return JSON.parse(
    readFileSync(
      join(process.cwd(), `verification/reference-data/frame3dd/${name}/reference.json`),
      "utf8",
    ),
  ) as ReferenceData;
}

function dense(matrix: SymmetricCoordinateMatrix): readonly number[] {
  const values = Array.from({ length: matrix.size ** 2 }, () => 0);
  for (const { row, column, value } of matrix.entries()) {
    values[row * matrix.size + column] = value;
    values[column * matrix.size + row] = value;
  }
  return values;
}

function expectArrayClose(
  actual: ArrayLike<number>,
  expected: ArrayLike<number>,
  relative = 2e-5,
  absolute = 2e-7,
): void {
  expect(actual.length).toBe(expected.length);
  for (let index = 0; index < expected.length; index += 1) {
    const scale = Math.max(Math.abs(expected[index]!), Math.abs(actual[index]!), 1);
    const difference = Math.abs(actual[index]! - expected[index]!);
    const tolerance = absolute + relative * scale;
    if (difference > tolerance) {
      throw new Error(
        `comparison ${index}: actual=${actual[index]} expected=${expected[index]} difference=${difference} tolerance=${tolerance}`,
      );
    }
  }
}

function findNode(data: ReferenceData, id: string): ReferenceNode {
  const node = data.nodes.find((entry) => entry.id === id);
  if (node === undefined) throw new Error(`Missing reference node ${id}.`);
  return node;
}

function frameGlobalStiffness(frame: ResolvedFrameRecord): Float64Array {
  const local = computeFrameLocalStiffness({
    length: frame.geometry.elasticLength,
    elasticModulus: frame.material.elasticModulus,
    shearModulus: frame.material.shearModulus,
    area: frame.section.area,
    torsionalConstant: frame.section.torsionalConstant,
    momentOfInertiaY: frame.section.momentOfInertiaY,
    momentOfInertiaZ: frame.section.momentOfInertiaZ,
    theory: frame.record.theory,
    ...(frame.section.shearAreaY === undefined ? {} : { shearAreaY: frame.section.shearAreaY }),
    ...(frame.section.shearAreaZ === undefined ? {} : { shearAreaZ: frame.section.shearAreaZ }),
  });
  const condensed = condenseFrameEndReleases(
    local,
    new Float64Array(12),
    frameReleaseMask(frame.record.releases),
  );
  return createFrameRigidOffsetTransform(
    frame.axes.globalToLocal,
    frame.geometry.startOffset,
    frame.geometry.endOffset,
  ).stiffnessToGlobal(condensed.stiffness);
}

function fixNode(builder: ModelBuilder, nodeId: string): void {
  for (const dof of ["tx", "ty", "tz", "rx", "ry", "rz"] as const) {
    builder.addConstraint({
      id: `fixed:${nodeId}:${dof}`,
      terms: [{ nodeId, dof, coefficient: 1 }],
      rightHandSide: 0,
    });
  }
}

function portalModel() {
  const builder = createModelBuilder()
    .setUnitSystem(frameUnits)
    .addNode({ id: "1", coordinates: [0, 0, 0] })
    .addNode({ id: "2", coordinates: [0, 3000, 0] })
    .addNode({ id: "3", coordinates: [5000, 3000, 0] })
    .addNode({ id: "4", coordinates: [5000, 0, 0] })
    .addMaterial({
      id: "m",
      elasticModulus: 210000,
      shearModulus: 80769.23076923077,
      density: 7.85e-9,
    })
    .addFrameSection({
      id: "c",
      area: 1800,
      shearAreaY: 1200,
      shearAreaZ: 1100,
      torsionalConstant: 700000,
      momentOfInertiaY: 9000000,
      momentOfInertiaZ: 15000000,
    })
    .addFrameSection({
      id: "b",
      area: 1500,
      shearAreaY: 1000,
      shearAreaZ: 900,
      torsionalConstant: 600000,
      momentOfInertiaY: 7000000,
      momentOfInertiaZ: 12000000,
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
  fixNode(builder, "1");
  fixNode(builder, "4");
  return builder.finalize();
}

function twoStoryModel() {
  const builder = createModelBuilder().setUnitSystem(frameUnits);
  const coordinates = [
    [0, 0, 0],
    [4000, 0, 0],
    [8000, 0, 0],
    [0, 3000, 0],
    [4000, 3000, 0],
    [8000, 3000, 0],
    [0, 6000, 0],
    [4000, 6000, 0],
    [8000, 6000, 0],
  ] as const;
  coordinates.forEach((entry, index) =>
    builder.addNode({ id: String(index + 1), coordinates: entry }),
  );
  builder
    .addMaterial({
      id: "m",
      elasticModulus: 210000,
      shearModulus: 80769.23076923077,
      density: 7.85e-9,
    })
    .addFrameSection({
      id: "c",
      area: 2200,
      shearAreaY: 1500,
      shearAreaZ: 1400,
      torsionalConstant: 900000,
      momentOfInertiaY: 12000000,
      momentOfInertiaZ: 22000000,
    })
    .addFrameSection({
      id: "b",
      area: 1700,
      shearAreaY: 1150,
      shearAreaZ: 1050,
      torsionalConstant: 700000,
      momentOfInertiaY: 8500000,
      momentOfInertiaZ: 16000000,
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
  for (const [id, startNodeId, endNodeId, sectionId] of members) {
    builder.addFrame({
      id,
      startNodeId,
      endNodeId,
      materialId: "m",
      sectionId,
      theory: { kind: "euler-bernoulli" },
      orientation: sectionId === "c" ? [1, 0, 0] : [0, 1, 0],
    });
  }
  for (const nodeId of ["1", "2", "3"]) fixNode(builder, nodeId);
  return builder.finalize();
}

function expectModelStiffnessMatchesReference(
  model: ReturnType<typeof portalModel>,
  data: ReferenceData,
): void {
  if (data.elementStiffness === undefined || data.globalStiffness === undefined) {
    throw new Error("Frame3DD reference is missing stiffness matrices.");
  }
  expect(model.resolvedFrames.length).toBe(data.elementStiffness.length);
  model.resolvedFrames.forEach((frame) => {
    const referenceIndex = Number(frame.record.id) - 1;
    expectArrayClose(
      frameGlobalStiffness(frame),
      data.elementStiffness![referenceIndex]!,
      2e-7,
      1e-8,
    );
  });
  expectArrayClose(dense(prepareAnalysis(model).fullStiffness), data.globalStiffness, 2e-7, 1e-8);
}
function findElement(data: ReferenceData, id: string): ReferenceElement {
  const element = data.elements.find((entry) => entry.id === id);
  if (element === undefined) throw new Error(`Missing reference element ${id}.`);
  return element;
}

describe("Frame3DD multi-member assembly oracle", () => {
  it("VER-F3D-002: directly matches two element matrices, the assembled 18x18 matrix, and solved response", () => {
    const data = reference("frame-chain-euler");
    const builder = createModelBuilder()
      .setUnitSystem(frameUnits)
      .addNode({ id: "1", coordinates: [0, 0, 0] })
      .addNode({ id: "2", coordinates: [3000, 0, 0] })
      .addNode({ id: "3", coordinates: [5000, 0, 0] })
      .addMaterial({
        id: "m1",
        elasticModulus: 210000,
        shearModulus: 80769.23076923077,
        density: 7.85e-9,
      })
      .addMaterial({
        id: "m2",
        elasticModulus: 70000,
        shearModulus: 26923.07692307692,
        density: 2.7e-9,
      })
      .addFrameSection({
        id: "s1",
        area: 1200,
        shearAreaY: 800,
        shearAreaZ: 700,
        torsionalConstant: 500000,
        momentOfInertiaY: 8000000,
        momentOfInertiaZ: 6000000,
      })
      .addFrameSection({
        id: "s2",
        area: 900,
        shearAreaY: 600,
        shearAreaZ: 500,
        torsionalConstant: 300000,
        momentOfInertiaY: 5000000,
        momentOfInertiaZ: 4000000,
      })
      .addFrame({
        id: "1",
        startNodeId: "1",
        endNodeId: "2",
        materialId: "m1",
        sectionId: "s1",
        theory: { kind: "euler-bernoulli" },
        orientation: [0, 1, 0],
      })
      .addFrame({
        id: "2",
        startNodeId: "2",
        endNodeId: "3",
        materialId: "m2",
        sectionId: "s2",
        theory: { kind: "euler-bernoulli" },
        orientation: [0, 1, 0],
      });
    for (const dof of ["tx", "ty", "tz", "rx", "ry", "rz"] as const) {
      builder.addConstraint({
        id: `fixed:${dof}`,
        terms: [{ nodeId: "1", dof, coefficient: 1 }],
        rightHandSide: 0,
      });
    }
    const model = builder
      .addLoadCase({
        id: "1",
        loads: [
          {
            kind: "nodal",
            nodeId: "3",
            force: [1000, -2000, 1500],
            moment: [100000, 200000, -300000],
          },
          {
            kind: "member-distributed",
            frameId: "2",
            coordinateSystem: "local",
            startIntensity: [0.1, -0.2, 0.3],
            endIntensity: [0.1, -0.2, 0.3],
          },
        ],
      })
      .finalize();
    const prepared = prepareAnalysis(model);
    const result = prepared.solveCase("1");
    const expectedMatrices = data.elementStiffness;
    expect(result.nodes).toHaveLength(data.nodes.length);
    if (expectedMatrices === undefined || data.globalStiffness === undefined) {
      throw new Error("Frame-chain reference is missing stiffness matrices.");
    }
    const actualMatrices = [
      computeFrameLocalStiffness({
        length: 3000,
        elasticModulus: 210000,
        shearModulus: 80769.23076923077,
        area: 1200,
        torsionalConstant: 500000,
        momentOfInertiaY: 8000000,
        momentOfInertiaZ: 6000000,
        theory: { kind: "euler-bernoulli" },
      }),
      computeFrameLocalStiffness({
        length: 2000,
        elasticModulus: 70000,
        shearModulus: 26923.07692307692,
        area: 900,
        torsionalConstant: 300000,
        momentOfInertiaY: 5000000,
        momentOfInertiaZ: 4000000,
        theory: { kind: "euler-bernoulli" },
      }),
    ];
    expectArrayClose(actualMatrices[0]!, expectedMatrices[0]!, 2e-7, 1e-8);
    expectArrayClose(actualMatrices[1]!, expectedMatrices[1]!, 2e-7, 1e-8);
    expectArrayClose(dense(prepared.fullStiffness), data.globalStiffness, 2e-7, 1e-8);

    for (const node of result.nodes) {
      const expected = findNode(data, node.id);
      expectArrayClose(
        node.displacements.map(({ value }) => value),
        expected.displacements,
      );
      expectArrayClose(
        node.reactions.map(({ value }) => value),
        expected.reactions,
      );
    }
    for (const frame of result.frames) {
      expectArrayClose(frame.localEndForces, findElement(data, frame.id).localEndForces);
    }
  });
});

describe("Frame3DD expanded stiffness oracle", () => {
  it("VER-F3D-004: directly matches all portal element matrices and the assembled 24x24 matrix", () => {
    const data = reference("portal-frame-euler");
    expect(data.elementStiffness).toBeDefined();
    expectModelStiffnessMatchesReference(portalModel(), data);
  });

  it("VER-F3D-005: directly matches all two-story element matrices and the assembled 54x54 matrix", () => {
    const data = reference("two-story-two-bay-euler");
    expect(data.elementStiffness).toBeDefined();
    expectModelStiffnessMatchesReference(twoStoryModel(), data);
  });
});

describe("Frame3DD truss approximation oracle", () => {
  it("VER-F3D-003: matches a triangular truss with a support settlement", () => {
    const data = reference("triangular-truss");
    const builder = createModelBuilder()
      .setUnitSystem(trussUnits)
      .addNode({ id: "1", coordinates: [0, 0, 0] })
      .addNode({ id: "2", coordinates: [4, 0, 0] })
      .addNode({ id: "3", coordinates: [2, 3, 0] })
      .addMaterial({ id: "m", elasticModulus: 200e9, shearModulus: 80e9 })
      .addTrussSection({ id: "s", area: 0.01 })
      .addTruss({ id: "1", startNodeId: "1", endNodeId: "2", materialId: "m", sectionId: "s" })
      .addTruss({ id: "2", startNodeId: "1", endNodeId: "3", materialId: "m", sectionId: "s" })
      .addTruss({ id: "3", startNodeId: "2", endNodeId: "3", materialId: "m", sectionId: "s" });
    const constraints = [
      ["1:tx", "1", "tx", 0],
      ["1:ty", "1", "ty", 0],
      ["1:tz", "1", "tz", 0],
      ["2:tx", "2", "tx", 0.001],
      ["2:ty", "2", "ty", 0],
      ["2:tz", "2", "tz", 0],
      ["3:tz", "3", "tz", 0],
    ] as const;
    for (const [id, nodeId, dof, rightHandSide] of constraints) {
      builder.addConstraint({ id, terms: [{ nodeId, dof, coefficient: 1 }], rightHandSide });
    }
    const result = prepareAnalysis(
      builder
        .addLoadCase({ id: "1", loads: [{ kind: "nodal", nodeId: "3", force: [1000, -5000, 0] }] })
        .finalize(),
    ).solveCase("1");
    expect(result.nodes).toHaveLength(data.nodes.length);

    for (const node of result.nodes) {
      const expected = findNode(data, node.id);
      expectArrayClose(
        node.displacements.map(({ value }) => value),
        expected.displacements.slice(0, 3),
        2e-5,
        7e-7,
      );
      expectArrayClose(
        node.reactions.map(({ value }) => value),
        expected.reactions.slice(0, 3),
        2e-5,
        2e-3,
      );
    }
    for (const truss of result.trusses) {
      const expected = findElement(data, truss.id);
      expectArrayClose([truss.axialForce], [expected.localEndForces[6]!], 2e-5, 2e-3);
    }
  });
});
