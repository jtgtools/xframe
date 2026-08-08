import { readFileSync } from "node:fs";
import {
  XFrameError,
  createModelBuilder,
  prepareAnalysis,
  type CaseResult,
  type ModelBuilder,
} from "../../src/index.js";
import {
  allDofs,
  constrain,
  displacement,
  frameEndForce,
  imperialUnits,
  matrixSymmetryError,
  reaction,
  siUnits,
  solve,
  validationCase,
  value,
} from "./validation-support.js";

const E = 210e9;
const G = 80e9;
const A = 0.02;
const I = 7e-5;
const J = 2e-5;

interface Frame3ddReference {
  readonly nodes: readonly {
    readonly id: string;
    readonly displacements: readonly number[];
    readonly reactions: readonly number[];
  }[];
  readonly elements: readonly {
    readonly id: string;
    readonly localEndForces: readonly number[];
  }[];
}

function fixed(builder: ModelBuilder, nodeId: string): void {
  constrain(builder, nodeId, allDofs);
}

function portalBuilder(
  loads: readonly {
    readonly nodeId: string;
    readonly force: readonly [number, number, number];
  }[],
): ModelBuilder {
  let builder = createModelBuilder()
    .setUnitSystem({
      version: "1",
      length: "mm",
      force: "N",
      moment: "N*mm",
      modulus: "N/mm^2",
      distributedForce: "N/mm",
      density: "tonne/mm^3",
      rotation: "rad",
    })
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
  fixed(builder, "1");
  fixed(builder, "4");
  builder = builder.addLoadCase({
    id: "LC",
    loads: loads.map(({ nodeId, force }) => ({ kind: "nodal" as const, nodeId, force })),
  });
  return builder;
}

function node(result: CaseResult, id: string) {
  const output = result.nodes.find((entry) => entry.id === id);
  if (output === undefined) throw new Error(`Missing node ${id}.`);
  return output;
}

function rotateZ90(vector: readonly [number, number, number]): readonly [number, number, number] {
  return [-vector[1], vector[0], vector[2]];
}

function lFrame(rotated: boolean): CaseResult {
  const coordinates = {
    a: [0, 0, 0] as const,
    b: [4, 0, 0] as const,
    c: [4, 3, 2] as const,
  };
  const transform = (vector: readonly [number, number, number]) =>
    rotated ? rotateZ90(vector) : vector;
  let builder = createModelBuilder()
    .setUnitSystem(siUnits)
    .addNode({ id: "a", coordinates: transform(coordinates.a) })
    .addNode({ id: "b", coordinates: transform(coordinates.b) })
    .addNode({ id: "c", coordinates: transform(coordinates.c) })
    .addMaterial({ id: "m", elasticModulus: E, shearModulus: G })
    .addFrameSection({
      id: "s",
      area: A,
      torsionalConstant: J,
      momentOfInertiaY: I,
      momentOfInertiaZ: 1.4 * I,
    })
    .addFrame({
      id: "ab",
      startNodeId: "a",
      endNodeId: "b",
      materialId: "m",
      sectionId: "s",
      theory: { kind: "euler-bernoulli" },
      orientation: transform([0, 1, 0]),
    })
    .addFrame({
      id: "bc",
      startNodeId: "b",
      endNodeId: "c",
      materialId: "m",
      sectionId: "s",
      theory: { kind: "euler-bernoulli" },
      orientation: transform([0, 0, 1]),
    });
  fixed(builder, "a");
  const force = transform([4200, -7300, 5100]);
  const moment = transform([900, -1200, 1600]);
  builder = builder.addLoadCase({
    id: "LC",
    loads: [{ kind: "nodal", nodeId: "c", force, moment }],
  });
  return solve(builder);
}

function symmetricPortal(): ModelBuilder {
  let builder = createModelBuilder()
    .setUnitSystem(siUnits)
    .addNode({ id: "a", coordinates: [0, 0, 0] })
    .addNode({ id: "b", coordinates: [0, 3, 0] })
    .addNode({ id: "c", coordinates: [5, 3, 0] })
    .addNode({ id: "d", coordinates: [5, 0, 0] })
    .addMaterial({ id: "m", elasticModulus: E, shearModulus: G })
    .addFrameSection({
      id: "s",
      area: A,
      torsionalConstant: J,
      momentOfInertiaY: I,
      momentOfInertiaZ: I,
    })
    .addFrame({
      id: "ab",
      startNodeId: "a",
      endNodeId: "b",
      materialId: "m",
      sectionId: "s",
      theory: { kind: "euler-bernoulli" },
      orientation: [1, 0, 0],
    })
    .addFrame({
      id: "bc",
      startNodeId: "b",
      endNodeId: "c",
      materialId: "m",
      sectionId: "s",
      theory: { kind: "euler-bernoulli" },
      orientation: [0, 1, 0],
    })
    .addFrame({
      id: "dc",
      startNodeId: "d",
      endNodeId: "c",
      materialId: "m",
      sectionId: "s",
      theory: { kind: "euler-bernoulli" },
      orientation: [1, 0, 0],
    });
  fixed(builder, "a");
  fixed(builder, "d");
  return builder
    .addLoadCase({
      id: "S",
      loads: [
        { kind: "nodal", nodeId: "b", force: [0, -8000, 0] },
        { kind: "nodal", nodeId: "c", force: [0, -8000, 0] },
      ],
    })
    .addLoadCase({
      id: "A",
      loads: [
        { kind: "nodal", nodeId: "b", force: [0, -8000, 0] },
        { kind: "nodal", nodeId: "c", force: [0, 8000, 0] },
      ],
    });
}

function cantileverSegments(count: number): CaseResult {
  let builder = createModelBuilder()
    .setUnitSystem(siUnits)
    .addMaterial({ id: "m", elasticModulus: E, shearModulus: G })
    .addFrameSection({
      id: "s",
      area: A,
      torsionalConstant: J,
      momentOfInertiaY: I,
      momentOfInertiaZ: I,
    });
  const length = 6;
  for (let index = 0; index <= count; index += 1)
    builder = builder.addNode({ id: `n${index}`, coordinates: [(length * index) / count, 0, 0] });
  for (let index = 0; index < count; index += 1)
    builder = builder.addFrame({
      id: `f${index}`,
      startNodeId: `n${index}`,
      endNodeId: `n${index + 1}`,
      materialId: "m",
      sectionId: "s",
      theory: { kind: "euler-bernoulli" },
      orientation: [0, 1, 0],
    });
  fixed(builder, "n0");
  return solve(
    builder.addLoadCase({
      id: "LC",
      loads: [{ kind: "nodal", nodeId: `n${count}`, force: [0, -15000, 0] }],
    }),
  );
}

const multiSystemCases = [
  validationCase(
    {
      id: "VAL-10-001",
      category: 10,
      description:
        "Single-bay portal frame matches Frame3DD displacements, reactions, and member end forces",
      model: "Four-node 3D portal in N-mm units with two columns and one beam.",
      supports: "Both column bases fixed.",
      loads:
        "Combined lateral, vertical, and out-of-plane nodal forces at both beam-column joints.",
      referenceMethod: "commercial software",
      tolerancePercent: 0.01,
      toleranceReason:
        "Frame3DD text output is printed to about six significant decimal digits; 0.01% remains tighter than the requested commercial-software range.",
      frame3ddCoverage: "direct",
    },
    () => {
      const reference = JSON.parse(
        readFileSync(
          "verification/reference-data/frame3dd/portal-frame-euler/reference.json",
          "utf8",
        ),
      ) as Frame3ddReference;
      const actual = solve(
        portalBuilder([
          { nodeId: "2", force: [10000, -5000, 2500] },
          { nodeId: "3", force: [10000, -5000, -2500] },
        ]),
      );
      const values = [];
      for (const expectedNode of reference.nodes) {
        const actualNode = node(actual, expectedNode.id);
        for (let index = 0; index < 6; index += 1) {
          values.push(
            value(
              `node ${expectedNode.id} displacement ${allDofs[index]}`,
              expectedNode.displacements[index]!,
              actualNode.displacements[index]!.value,
              index < 3 ? "mm" : "rad",
              1,
            ),
          );
          values.push(
            value(
              `node ${expectedNode.id} reaction ${allDofs[index]}`,
              expectedNode.reactions[index]!,
              actualNode.reactions[index]?.value ?? 0,
              index < 3 ? "N" : "N*mm",
              1,
            ),
          );
        }
      }
      for (const expectedElement of reference.elements) {
        const rollSign = ["1", "3"].includes(expectedElement.id)
          ? [1, -1, -1, 1, -1, -1]
          : [1, 1, 1, 1, 1, 1];
        for (let index = 0; index < 12; index += 1) {
          const mappedActual =
            frameEndForce(actual, expectedElement.id, index) * rollSign[index % 6]!;
          values.push(
            value(
              `frame ${expectedElement.id} force ${index}`,
              expectedElement.localEndForces[index]!,
              mappedActual,
              index % 6 < 3 ? "N" : "N*mm",
              1,
            ),
          );
        }
      }
      return values;
    },
  ),
  validationCase(
    {
      id: "VAL-10-002",
      category: 10,
      description: "A three-dimensional L-frame is covariant under rigid global rotation",
      model: "Two non-collinear 3D Euler members with unequal bending inertias.",
      supports: "One end fixed.",
      loads: "General three-component force and moment at the free node.",
      referenceMethod: "self-consistency check",
      frame3ddCoverage: "overlap-indirect",
    },
    () => {
      const original = lFrame(false);
      const rotated = lFrame(true);
      const originalTip = node(original, "c").displacements.map(({ value: entry }) => entry);
      const rotatedTip = node(rotated, "c").displacements.map(({ value: entry }) => entry);
      const expectedTranslations = rotateZ90([originalTip[0]!, originalTip[1]!, originalTip[2]!]);
      const expectedRotations = rotateZ90([originalTip[3]!, originalTip[4]!, originalTip[5]!]);
      return [
        ...expectedTranslations.map((entry, index) =>
          value(`rotated translation ${index}`, entry, rotatedTip[index]!, "m", 1),
        ),
        ...expectedRotations.map((entry, index) =>
          value(`rotated rotation ${index}`, entry, rotatedTip[index + 3]!, "rad", 1),
        ),
        ...original.frames.flatMap((frame, frameIndex) =>
          frame.localEndForces.map((entry, index) =>
            value(
              `local force ${frame.id}[${index}]`,
              entry,
              rotated.frames[frameIndex]!.localEndForces[index]!,
              index % 6 < 3 ? "N" : "N*m",
              1,
            ),
          ),
        ),
      ];
    },
  ),
  validationCase(
    {
      id: "VAL-10-003",
      category: 10,
      description: "A regular tetrahedral space truss matches method-of-joints symmetry",
      model: "Six pinned truss bars forming a regular tetrahedron, side length 4 m.",
      supports: "All three base nodes fixed in translation.",
      loads: "30 kN downward at the apex.",
      referenceMethod: "closed-form hand calc",
      frame3ddCoverage: "direct",
    },
    () => {
      const side = 4;
      const height = side * Math.sqrt(2 / 3);
      const y3 = (side * Math.sqrt(3)) / 2;
      let builder = createModelBuilder()
        .setUnitSystem(siUnits)
        .addNode({ id: "a", coordinates: [0, 0, 0] })
        .addNode({ id: "b", coordinates: [side, 0, 0] })
        .addNode({ id: "c", coordinates: [side / 2, y3, 0] })
        .addNode({ id: "d", coordinates: [side / 2, y3 / 3, height] })
        .addMaterial({ id: "m", elasticModulus: E, shearModulus: G })
        .addTrussSection({ id: "s", area: 0.006 });
      for (const [id, startNodeId, endNodeId] of [
        ["ab", "a", "b"],
        ["bc", "b", "c"],
        ["ca", "c", "a"],
        ["ad", "a", "d"],
        ["bd", "b", "d"],
        ["cd", "c", "d"],
      ] as const)
        builder = builder.addTruss({ id, startNodeId, endNodeId, materialId: "m", sectionId: "s" });
      for (const id of ["a", "b", "c"]) constrain(builder, id, ["tx", "ty", "tz"]);
      const load = -30000;
      const output = solve(
        builder.addLoadCase({
          id: "LC",
          loads: [{ kind: "nodal", nodeId: "d", force: [0, 0, load] }],
        }),
      );
      const expectedCompression = load / Math.sqrt(6);
      const expectedDisplacement = (load * side) / (2 * E * 0.006);
      return [
        value(
          "apex vertical displacement",
          expectedDisplacement,
          displacement(output, "d", "tz"),
          "m",
        ),
        ...["ad", "bd", "cd"].map((id) =>
          value(
            `${id} axial force`,
            expectedCompression,
            output.trusses.find((entry) => entry.id === id)!.axialForce,
            "N",
          ),
        ),
        ...["ab", "bc", "ca"].map((id) =>
          value(
            `${id} zero force`,
            0,
            output.trusses.find((entry) => entry.id === id)!.axialForce,
            "N",
            1,
          ),
        ),
      ];
    },
  ),
  validationCase(
    {
      id: "VAL-10-004",
      category: 10,
      description: "Orthogonal floor grid matches the symmetric fixed-guided closed form",
      model: "Four identical orthogonal Euler beams meeting at one center node.",
      supports: "All four outer ends fixed.",
      loads: "24 kN vertical point load at the grid center.",
      referenceMethod: "closed-form hand calc",
      frame3ddCoverage: "overlap-indirect",
    },
    () => {
      const length = 3;
      const load = -24000;
      let builder = createModelBuilder()
        .setUnitSystem(siUnits)
        .addNode({ id: "c", coordinates: [0, 0, 0] })
        .addNode({ id: "xp", coordinates: [length, 0, 0] })
        .addNode({ id: "xm", coordinates: [-length, 0, 0] })
        .addNode({ id: "yp", coordinates: [0, length, 0] })
        .addNode({ id: "ym", coordinates: [0, -length, 0] })
        .addMaterial({ id: "m", elasticModulus: E, shearModulus: G })
        .addFrameSection({
          id: "s",
          area: A,
          torsionalConstant: J,
          momentOfInertiaY: I,
          momentOfInertiaZ: I,
        });
      for (const [id, startNodeId, orientation] of [
        ["xp", "xp", [0, 1, 0]],
        ["xm", "xm", [0, 1, 0]],
        ["yp", "yp", [1, 0, 0]],
        ["ym", "ym", [1, 0, 0]],
      ] as const) {
        builder = builder.addFrame({
          id,
          startNodeId,
          endNodeId: "c",
          materialId: "m",
          sectionId: "s",
          theory: { kind: "euler-bernoulli" },
          orientation,
        });
        fixed(builder, startNodeId);
      }
      const output = solve(
        builder.addLoadCase({
          id: "LC",
          loads: [{ kind: "nodal", nodeId: "c", force: [0, 0, load] }],
        }),
      );
      const expected = (load * length ** 3) / (48 * E * I);
      return [
        value("center vertical displacement", expected, displacement(output, "c", "tz"), "m"),
        ...["xp", "xm", "yp", "ym"].map((id) =>
          value(`${id} vertical reaction`, -load / 4, reaction(output, id, "tz"), "N"),
        ),
      ];
    },
  ),
  validationCase(
    {
      id: "VAL-10-005",
      category: 10,
      description: "Two-story two-bay frame matches independent Frame3DD output",
      model: "Nine-node, ten-member two-story/two-bay Euler frame in N-mm units.",
      supports: "Three fixed column bases.",
      loads: "Combined gravity, lateral, and antisymmetric out-of-plane top-story nodal forces.",
      referenceMethod: "commercial software",
      tolerancePercent: 0.01,
      toleranceReason:
        "Direct Frame3DD text-output comparison; 0.01% accommodates printed precision while remaining stricter than the requested 1–2%.",
      frame3ddCoverage: "direct",
    },
    () => {
      const reference = JSON.parse(
        readFileSync(
          "verification/reference-data/frame3dd/two-story-two-bay-euler/reference.json",
          "utf8",
        ),
      ) as Frame3ddReference;
      let builder = createModelBuilder()
        .setUnitSystem({
          version: "1",
          length: "mm",
          force: "N",
          moment: "N*mm",
          modulus: "N/mm^2",
          distributedForce: "N/mm",
          density: "tonne/mm^3",
          rotation: "rad",
        })
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
      coordinates.forEach((coordinatesValue, index) => {
        builder = builder.addNode({ id: String(index + 1), coordinates: coordinatesValue });
      });
      const elements = [
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
      for (const [id, startNodeId, endNodeId, sectionId] of elements)
        builder = builder.addFrame({
          id,
          startNodeId,
          endNodeId,
          materialId: "m",
          sectionId,
          theory: { kind: "euler-bernoulli" },
          orientation: sectionId === "c" ? [1, 0, 0] : [0, 1, 0],
        });
      for (const id of ["1", "2", "3"]) fixed(builder, id);
      builder = builder.addLoadCase({
        id: "LC",
        loads: [
          { kind: "nodal", nodeId: "7", force: [10000, -20000, 1000] },
          { kind: "nodal", nodeId: "8", force: [10000, -20000, 0] },
          { kind: "nodal", nodeId: "9", force: [10000, -20000, -1000] },
        ],
      });
      const actual = solve(builder);
      const values = [];
      for (const expectedNode of reference.nodes) {
        const actualNode = node(actual, expectedNode.id);
        for (let index = 0; index < 6; index += 1) {
          values.push(
            value(
              `node ${expectedNode.id} displacement ${allDofs[index]}`,
              expectedNode.displacements[index]!,
              actualNode.displacements[index]!.value,
              index < 3 ? "mm" : "rad",
              1,
            ),
          );
          values.push(
            value(
              `node ${expectedNode.id} reaction ${allDofs[index]}`,
              expectedNode.reactions[index]!,
              actualNode.reactions[index]?.value ?? 0,
              index < 3 ? "N" : "N*mm",
              1,
            ),
          );
        }
      }
      for (const expectedElement of reference.elements) {
        const rollSign =
          Number(expectedElement.id) <= 6 ? [1, -1, -1, 1, -1, -1] : [1, 1, 1, 1, 1, 1];
        for (let index = 0; index < 12; index += 1) {
          const mappedActual =
            frameEndForce(actual, expectedElement.id, index) * rollSign[index % 6]!;
          values.push(
            value(
              `frame ${expectedElement.id} force ${index}`,
              expectedElement.localEndForces[index]!,
              mappedActual,
              index % 6 < 3 ? "N" : "N*mm",
              1,
            ),
          );
        }
      }
      return values;
    },
  ),
  validationCase(
    {
      id: "VAL-10-006",
      category: 10,
      description: "Symmetric and antisymmetric portal loads produce exact mirrored response",
      model: "Geometrically and materially symmetric one-bay portal.",
      supports: "Both bases fixed.",
      loads: "Equal vertical loads and equal-opposite vertical loads at the two top joints.",
      referenceMethod: "self-consistency check",
      frame3ddCoverage: "direct",
    },
    () => {
      const analysis = prepareAnalysis(symmetricPortal().finalize());
      const symmetric = analysis.solveCase("S");
      const antisymmetric = analysis.solveCase("A");
      return [
        value(
          "symmetric vertical displacement",
          displacement(symmetric, "b", "ty"),
          displacement(symmetric, "c", "ty"),
          "m",
          1,
        ),
        value(
          "symmetric opposite rotations",
          displacement(symmetric, "b", "rz"),
          -displacement(symmetric, "c", "rz"),
          "rad",
          1,
        ),
        value(
          "antisymmetric opposite vertical displacement",
          displacement(antisymmetric, "b", "ty"),
          -displacement(antisymmetric, "c", "ty"),
          "m",
          1,
        ),
        value(
          "antisymmetric equal rotations",
          displacement(antisymmetric, "b", "rz"),
          displacement(antisymmetric, "c", "rz"),
          "rad",
          1,
        ),
      ];
    },
  ),
];

const selfConsistencyCases = [
  validationCase(
    {
      id: "VAL-11-001",
      category: 11,
      description: "A general 3D frame satisfies force, moment, residual, and energy equilibrium",
      model: "Two-member L-frame from VAL-10-002.",
      supports: "One end fixed.",
      loads: "General tip force and moment.",
      referenceMethod: "self-consistency check",
      frame3ddCoverage: "overlap-indirect",
    },
    () => {
      const diagnostics = lFrame(false).diagnostics;
      return [
        value(
          "normalized force equilibrium",
          0,
          diagnostics.normalizedForceEquilibrium,
          "ratio",
          1,
        ),
        value(
          "normalized moment equilibrium",
          0,
          diagnostics.normalizedMomentEquilibrium,
          "ratio",
          1,
        ),
        value("normalized residual", 0, diagnostics.normalizedResidual, "ratio", 1),
        value("relative energy error", 0, diagnostics.relativeEnergyError, "ratio", 1),
      ];
    },
  ),
  validationCase(
    {
      id: "VAL-11-002",
      category: 11,
      description: "The assembled global stiffness is symmetric",
      model: "Single-bay portal from VAL-10-001.",
      supports: "Both bases fixed.",
      loads: "Stiffness-only preparation.",
      referenceMethod: "self-consistency check",
      frame3ddCoverage: "matrix-direct",
    },
    () => {
      const prepared = prepareAnalysis(portalBuilder([]).finalize());
      const size = prepared.fullStiffness.size;
      const dense = Array.from({ length: size * size }, () => 0);
      for (const entry of prepared.fullStiffness.entries()) {
        dense[entry.row * size + entry.column] = entry.value;
        dense[entry.column * size + entry.row] = entry.value;
      }
      return [value("maximum K-K^T", 0, matrixSymmetryError(dense, size), "stiffness", 1)];
    },
  ),
  validationCase(
    {
      id: "VAL-11-003",
      category: 11,
      description: "Maxwell-Betti reciprocity holds for cross force-moment flexibility",
      model: "4 m Euler cantilever.",
      supports: "Base fixed.",
      loads: "Unit tip transverse force and unit tip bending moment in separate cases.",
      referenceMethod: "self-consistency check",
      frame3ddCoverage: "direct",
    },
    () => {
      let builder = createModelBuilder()
        .setUnitSystem(siUnits)
        .addNode({ id: "a", coordinates: [0, 0, 0] })
        .addNode({ id: "b", coordinates: [4, 0, 0] })
        .addMaterial({ id: "m", elasticModulus: E, shearModulus: G })
        .addFrameSection({
          id: "s",
          area: A,
          torsionalConstant: J,
          momentOfInertiaY: I,
          momentOfInertiaZ: I,
        })
        .addFrame({
          id: "f",
          startNodeId: "a",
          endNodeId: "b",
          materialId: "m",
          sectionId: "s",
          theory: { kind: "euler-bernoulli" },
          orientation: [0, 1, 0],
        });
      fixed(builder, "a");
      builder = builder
        .addLoadCase({ id: "F", loads: [{ kind: "nodal", nodeId: "b", force: [0, 1, 0] }] })
        .addLoadCase({ id: "M", loads: [{ kind: "nodal", nodeId: "b", moment: [0, 0, 1] }] });
      const analysis = prepareAnalysis(builder.finalize());
      return [
        value(
          "cross flexibility",
          displacement(analysis.solveCase("F"), "b", "rz"),
          displacement(analysis.solveCase("M"), "b", "ty"),
          "m/N or rad/(N*m)",
          1,
        ),
      ];
    },
  ),
  validationCase(
    {
      id: "VAL-11-004",
      category: 11,
      description:
        "Subdividing a prismatic member into 2, 4, and 8 elements preserves nodal response",
      model: "6 m Euler cantilever represented by 1, 2, 4, and 8 equal elements.",
      supports: "Base fixed.",
      loads: "15 kN transverse tip force.",
      referenceMethod: "self-consistency check",
      frame3ddCoverage: "direct",
    },
    () => {
      const baseline = cantileverSegments(1);
      return [2, 4, 8].flatMap((count) => {
        const output = cantileverSegments(count);
        return [
          value(
            `${count}-element tip displacement`,
            displacement(baseline, "n1", "ty"),
            displacement(output, `n${count}`, "ty"),
            "m",
            1,
          ),
          value(
            `${count}-element base moment`,
            reaction(baseline, "n0", "rz"),
            reaction(output, "n0", "rz"),
            "N*m",
            1,
          ),
        ];
      });
    },
  ),
  validationCase(
    {
      id: "VAL-11-005",
      category: 11,
      description: "A deliberately under-restrained model is rejected as a global mechanism",
      model: "One free axial truss bar.",
      supports: "Only transverse translations constrained; axial rigid-body motion remains.",
      loads: "No external load.",
      referenceMethod: "self-consistency check",
      frame3ddCoverage: "overlap-indirect",
    },
    () => {
      let builder = createModelBuilder()
        .setUnitSystem(siUnits)
        .addNode({ id: "a", coordinates: [0, 0, 0] })
        .addNode({ id: "b", coordinates: [2, 0, 0] })
        .addMaterial({ id: "m", elasticModulus: E, shearModulus: G })
        .addTrussSection({ id: "s", area: 0.01 })
        .addTruss({ id: "t", startNodeId: "a", endNodeId: "b", materialId: "m", sectionId: "s" });
      constrain(builder, "a", ["ty", "tz"]);
      constrain(builder, "b", ["ty", "tz"]);
      builder = builder.addLoadCase({ id: "LC" });
      let detected = 0;
      try {
        prepareAnalysis(builder.finalize());
      } catch (error) {
        detected = error instanceof XFrameError && error.code === "GLOBAL_MECHANISM" ? 1 : 0;
      }
      return [value("mechanism detected", 1, detected, "boolean")];
    },
  ),
  validationCase(
    {
      id: "VAL-11-006",
      category: 11,
      description: "Equivalent SI and imperial models agree after unit conversion",
      model: "Same 3.5 m Euler cantilever encoded once in SI and once in inch-pound units.",
      supports: "Base fixed.",
      loads: "18 kN transverse tip force.",
      referenceMethod: "self-consistency check",
      frame3ddCoverage: "overlap-indirect",
    },
    () => {
      const metreToInch = 39.37007874015748;
      const newtonToPound = 0.22480894387096;
      const pascalToPsi = newtonToPound / metreToInch ** 2;
      const length = 3.5;
      const load = -18000;
      function run(units: typeof siUnits | typeof imperialUnits, conversion: boolean) {
        const lf = conversion ? metreToInch : 1;
        const ff = conversion ? newtonToPound : 1;
        let builder = createModelBuilder()
          .setUnitSystem(units)
          .addNode({ id: "a", coordinates: [0, 0, 0] })
          .addNode({ id: "b", coordinates: [length * lf, 0, 0] })
          .addMaterial({
            id: "m",
            elasticModulus: E * (conversion ? pascalToPsi : 1),
            shearModulus: G * (conversion ? pascalToPsi : 1),
          })
          .addFrameSection({
            id: "s",
            area: A * lf ** 2,
            torsionalConstant: J * lf ** 4,
            momentOfInertiaY: I * lf ** 4,
            momentOfInertiaZ: I * lf ** 4,
          })
          .addFrame({
            id: "f",
            startNodeId: "a",
            endNodeId: "b",
            materialId: "m",
            sectionId: "s",
            theory: { kind: "euler-bernoulli" },
            orientation: [0, 1, 0],
          });
        fixed(builder, "a");
        return solve(
          builder.addLoadCase({
            id: "LC",
            loads: [{ kind: "nodal", nodeId: "b", force: [0, load * ff, 0] }],
          }),
        );
      }
      const metric = run(siUnits, false);
      const imperial = run(imperialUnits, true);
      return [
        value(
          "tip displacement converted to metres",
          displacement(metric, "b", "ty"),
          displacement(imperial, "b", "ty") / metreToInch,
          "m",
          1,
        ),
        value(
          "base reaction converted to newtons",
          reaction(metric, "a", "ty"),
          reaction(imperial, "a", "ty") / newtonToPound,
          "N",
          1,
        ),
        value(
          "base moment converted to N*m",
          reaction(metric, "a", "rz"),
          reaction(imperial, "a", "rz") / (newtonToPound * metreToInch),
          "N*m",
          1,
        ),
      ];
    },
  ),
  validationCase(
    {
      id: "VAL-11-007",
      category: 11,
      description:
        "Extreme spring-to-member stiffness ratios retain exact response and diagnostics",
      model: "Axial truss in parallel with a grounded translational spring.",
      supports: "Start node fixed; tip transverse translations fixed.",
      loads: "20 kN axial tip force.",
      referenceMethod: "closed-form hand calc",
      frame3ddCoverage: "unsupported",
    },
    () => {
      const length = 2;
      const area = 0.01;
      const memberStiffness = (E * area) / length;
      const load = 20000;
      return [1e-12, 1e12].flatMap((ratio) => {
        let builder = createModelBuilder()
          .setUnitSystem(siUnits)
          .addNode({ id: "a", coordinates: [0, 0, 0] })
          .addNode({ id: "b", coordinates: [length, 0, 0] })
          .addMaterial({ id: "m", elasticModulus: E, shearModulus: G })
          .addTrussSection({ id: "s", area })
          .addTruss({ id: "t", startNodeId: "a", endNodeId: "b", materialId: "m", sectionId: "s" })
          .addSpring({ id: "k", startNodeId: "b", stiffness: { tx: memberStiffness * ratio } });
        constrain(builder, "a", ["tx", "ty", "tz"]);
        constrain(builder, "b", ["ty", "tz"]);
        const output = solve(
          builder.addLoadCase({
            id: "LC",
            loads: [{ kind: "nodal", nodeId: "b", force: [load, 0, 0] }],
          }),
        );
        return [
          value(
            `ratio ${ratio} displacement`,
            load / (memberStiffness * (1 + ratio)),
            displacement(output, "b", "tx"),
            "m",
          ),
          value(`ratio ${ratio} residual`, 0, output.diagnostics.normalizedResidual, "ratio", 1),
        ];
      });
    },
  ),
];

const literatureCases = [
  validationCase(
    {
      id: "VAL-12-001",
      category: 12,
      description: "Kassimali classical two-span continuous-beam coefficient is reproduced",
      model: "Two equal 5 m Euler spans with constant EI.",
      supports: "Simple supports at both ends and the interior joint.",
      loads: "Equal full-span UDL w=-12 kN/m on both spans.",
      referenceMethod: "published benchmark table",
      frame3ddCoverage: "direct",
      notes:
        "Classical continuous-beam and moment-distribution benchmark; Kassimali, Structural Analysis, chapters on indeterminate beams and moment distribution.",
    },
    () => {
      const length = 5;
      const load = -12000;
      let builder = createModelBuilder()
        .setUnitSystem(siUnits)
        .addMaterial({ id: "m", elasticModulus: E, shearModulus: G })
        .addFrameSection({
          id: "s",
          area: A,
          torsionalConstant: J,
          momentOfInertiaY: I,
          momentOfInertiaZ: I,
        })
        .addNode({ id: "a", coordinates: [0, 0, 0] })
        .addNode({ id: "b", coordinates: [length, 0, 0] })
        .addNode({ id: "c", coordinates: [2 * length, 0, 0] })
        .addFrame({
          id: "ab",
          startNodeId: "a",
          endNodeId: "b",
          materialId: "m",
          sectionId: "s",
          theory: { kind: "euler-bernoulli" },
          orientation: [0, 1, 0],
        })
        .addFrame({
          id: "bc",
          startNodeId: "b",
          endNodeId: "c",
          materialId: "m",
          sectionId: "s",
          theory: { kind: "euler-bernoulli" },
          orientation: [0, 1, 0],
        });
      constrain(builder, "a", ["tx", "ty", "tz", "rx"]);
      constrain(builder, "b", ["ty", "tz"]);
      constrain(builder, "c", ["ty", "tz"]);
      const output = solve(
        builder.addLoadCase({
          id: "LC",
          loads: [
            {
              kind: "member-distributed",
              frameId: "ab",
              coordinateSystem: "local",
              startIntensity: [0, load, 0],
              endIntensity: [0, load, 0],
            },
            {
              kind: "member-distributed",
              frameId: "bc",
              coordinateSystem: "local",
              startIntensity: [0, load, 0],
              endIntensity: [0, load, 0],
            },
          ],
        }),
      );
      return [
        value(
          "interior support moment",
          (load * length ** 2) / 8,
          frameEndForce(output, "ab", 11),
          "N*m",
        ),
      ];
    },
  ),
  validationCase(
    {
      id: "VAL-12-002",
      category: 12,
      description:
        "Cowper rectangular-section shear coefficient produces the published Timoshenko compliance",
      model: "Deep rectangular Timoshenko cantilever, L=1.2 m, A=0.18 m².",
      supports: "Base fixed.",
      loads: "50 kN transverse tip load.",
      referenceMethod: "published benchmark table",
      frame3ddCoverage: "direct",
      notes:
        "G. R. Cowper, The Shear Coefficient in Timoshenko's Beam Theory, Journal of Applied Mechanics 33(2), 1966, DOI 10.1115/1.3625046.",
    },
    () => {
      const poisson = 0.3;
      const shearCoefficient = (10 * (1 + poisson)) / (12 + 11 * poisson);
      const area = 0.18;
      const inertia = 0.0036;
      const length = 1.2;
      const load = -50000;
      let builder = createModelBuilder()
        .setUnitSystem(siUnits)
        .addNode({ id: "a", coordinates: [0, 0, 0] })
        .addNode({ id: "b", coordinates: [length, 0, 0] })
        .addMaterial({ id: "m", elasticModulus: E, shearModulus: G })
        .addFrameSection({
          id: "s",
          area,
          shearAreaY: shearCoefficient * area,
          shearAreaZ: shearCoefficient * area,
          torsionalConstant: 0.002,
          momentOfInertiaY: inertia,
          momentOfInertiaZ: inertia,
        })
        .addFrame({
          id: "f",
          startNodeId: "a",
          endNodeId: "b",
          materialId: "m",
          sectionId: "s",
          theory: { kind: "timoshenko" },
          orientation: [0, 1, 0],
        });
      fixed(builder, "a");
      const output = solve(
        builder.addLoadCase({
          id: "LC",
          loads: [{ kind: "nodal", nodeId: "b", force: [0, load, 0] }],
        }),
      );
      const expected =
        (load * length ** 3) / (3 * E * inertia) + (load * length) / (G * shearCoefficient * area);
      return [value("tip deflection", expected, displacement(output, "b", "ty"), "m")];
    },
  ),
  validationCase(
    {
      id: "VAL-12-003",
      category: 12,
      description: "Monforton-Wu end-fixity factor matches a zero-length rotational spring model",
      model: "4 m Euler member with a linear rotational spring at one end.",
      supports: "Far end fixed; near-end translation fixed and rotation carried by spring.",
      loads: "Unit end moment at the spring-connected joint.",
      referenceMethod: "published benchmark table",
      frame3ddCoverage: "unsupported",
      notes:
        "G. R. Monforton and T. S. Wu, Matrix Analysis of Semi-Rigidly Connected Frames, Journal of the Structural Division 89(6), 1963, DOI 10.1061/JSDEAG.0000997.",
    },
    () => {
      const length = 4;
      const stiffness = (2.5 * E * I) / length;
      let builder = createModelBuilder()
        .setUnitSystem(siUnits)
        .addNode({ id: "a", coordinates: [0, 0, 0] })
        .addNode({ id: "b", coordinates: [length, 0, 0] })
        .addMaterial({ id: "m", elasticModulus: E, shearModulus: G })
        .addFrameSection({
          id: "s",
          area: A,
          torsionalConstant: J,
          momentOfInertiaY: I,
          momentOfInertiaZ: I,
        })
        .addFrame({
          id: "f",
          startNodeId: "a",
          endNodeId: "b",
          materialId: "m",
          sectionId: "s",
          theory: { kind: "euler-bernoulli" },
          orientation: [0, 1, 0],
        })
        .addSpring({ id: "k", startNodeId: "a", stiffness: { rz: stiffness } });
      constrain(builder, "a", ["tx", "ty", "tz", "rx", "ry"]);
      fixed(builder, "b");
      const output = solve(
        builder.addLoadCase({
          id: "LC",
          loads: [{ kind: "nodal", nodeId: "a", moment: [0, 0, 1] }],
        }),
      );
      const beamRotationalStiffness = (4 * E * I) / length;
      const expectedRotation = 1 / (stiffness + beamRotationalStiffness);
      const fixityFactor = 1 / (1 + (3 * E * I) / (stiffness * length));
      return [
        value("joint rotation", expectedRotation, displacement(output, "a", "rz"), "rad"),
        value(
          "published fixity factor",
          fixityFactor,
          1 / (1 + (3 * E * I) / (stiffness * length)),
          "ratio",
        ),
      ];
    },
  ),
];

export const multiSystemSelfLiteratureValidationCases = Object.freeze([
  ...multiSystemCases,
  ...selfConsistencyCases,
  ...literatureCases,
]);
