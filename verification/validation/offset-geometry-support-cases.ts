import { createModelBuilder, type DofName, type ModelBuilder } from "../../src/index.js";
import { buildLocalAxes } from "../../src/geometry/local-axes.js";
import {
  allDofs,
  constrain,
  displacement,
  frameEndForce,
  prismaticFrameBuilder,
  reaction,
  siUnits,
  solve,
  validationCase,
  value,
  type ValidationCase,
} from "./validation-support.js";

const E = 205e9;
const G = 79e9;
const A = 0.018;
const IY = 2.4e-5;
const IZ = 7.2e-5;
const J = 1.3e-5;

function dot(left: ArrayLike<number>, right: ArrayLike<number>): number {
  let sum = 0;
  for (let index = 0; index < left.length; index += 1) sum += left[index]! * right[index]!;
  return sum;
}

function tuple3(values: ArrayLike<number>): readonly [number, number, number] {
  return [values[0]!, values[1]!, values[2]!];
}

function nodeVector(
  result: ReturnType<typeof solve>,
  nodeId: string,
  dofs: readonly DofName[],
): number[] {
  return dofs.map((dof) => displacement(result, nodeId, dof));
}

function addStandardProperties(builder: ModelBuilder): ModelBuilder {
  return builder
    .setUnitSystem(siUnits)
    .addMaterial({ id: "m", elasticModulus: E, shearModulus: G, density: 7850 })
    .addFrameSection({
      id: "s",
      area: A,
      torsionalConstant: J,
      momentOfInertiaY: IY,
      momentOfInertiaZ: IZ,
      shearAreaY: 0.014,
      shearAreaZ: 0.013,
    })
    .addTrussSection({ id: "ts", area: A });
}

function cantileverWithOffsets(
  length: number,
  start: readonly [number, number, number],
  end: readonly [number, number, number],
): ModelBuilder {
  return prismaticFrameBuilder({
    length,
    elasticModulus: E,
    shearModulus: G,
    area: A,
    inertiaY: IY,
    inertiaZ: IZ,
    torsionalConstant: J,
    rigidOffsets: { start, end },
  });
}

const rigidOffsetCases: ValidationCase[] = [
  validationCase(
    {
      id: "VAL-04-001",
      category: 4,
      description: "Cantilever fixed-end rigid offset shortens the elastic span",
      model: `Reference span 5 m; start rigid offset +1 m in local x; elastic L=4 m; E=${E}, Izz=${IZ}.`,
      supports: "Reference node a fixed in all six DOFs; node b free.",
      loads: "Tip nodal force Fy=18,000 N at reference node b.",
      referenceMethod: "closed-form hand calc",
      frame3ddCoverage: "unsupported",
      notes: "Frame3DD does not expose xframe's exact vector rigid-offset model.",
    },
    () => {
      const load = 18_000;
      const clearLength = 4;
      const builder = cantileverWithOffsets(5, [1, 0, 0], [0, 0, 0]);
      constrain(builder, "a", allDofs);
      const output = solve(
        builder.addLoadCase({
          id: "LC",
          loads: [{ kind: "nodal", nodeId: "b", force: [0, load, 0] }],
        }),
      );
      return [
        value(
          "tip uy",
          (load * clearLength ** 3) / (3 * E * IZ),
          displacement(output, "b", "uy"),
          "m",
        ),
        value(
          "tip rz",
          (load * clearLength ** 2) / (2 * E * IZ),
          displacement(output, "b", "rz"),
          "rad",
        ),
      ];
    },
  ),
  validationCase(
    {
      id: "VAL-04-002",
      category: 4,
      description: "Both-end collinear offsets match an explicit clear-span member at elastic ends",
      model: "Reference span 5 m; offsets +0.5 m and -0.75 m; clear span 3.75 m.",
      supports: "Start joint fixed; end joint free.",
      loads: "Tip nodal force Fy=12,000 N.",
      referenceMethod: "equivalent-model cross-check",
      frame3ddCoverage: "unsupported",
    },
    () => {
      const load = 12_000;
      const offsetBuilder = cantileverWithOffsets(5, [0.5, 0, 0], [-0.75, 0, 0]);
      constrain(offsetBuilder, "a", allDofs);
      const offsetResult = solve(
        offsetBuilder.addLoadCase({
          id: "LC",
          loads: [{ kind: "nodal", nodeId: "b", force: [0, load, 0] }],
        }),
      );

      const clearBuilder = prismaticFrameBuilder({
        length: 3.75,
        start: [0.5, 0, 0],
        end: [4.25, 0, 0],
        elasticModulus: E,
        shearModulus: G,
        area: A,
        inertiaY: IY,
        inertiaZ: IZ,
        torsionalConstant: J,
      });
      constrain(clearBuilder, "a", allDofs);
      const clearResult = solve(
        clearBuilder.addLoadCase({
          id: "LC",
          loads: [{ kind: "nodal", nodeId: "b", force: [0, load, 0], moment: [0, 0, 0.75 * load] }],
        }),
      );
      const frame = offsetResult.frames[0]!;
      return [
        value(
          "elastic-end uy",
          displacement(clearResult, "b", "uy"),
          frame.localEndDisplacements[7]!,
          "m",
          displacement(clearResult, "b", "uy"),
        ),
        value(
          "elastic-end rz",
          displacement(clearResult, "b", "rz"),
          frame.localEndDisplacements[11]!,
          "rad",
          displacement(clearResult, "b", "rz"),
        ),
        value(
          "base moment",
          frameEndForce(clearResult, "f", 5),
          frameEndForce(offsetResult, "f", 5),
          "N*m",
          load * 3.75,
        ),
      ];
    },
  ),
  validationCase(
    {
      id: "VAL-04-003",
      category: 4,
      description: "A large rigid zone contributes no elastic deformation",
      model: "Reference span 5 m; fixed-end rigid offset 4 m; elastic span 1 m.",
      supports: "Start node fixed; end node free.",
      loads: "Tip nodal force Fy=10,000 N.",
      referenceMethod: "closed-form hand calc",
      frame3ddCoverage: "unsupported",
    },
    () => {
      const load = 10_000;
      const builder = cantileverWithOffsets(5, [4, 0, 0], [0, 0, 0]);
      constrain(builder, "a", allDofs);
      const output = solve(
        builder.addLoadCase({
          id: "LC",
          loads: [{ kind: "nodal", nodeId: "b", force: [0, load, 0] }],
        }),
      );
      return [value("tip uy", load / (3 * E * IZ), displacement(output, "b", "uy"), "m")];
    },
  ),
  validationCase(
    {
      id: "VAL-04-004",
      category: 4,
      description: "Zero rigid offsets recover the baseline member exactly",
      model:
        "Two identical 4 m Euler cantilevers; one omits offsets and one uses explicit zero vectors.",
      supports: "Start node fixed; end node free.",
      loads: "Tip force [2,000,-8,000,3,000] N and tip moment [900,400,-600] N*m.",
      referenceMethod: "equivalent-model cross-check",
      frame3ddCoverage: "unsupported",
    },
    () => {
      const actions = {
        kind: "nodal" as const,
        nodeId: "b",
        force: [2_000, -8_000, 3_000] as const,
        moment: [900, 400, -600] as const,
      };
      const outputs = [
        prismaticFrameBuilder({
          length: 4,
          elasticModulus: E,
          shearModulus: G,
          area: A,
          inertiaY: IY,
          inertiaZ: IZ,
          torsionalConstant: J,
        }),
        cantileverWithOffsets(4, [0, 0, 0], [0, 0, 0]),
      ].map((builder) => {
        constrain(builder, "a", allDofs);
        return solve(builder.addLoadCase({ id: "LC", loads: [actions] }));
      });
      return allDofs.map((dof) =>
        value(
          `b.${dof}`,
          displacement(outputs[0]!, "b", dof),
          displacement(outputs[1]!, "b", dof),
          dof.startsWith("r") ? "rad" : "m",
          1,
        ),
      );
    },
  ),
  validationCase(
    {
      id: "VAL-04-005",
      category: 4,
      description: "Rigid offset and end release are applied in the correct order under UDL",
      model:
        "Reference span 5 m; +0.5 m start and -0.5 m end offsets; end rz released; elastic span 4 m.",
      supports: "Start node fixed; end node vertically restrained and rotationally free.",
      loads: "Uniform local-y load w=-9,000 N/m over the elastic span.",
      referenceMethod: "closed-form hand calc",
      frame3ddCoverage: "unsupported",
    },
    () => {
      const w = -9_000;
      const clearLength = 4;
      const builder = prismaticFrameBuilder({
        length: 5,
        elasticModulus: E,
        shearModulus: G,
        area: A,
        inertiaY: IY,
        inertiaZ: IZ,
        torsionalConstant: J,
        rigidOffsets: { start: [0.5, 0, 0], end: [-0.5, 0, 0] },
        releases: { end: ["rz"] },
      });
      constrain(builder, "a", allDofs);
      constrain(builder, "b", ["uy", "uz", "rx", "ry"]);
      const output = solve(
        builder.addLoadCase({
          id: "LC",
          loads: [
            {
              kind: "member-distributed",
              frameId: "f",
              coordinateSystem: "local",
              startIntensity: [0, w, 0],
              endIntensity: [0, w, 0],
            },
          ],
        }),
      );
      return [
        value(
          "released end moment",
          0,
          frameEndForce(output, "f", 11),
          "N*m",
          Math.abs(w) * clearLength ** 2,
        ),
        value("left reaction", -w * clearLength, reaction(output, "a", "uy"), "N"),
        value("right reaction", 0, reaction(output, "b", "uy"), "N", Math.abs(w) * clearLength),
      ];
    },
  ),
  validationCase(
    {
      id: "VAL-04-006",
      category: 4,
      description: "Parallel lateral offsets create the expected axial-bending coupling",
      model:
        "5 m member with equal +0.2 m global-y offsets at both ends; elastic axis remains parallel to global x.",
      supports: "Start reference node fixed; end reference node free.",
      loads: "Axial nodal force Fx=25,000 N at the end reference node.",
      referenceMethod: "closed-form hand calc",
      frame3ddCoverage: "unsupported",
    },
    () => {
      const load = 25_000;
      const eccentricity = 0.2;
      const builder = cantileverWithOffsets(5, [0, eccentricity, 0], [0, eccentricity, 0]);
      constrain(builder, "a", allDofs);
      const output = solve(
        builder.addLoadCase({
          id: "LC",
          loads: [{ kind: "nodal", nodeId: "b", force: [load, 0, 0] }],
        }),
      );
      return [
        value(
          "elastic start axial force magnitude",
          load,
          Math.abs(frameEndForce(output, "f", 0)),
          "N",
        ),
        value(
          "elastic start bending moment magnitude",
          load * eccentricity,
          Math.abs(frameEndForce(output, "f", 5)),
          "N*m",
        ),
        value(
          "elastic end bending moment magnitude",
          load * eccentricity,
          Math.abs(frameEndForce(output, "f", 11)),
          "N*m",
        ),
      ];
    },
  ),
];

const geometryCases: ValidationCase[] = [
  validationCase(
    {
      id: "VAL-05-001",
      category: 5,
      description: "Arbitrarily oriented 3D member transforms an axial action exactly",
      model: "Frame from [1,-2,0.5] to [4,2,5.5], arbitrary non-axis-aligned orientation.",
      supports: "Start node fixed in all six DOFs.",
      loads: "End force P=30,000 N parallel to the member axis.",
      referenceMethod: "closed-form hand calc",
      frame3ddCoverage: "direct",
    },
    () => {
      const start = [1, -2, 0.5] as const;
      const end = [4, 2, 5.5] as const;
      const axes = buildLocalAxes(start, end, [0, 0, 1]);
      const length = Math.hypot(end[0] - start[0], end[1] - start[1], end[2] - start[2]);
      const load = 30_000;
      const builder = prismaticFrameBuilder({
        length,
        start,
        end,
        orientation: [0, 0, 1],
        elasticModulus: E,
        shearModulus: G,
        area: A,
        inertiaY: IY,
        inertiaZ: IZ,
        torsionalConstant: J,
      });
      constrain(builder, "a", allDofs);
      const force = tuple3(axes.x.map((entry) => entry * load));
      const output = solve(
        builder.addLoadCase({ id: "LC", loads: [{ kind: "nodal", nodeId: "b", force }] }),
      );
      const global = nodeVector(output, "b", ["ux", "uy", "uz"]);
      const transverse = Math.hypot(
        ...global.map((entry, index) => entry - axes.x[index]! * dot(global, axes.x)),
      );
      return [
        value("axial displacement", (load * length) / (E * A), dot(global, axes.x), "m"),
        value("transverse leakage", 0, transverse, "m", (load * length) / (E * A)),
      ];
    },
  ),
  ...[0, 45, 90, 180].map((angle, index) =>
    validationCase(
      {
        id: `VAL-05-${String(index + 2).padStart(3, "0")}`,
        category: 5,
        description: `Member roll/reference orientation at ${angle} degrees preserves local-y bending compliance`,
        model: `3.2 m global-x Euler member; orientation vector rotated ${angle} degrees in the global yz plane.`,
        supports: "Start node fixed; end node free.",
        loads: "Tip force P=9,000 N along the constructed local y axis.",
        referenceMethod: "closed-form hand calc",
        frame3ddCoverage: "direct",
      },
      () => {
        const radians = (angle * Math.PI) / 180;
        const orientation = [0, Math.cos(radians), Math.sin(radians)] as const;
        const axes = buildLocalAxes([0, 0, 0], [3.2, 0, 0], orientation);
        const load = 9_000;
        const force = tuple3(axes.y.map((entry) => entry * load));
        const builder = prismaticFrameBuilder({
          length: 3.2,
          orientation,
          elasticModulus: E,
          shearModulus: G,
          area: A,
          inertiaY: IY,
          inertiaZ: IZ,
          torsionalConstant: J,
        });
        constrain(builder, "a", allDofs);
        const output = solve(
          builder.addLoadCase({ id: "LC", loads: [{ kind: "nodal", nodeId: "b", force }] }),
        );
        const global = nodeVector(output, "b", ["ux", "uy", "uz"]);
        return [
          value(
            "local-y tip displacement",
            (load * 3.2 ** 3) / (3 * E * IZ),
            dot(global, axes.y),
            "m",
          ),
        ];
      },
    ),
  ),
  validationCase(
    {
      id: "VAL-05-006",
      category: 5,
      description: "Arbitrary non-45-degree diagonal truss matches axial closed form",
      model: "Truss from [0,0,0] to [2.3,3.7,1.4], A=0.018 m², E=205 GPa.",
      supports:
        "Start translations fixed; end transverse motion constrained by two affine equations, axial motion free.",
      loads: "End force P=22,000 N along the truss axis.",
      referenceMethod: "closed-form hand calc",
      frame3ddCoverage: "direct",
    },
    () => {
      const end = [2.3, 3.7, 1.4] as const;
      const length = Math.hypot(...end);
      const direction = tuple3(end.map((entry) => entry / length));
      let builder = addStandardProperties(createModelBuilder())
        .addNode({ id: "a", coordinates: [0, 0, 0] })
        .addNode({ id: "b", coordinates: end })
        .addTruss({ id: "t", startNodeId: "a", endNodeId: "b", materialId: "m", sectionId: "ts" });
      constrain(builder, "a", ["ux", "uy", "uz"]);
      const axes = buildLocalAxes([0, 0, 0], end, [0, 0, 1]);
      for (const [id, normal] of [
        ["y", axes.y],
        ["z", axes.z],
      ] as const) {
        builder = builder.addConstraint({
          id: `end:${id}`,
          terms: ["ux", "uy", "uz"].map((dof, index) => ({
            nodeId: "b",
            dof: dof as DofName,
            coefficient: normal[index]!,
          })),
          rightHandSide: 0,
        });
      }
      const load = 22_000;
      const force = tuple3(direction.map((entry) => entry * load));
      const output = solve(
        builder.addLoadCase({ id: "LC", loads: [{ kind: "nodal", nodeId: "b", force }] }),
      );
      const global = nodeVector(output, "b", ["ux", "uy", "uz"]);
      return [value("axial displacement", (load * length) / (E * A), dot(global, direction), "m")];
    },
  ),
  validationCase(
    {
      id: "VAL-05-007",
      category: 5,
      description: "Inclined tip force decomposes into independent biaxial bending responses",
      model: "4 m member from [0,0,0] to [2,2,2.828427], with unequal Iyy and Izz.",
      supports: "Start node fixed; end node free.",
      loads: "Tip force with local components [0,7,000,-11,000] N.",
      referenceMethod: "closed-form hand calc",
      frame3ddCoverage: "direct",
    },
    () => {
      const end = [2, 2, 2.8284271247461903] as const;
      const length = 4;
      const axes = buildLocalAxes([0, 0, 0], end, [0, 0, 1]);
      const local = [0, 7_000, -11_000] as const;
      const force = tuple3(
        [0, 1, 2].map(
          (row) =>
            axes.localToGlobal[row * 3]! * local[0] +
            axes.localToGlobal[row * 3 + 1]! * local[1] +
            axes.localToGlobal[row * 3 + 2]! * local[2],
        ),
      );
      const builder = prismaticFrameBuilder({
        length,
        end,
        orientation: [0, 0, 1],
        elasticModulus: E,
        shearModulus: G,
        area: A,
        inertiaY: IY,
        inertiaZ: IZ,
        torsionalConstant: J,
      });
      constrain(builder, "a", allDofs);
      const output = solve(
        builder.addLoadCase({ id: "LC", loads: [{ kind: "nodal", nodeId: "b", force }] }),
      );
      const global = nodeVector(output, "b", ["ux", "uy", "uz"]);
      return [
        value(
          "local-y displacement",
          (local[1] * length ** 3) / (3 * E * IZ),
          dot(global, axes.y),
          "m",
        ),
        value(
          "local-z displacement",
          (local[2] * length ** 3) / (3 * E * IY),
          dot(global, axes.z),
          "m",
        ),
      ];
    },
  ),
];

const supportCases: ValidationCase[] = [
  validationCase(
    {
      id: "VAL-06-001",
      category: 6,
      description:
        "Fixed, pinned, and roller support components produce the exact simply-supported reactions",
      model: "Two-element 6 m Euler beam with a midspan node.",
      supports:
        "Left pin restrains ux and uy; right roller restrains uy; unused planar DOFs restrained.",
      loads: "Midspan force Fy=-24,000 N.",
      referenceMethod: "closed-form hand calc",
      frame3ddCoverage: "direct",
    },
    () => {
      let builder = addStandardProperties(createModelBuilder())
        .addNode({ id: "a", coordinates: [0, 0, 0] })
        .addNode({ id: "b", coordinates: [3, 0, 0] })
        .addNode({ id: "c", coordinates: [6, 0, 0] })
        .addFrame({
          id: "f1",
          startNodeId: "a",
          endNodeId: "b",
          materialId: "m",
          sectionId: "s",
          theory: { kind: "euler-bernoulli" },
          orientation: [0, 1, 0],
        })
        .addFrame({
          id: "f2",
          startNodeId: "b",
          endNodeId: "c",
          materialId: "m",
          sectionId: "s",
          theory: { kind: "euler-bernoulli" },
          orientation: [0, 1, 0],
        });
      constrain(builder, "a", ["ux", "uy", "uz", "rx", "ry"]);
      constrain(builder, "b", ["uz", "rx", "ry"]);
      constrain(builder, "c", ["uy", "uz", "rx", "ry"]);
      const output = solve(
        builder.addLoadCase({
          id: "LC",
          loads: [{ kind: "nodal", nodeId: "b", force: [0, -24_000, 0] }],
        }),
      );
      return [
        value("left reaction", 12_000, reaction(output, "a", "uy"), "N"),
        value("right reaction", 12_000, reaction(output, "c", "uy"), "N"),
        value("pin rotation freedom", 0, reaction(output, "a", "rz"), "N*m", 24_000 * 6),
      ];
    },
  ),
  validationCase(
    {
      id: "VAL-06-002",
      category: 6,
      description:
        "Partial end restraint on unrelated DOFs does not alter in-plane cantilever bending",
      model: "4 m Euler cantilever with additional end restraints ux and uz.",
      supports: "Start node fixed; end node restrains ux and uz only.",
      loads: "Tip force Fy=10,000 N.",
      referenceMethod: "closed-form hand calc",
      frame3ddCoverage: "direct",
    },
    () => {
      const load = 10_000;
      const length = 4;
      const builder = prismaticFrameBuilder({
        length,
        elasticModulus: E,
        shearModulus: G,
        area: A,
        inertiaY: IY,
        inertiaZ: IZ,
        torsionalConstant: J,
      });
      constrain(builder, "a", allDofs);
      constrain(builder, "b", ["ux", "uz"]);
      const output = solve(
        builder.addLoadCase({
          id: "LC",
          loads: [{ kind: "nodal", nodeId: "b", force: [0, load, 0] }],
        }),
      );
      return [
        value("tip uy", (load * length ** 3) / (3 * E * IZ), displacement(output, "b", "uy"), "m"),
        value("restrained ux", 0, displacement(output, "b", "ux"), "m", 1),
        value("restrained uz", 0, displacement(output, "b", "uz"), "m", 1),
      ];
    },
  ),
  validationCase(
    {
      id: "VAL-06-003",
      category: 6,
      description: "A propped cantilever support reaction matches the force method",
      model: "Single 5 m Euler beam.",
      supports: "Node a fixed; node b vertical roller with unused planar DOFs restrained.",
      loads: "Uniform local-y load w=-8,000 N/m.",
      referenceMethod: "closed-form hand calc",
      frame3ddCoverage: "direct",
    },
    () => {
      const length = 5;
      const w = -8_000;
      const builder = prismaticFrameBuilder({
        length,
        elasticModulus: E,
        shearModulus: G,
        area: A,
        inertiaY: IY,
        inertiaZ: IZ,
        torsionalConstant: J,
      });
      constrain(builder, "a", allDofs);
      constrain(builder, "b", ["uy", "uz", "rx", "ry"]);
      const output = solve(
        builder.addLoadCase({
          id: "LC",
          loads: [
            {
              kind: "member-distributed",
              frameId: "f",
              coordinateSystem: "local",
              startIntensity: [0, w, 0],
              endIntensity: [0, w, 0],
            },
          ],
        }),
      );
      return [
        value("roller reaction", (-3 * w * length) / 8, reaction(output, "b", "uy"), "N"),
        value("fixed reaction", (-5 * w * length) / 8, reaction(output, "a", "uy"), "N"),
        value(
          "fixed moment magnitude",
          (Math.abs(w) * length ** 2) / 8,
          Math.abs(reaction(output, "a", "rz")),
          "N*m",
        ),
      ];
    },
  ),
];

export const offsetGeometrySupportValidationCases = Object.freeze([
  ...rigidOffsetCases,
  ...geometryCases,
  ...supportCases,
]);
