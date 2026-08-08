import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { prepareAnalysis } from "../../src/analysis/prepare-analysis.js";
import { computeFrameLocalStiffness } from "../../src/elements/frame/local-stiffness.js";
import type { FrameTheoryInput, LoadCaseInput } from "../../src/model/domain-records.js";
import { createModelBuilder, type ModelBuilder } from "../../src/model/model-builder.js";
import type { SymmetricCoordinateMatrix } from "../../src/linalg/symmetric-coordinate-matrix.js";

interface ReferenceCase {
  readonly id: string;
  readonly nodeDisplacements: readonly (readonly number[])[];
  readonly localEndForces: readonly number[];
  readonly reactions: readonly (readonly number[])[];
}

interface Frame3ddReference {
  readonly oracle: {
    readonly name: "Frame3DD";
    readonly version: string;
    readonly binarySha256: string;
    readonly inputSha256: string;
    readonly shearDeformation: boolean;
  };
  readonly elementStiffness: readonly number[];
  readonly globalStiffness: readonly number[];
  readonly cases: readonly ReferenceCase[];
}

const units = {
  version: "1",
  length: "mm",
  force: "N",
  moment: "N*mm",
  modulus: "N/mm^2",
  distributedForce: "N/mm",
  density: "tonne/mm^3",
  rotation: "rad",
} as const;

function readReference(kind: "euler" | "timoshenko"): Frame3ddReference {
  return JSON.parse(
    readFileSync(
      join(process.cwd(), `verification/reference-data/frame3dd/cantilever-${kind}/reference.json`),
      "utf8",
    ),
  ) as Frame3ddReference;
}

function baseBuilder(theory: FrameTheoryInput): ModelBuilder {
  return createModelBuilder()
    .setUnitSystem(units)
    .addNode({ id: "n1", coordinates: [0, 0, 0] })
    .addNode({ id: "n2", coordinates: [3000, 0, 0] })
    .addMaterial({
      id: "steel",
      elasticModulus: 210000,
      shearModulus: 80769.23076923077,
      density: 7.85e-9,
    })
    .addFrameSection({
      id: "section",
      area: 1200,
      shearAreaY: 800,
      shearAreaZ: 700,
      torsionalConstant: 500000,
      momentOfInertiaY: 8000000,
      momentOfInertiaZ: 6000000,
    })
    .addFrame({
      id: "frame",
      startNodeId: "n1",
      endNodeId: "n2",
      materialId: "steel",
      sectionId: "section",
      theory,
      orientation: [0, 1, 0],
    });
}

function fixedBuilder(theory: FrameTheoryInput): ModelBuilder {
  const builder = baseBuilder(theory);
  for (const dof of ["tx", "ty", "tz", "rx", "ry", "rz"] as const) {
    builder.addConstraint({
      id: `fixed:${dof}`,
      terms: [{ nodeId: "n1", dof, coefficient: 1 }],
      rightHandSide: 0,
    });
  }
  const cases: readonly LoadCaseInput[] = [
    {
      id: "1",
      loads: [
        {
          kind: "nodal",
          nodeId: "n2",
          force: [1000, -2000, 1500],
          moment: [100000, 200000, -300000],
        },
      ],
    },
    {
      id: "2",
      loads: [
        {
          kind: "member-distributed",
          frameId: "frame",
          coordinateSystem: "local",
          startIntensity: [0.2, -0.5, 0.3],
          endIntensity: [0.2, -0.5, 0.3],
        },
      ],
    },
    {
      id: "3",
      loads: [
        {
          kind: "member-distributed",
          frameId: "frame",
          coordinateSystem: "local",
          startDistanceFromElasticStart: 300,
          endDistanceFromElasticStart: 1700,
          startIntensity: [0.05, 0, 0],
          endIntensity: [0.15, 0, 0],
        },
        {
          kind: "member-distributed",
          frameId: "frame",
          coordinateSystem: "local",
          startDistanceFromElasticStart: 400,
          endDistanceFromElasticStart: 2200,
          startIntensity: [0, -0.1, 0],
          endIntensity: [0, -0.6, 0],
        },
        {
          kind: "member-distributed",
          frameId: "frame",
          coordinateSystem: "local",
          startDistanceFromElasticStart: 800,
          endDistanceFromElasticStart: 2600,
          startIntensity: [0, 0, 0.2],
          endIntensity: [0, 0, -0.2],
        },
      ],
    },
    {
      id: "4",
      loads: [
        {
          kind: "member-point-force",
          frameId: "frame",
          coordinateSystem: "local",
          distanceFromElasticStart: 1200,
          force: [100, -200, 300],
        },
      ],
    },
    { id: "5", loads: [{ kind: "self-weight", gravity: [0, -9806.65, 0], frameIds: ["frame"] }] },
  ];
  for (const loadCase of cases) builder.addLoadCase(loadCase);
  return builder;
}

function prescribedBuilder(theory: FrameTheoryInput): ModelBuilder {
  const builder = baseBuilder(theory);
  const values = [0.2, -0.1, 0.05, 0.0001, -0.0002, 0.0003] as const;
  for (const [index, dof] of (["tx", "ty", "tz", "rx", "ry", "rz"] as const).entries()) {
    builder.addConstraint({
      id: `prescribed:${dof}`,
      terms: [{ nodeId: "n1", dof, coefficient: 1 }],
      rightHandSide: values[index]!,
    });
  }
  return builder.addLoadCase({ id: "6" });
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
    if (difference > tolerance)
      throw new Error(
        `comparison ${index}: actual=${actual[index]} expected=${expected[index]} difference=${difference} tolerance=${tolerance}`,
      );
  }
}

function runOracle(kind: "euler" | "timoshenko", theory: FrameTheoryInput): void {
  const reference = readReference(kind);
  const fixed = fixedBuilder(theory).finalize();
  const prepared = prepareAnalysis(fixed);
  const section = fixed.frameSections[0]!;
  const material = fixed.materials[0]!;
  const local = computeFrameLocalStiffness({
    length: 3000,
    elasticModulus: material.elasticModulus,
    shearModulus: material.shearModulus,
    area: section.area,
    torsionalConstant: section.torsionalConstant,
    momentOfInertiaY: section.momentOfInertiaY,
    momentOfInertiaZ: section.momentOfInertiaZ,
    ...(section.shearAreaY === undefined ? {} : { shearAreaY: section.shearAreaY }),
    ...(section.shearAreaZ === undefined ? {} : { shearAreaZ: section.shearAreaZ }),
    theory,
  });

  it(`${kind}: directly matches Frame3DD element and global stiffness matrices`, () => {
    expect(reference.oracle.name).toBe("Frame3DD");
    expect(reference.oracle.binarySha256).toBe(
      "53b1dc6628424b156e491e3205f13d58a0e325e33e4746d225b456ab85ac5275",
    );
    expectArrayClose(local, reference.elementStiffness, 2e-7, 1e-8);
    expectArrayClose(dense(prepared.fullStiffness), reference.globalStiffness, 2e-7, 1e-8);
  });

  for (const expectedCase of reference.cases.slice(0, 5)) {
    it(`${kind}: matches Frame3DD load case ${expectedCase.id}`, () => {
      const result = prepared.solveCase(expectedCase.id);
      const actualNodes = result.nodes.map((node) => node.displacements.map(({ value }) => value));
      const reactions = result.nodes.map((node) => node.reactions.map(({ value }) => value));
      expectArrayClose(actualNodes[0]!, expectedCase.nodeDisplacements[0]!);
      expectArrayClose(result.frames[0]!.localEndForces, expectedCase.localEndForces);
      expectArrayClose(reactions[0]!, expectedCase.reactions[0]!);
      expectArrayClose(reactions[1]!, expectedCase.reactions[1]!);

      if (expectedCase.id !== "4") {
        expectArrayClose(actualNodes[1]!, expectedCase.nodeDisplacements[1]!);
        return;
      }

      const tip = actualNodes[1]!;
      const axialExpected = (100 * 1200) / (210000 * 1200);
      expect(tip[0]).toBeCloseTo(axialExpected, 14);
      const expectedTip =
        kind === "euler"
          ? {
              actual: tip.slice(1),
              expected: expectedCase.nodeDisplacements[1]!.slice(1),
              relative: 2e-5,
              absolute: 2e-7,
            }
          : {
              actual: [tip[1]!, tip[2]!, tip[4]!, tip[5]!],
              expected: [
                (-200 * 1200 ** 2 * (3 * 3000 - 1200)) / (6 * 210000 * 6000000) +
                  (-200 * 1200) / (80769.23076923077 * 800),
                (300 * 1200 ** 2 * (3 * 3000 - 1200)) / (6 * 210000 * 8000000) +
                  (300 * 1200) / (80769.23076923077 * 700),
                (-300 * 1200 ** 2) / (2 * 210000 * 8000000),
                (-200 * 1200 ** 2) / (2 * 210000 * 6000000),
              ],
              relative: 0,
              absolute: 0.5e-13,
            };
      expectArrayClose(
        expectedTip.actual,
        expectedTip.expected,
        expectedTip.relative,
        expectedTip.absolute,
      );
      expect(expectedCase.nodeDisplacements[1]![0]).not.toBeCloseTo(axialExpected, 5);
    });
  }

  it(`${kind}: matches Frame3DD prescribed-displacement rigid-body case`, () => {
    const result = prepareAnalysis(prescribedBuilder(theory).finalize()).solveCase("6");
    const expectedCase = reference.cases[5]!;
    const actualNodes = result.nodes.map((node) => node.displacements.map(({ value }) => value));
    expect(actualNodes).toHaveLength(expectedCase.nodeDisplacements.length);
    expectArrayClose(actualNodes[0]!, expectedCase.nodeDisplacements[0]!);
    expectArrayClose(actualNodes[1]!, expectedCase.nodeDisplacements[1]!);
    expectArrayClose(result.frames[0]!.localEndForces, expectedCase.localEndForces);
  });
}

describe("Frame3DD cantilever oracle", () => {
  runOracle("euler", { kind: "euler-bernoulli" });
  runOracle("timoshenko", { kind: "timoshenko" });
});
