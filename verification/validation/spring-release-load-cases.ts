import {
  XFrameError,
  combineResults,
  createModelBuilder,
  prepareAnalysis,
  type DofName,
  type ModelBuilder,
} from "../../src/index.js";
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

const E = 200e9;
const G = 80e9;
const A = 0.02;
const IY = 3e-5;
const IZ = 6e-5;
const J = 1.5e-5;

function frameBuilder(
  length: number,
  releases?: { readonly start?: readonly DofName[]; readonly end?: readonly DofName[] },
): ModelBuilder {
  return prismaticFrameBuilder({
    length,
    elasticModulus: E,
    shearModulus: G,
    area: A,
    inertiaY: IY,
    inertiaZ: IZ,
    torsionalConstant: J,
    ...(releases === undefined ? {} : { releases }),
  });
}

function fixed(builder: ModelBuilder, nodeId = "a"): void {
  constrain(builder, nodeId, allDofs);
}

function springForce(result: ReturnType<typeof solve>, id: string, index: number): number {
  const spring = result.springs.find((entry) => entry.id === id);
  if (spring === undefined) throw new Error(`Missing spring ${id}.`);
  return spring.globalEndForces[index]!;
}

function tuple3(values: ArrayLike<number>): readonly [number, number, number] {
  return [values[0]!, values[1]!, values[2]!];
}

const springCases: ValidationCase[] = [
  validationCase(
    {
      id: "VAL-07-001",
      category: 7,
      description: "A two-node tip spring in series adds P/k to cantilever deflection",
      model:
        "4 m Euler cantilever joined at its tip to a load node by a translational y spring k=2.4 MN/m.",
      supports: "Cantilever base fixed; load node is connected only through the y spring.",
      loads: "Load-node force Fy=-18,000 N.",
      referenceMethod: "closed-form hand calc",
      frame3ddCoverage: "unsupported",
      notes:
        "The prompt's additive beam-plus-spring formula is physically a series model; the case is constructed that way.",
    },
    () => {
      const length = 4;
      const load = -18_000;
      const stiffness = 2.4e6;
      const builder = createModelBuilder()
        .setUnitSystem(siUnits)
        .addNode({ id: "a", coordinates: [0, 0, 0] })
        .addNode({ id: "b", coordinates: [length, 0, 0] })
        .addNode({ id: "c", coordinates: [length, 0, 0] })
        .addMaterial({ id: "m", elasticModulus: E, shearModulus: G, density: 7850 })
        .addFrameSection({
          id: "s",
          area: A,
          torsionalConstant: J,
          momentOfInertiaY: IY,
          momentOfInertiaZ: IZ,
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
        .addSpring({ id: "k", startNodeId: "b", endNodeId: "c", stiffness: { uy: stiffness } });
      fixed(builder);
      const output = solve(
        builder.addLoadCase({
          id: "LC",
          loads: [{ kind: "nodal", nodeId: "c", force: [0, load, 0] }],
        }),
      );
      const beamDeflection = (load * length ** 3) / (3 * E * IZ);
      return [
        value(
          "load-node uy",
          beamDeflection + load / stiffness,
          displacement(output, "c", "uy"),
          "m",
        ),
        value("spring force magnitude", Math.abs(load), Math.abs(springForce(output, "k", 1)), "N"),
      ];
    },
  ),
  validationCase(
    {
      id: "VAL-07-002",
      category: 7,
      description: "A base rotational spring matches the exact semi-rigid cantilever flexibility",
      model: "3 m Euler member with grounded base rz spring kθ=18 MN·m/rad.",
      supports: "Base translations, rx, and ry fixed; base rz restrained only by spring.",
      loads: "Tip force Fy=-12,000 N.",
      referenceMethod: "closed-form hand calc",
      frame3ddCoverage: "unsupported",
    },
    () => {
      const length = 3;
      const load = -12_000;
      const rotationalStiffness = 18e6;
      const builder = frameBuilder(length).addSpring({
        id: "kr",
        startNodeId: "a",
        stiffness: { rz: rotationalStiffness },
      });
      constrain(builder, "a", ["ux", "uy", "uz", "rx", "ry"]);
      const output = solve(
        builder.addLoadCase({
          id: "LC",
          loads: [{ kind: "nodal", nodeId: "b", force: [0, load, 0] }],
        }),
      );
      const baseRotation = (load * length) / rotationalStiffness;
      const tip = (load * length ** 3) / (3 * E * IZ) + length * baseRotation;
      return [
        value("base rotation", baseRotation, displacement(output, "a", "rz"), "rad"),
        value("tip deflection", tip, displacement(output, "b", "uy"), "m"),
      ];
    },
  ),
  validationCase(
    {
      id: "VAL-07-003",
      category: 7,
      description: "Two unequal tip springs split reaction in direct proportion to stiffness",
      model: "4 m cantilever with two grounded y springs k1=1.5 MN/m and k2=4.5 MN/m at the tip.",
      supports: "Base fixed; both springs act in parallel at the tip.",
      loads: "Tip force Fy=-30,000 N.",
      referenceMethod: "closed-form hand calc",
      frame3ddCoverage: "unsupported",
    },
    () => {
      const length = 4;
      const load = -30_000;
      const k1 = 1.5e6;
      const k2 = 4.5e6;
      const beamStiffness = (3 * E * IZ) / length ** 3;
      const builder = frameBuilder(length)
        .addSpring({ id: "k1", startNodeId: "b", stiffness: { uy: k1 } })
        .addSpring({ id: "k2", startNodeId: "b", stiffness: { uy: k2 } });
      fixed(builder);
      const output = solve(
        builder.addLoadCase({
          id: "LC",
          loads: [{ kind: "nodal", nodeId: "b", force: [0, load, 0] }],
        }),
      );
      const deflection = load / (beamStiffness + k1 + k2);
      return [
        value("tip deflection", deflection, displacement(output, "b", "uy"), "m"),
        value(
          "spring k1 force",
          Math.abs(k1 * deflection),
          Math.abs(springForce(output, "k1", 1)),
          "N",
        ),
        value(
          "spring k2 force",
          Math.abs(k2 * deflection),
          Math.abs(springForce(output, "k2", 1)),
          "N",
        ),
        value(
          "reaction ratio k2/k1",
          k2 / k1,
          Math.abs(springForce(output, "k2", 1) / springForce(output, "k1", 1)),
          "1",
        ),
      ];
    },
  ),
  validationCase(
    {
      id: "VAL-07-004",
      category: 7,
      description:
        "Rotational spring limits converge to free-rotation and fixed-rotation end conditions",
      model: "3.5 m fixed-base Euler beam with a grounded rz spring at the loaded tip.",
      supports: "Base fixed; tip translation free; tip rotation controlled by kθ.",
      loads: "Tip force Fy=-10,000 N.",
      referenceMethod: "closed-form hand calc",
      frame3ddCoverage: "unsupported",
    },
    () => {
      const length = 3.5;
      const load = -10_000;
      const characteristic = (E * IZ) / length;
      function solveFor(stiffness: number): number {
        const builder = frameBuilder(length).addSpring({
          id: "kr",
          startNodeId: "b",
          stiffness: { rz: stiffness },
        });
        fixed(builder);
        return displacement(
          solve(
            builder.addLoadCase({
              id: "LC",
              loads: [{ kind: "nodal", nodeId: "b", force: [0, load, 0] }],
            }),
          ),
          "b",
          "uy",
        );
      }
      const nearFree = solveFor(characteristic * 1e-10);
      const nearFixed = solveFor(characteristic * 1e10);
      return [
        value("k→0 tip deflection", (load * length ** 3) / (3 * E * IZ), nearFree, "m"),
        value("k→∞ tip deflection", (load * length ** 3) / (12 * E * IZ), nearFixed, "m"),
      ];
    },
  ),
  validationCase(
    {
      id: "VAL-07-005",
      category: 7,
      description:
        "A spring remains active when a different DOF at the same node is hard-restrained",
      model: "Single grounded node with ux spring k=900 kN/m.",
      supports: "Node uy is hard-restrained; ux is spring-supported.",
      loads: "Fx=9,000 N and Fy=3,000 N.",
      referenceMethod: "closed-form hand calc",
      frame3ddCoverage: "unsupported",
    },
    () => {
      const stiffness = 900_000;
      const builder = createModelBuilder()
        .setUnitSystem(siUnits)
        .addNode({ id: "n", coordinates: [0, 0, 0] })
        .addSpring({ id: "k", startNodeId: "n", stiffness: { ux: stiffness, uy: 1 } });
      constrain(builder, "n", ["uy"]);
      const output = solve(
        builder.addLoadCase({
          id: "LC",
          loads: [{ kind: "nodal", nodeId: "n", force: [9_000, 3_000, 0] }],
        }),
      );
      return [
        value("spring displacement", 0.01, displacement(output, "n", "ux"), "m"),
        value("hard-restrained displacement", 0, displacement(output, "n", "uy"), "m", 1),
        value("hard-restrained reaction", -3_000, reaction(output, "n", "uy"), "N"),
      ];
    },
  ),
];

const releaseCases: ValidationCase[] = [
  validationCase(
    {
      id: "VAL-08-001",
      category: 8,
      description: "A single end Mz release produces the exact fixed-pinned UDL response",
      model: "5 m Euler beam, end-b rz released.",
      supports: "Both reference nodes fixed in all DOFs.",
      loads: "Uniform local-y load w=-8,000 N/m.",
      referenceMethod: "closed-form hand calc",
      frame3ddCoverage: "direct",
    },
    () => {
      const length = 5;
      const w = -8_000;
      const builder = frameBuilder(length, { end: ["rz"] });
      fixed(builder, "a");
      fixed(builder, "b");
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
        value("released Mz", 0, frameEndForce(output, "f", 11), "N*m", Math.abs(w) * length ** 2),
        value(
          "fixed-end Mz magnitude",
          (Math.abs(w) * length ** 2) / 8,
          Math.abs(frameEndForce(output, "f", 5)),
          "N*m",
        ),
        value("released-end reaction", (-3 * w * length) / 8, reaction(output, "b", "uy"), "N"),
      ];
    },
  ),
  validationCase(
    {
      id: "VAL-08-002",
      category: 8,
      description: "A single end My release is independent of the Mz implementation",
      model: "5 m Euler beam, end-b ry released, Iyy differs from Izz.",
      supports: "Both nodes fixed in all DOFs.",
      loads: "Uniform local-z load w=6,000 N/m.",
      referenceMethod: "closed-form hand calc",
      frame3ddCoverage: "direct",
    },
    () => {
      const length = 5;
      const w = 6_000;
      const builder = frameBuilder(length, { end: ["ry"] });
      fixed(builder, "a");
      fixed(builder, "b");
      const output = solve(
        builder.addLoadCase({
          id: "LC",
          loads: [
            {
              kind: "member-distributed",
              frameId: "f",
              coordinateSystem: "local",
              startIntensity: [0, 0, w],
              endIntensity: [0, 0, w],
            },
          ],
        }),
      );
      return [
        value("released My", 0, frameEndForce(output, "f", 10), "N*m", Math.abs(w) * length ** 2),
        value(
          "fixed-end My magnitude",
          (Math.abs(w) * length ** 2) / 8,
          Math.abs(frameEndForce(output, "f", 4)),
          "N*m",
        ),
        value(
          "released-end reaction magnitude",
          (3 * Math.abs(w) * length) / 8,
          Math.abs(reaction(output, "b", "uz")),
          "N",
        ),
      ];
    },
  ),
  validationCase(
    {
      id: "VAL-08-003",
      category: 8,
      description: "Both-end release in one bending plane leaves the orthogonal plane fixed-fixed",
      model: "4 m Euler beam with rz released at both ends and no ry releases.",
      supports: "Both nodes fixed in all DOFs.",
      loads: "Simultaneous uniform local-y and local-z loads, each -5,000 N/m.",
      referenceMethod: "closed-form hand calc",
      frame3ddCoverage: "direct",
    },
    () => {
      const length = 4;
      const w = -5_000;
      const builder = frameBuilder(length, { start: ["rz"], end: ["rz"] });
      fixed(builder, "a");
      fixed(builder, "b");
      const output = solve(
        builder.addLoadCase({
          id: "LC",
          loads: [
            {
              kind: "member-distributed",
              frameId: "f",
              coordinateSystem: "local",
              startIntensity: [0, w, w],
              endIntensity: [0, w, w],
            },
          ],
        }),
      );
      return [
        value(
          "start released Mz",
          0,
          frameEndForce(output, "f", 5),
          "N*m",
          Math.abs(w) * length ** 2,
        ),
        value(
          "end released Mz",
          0,
          frameEndForce(output, "f", 11),
          "N*m",
          Math.abs(w) * length ** 2,
        ),
        value(
          "start fixed My magnitude",
          (Math.abs(w) * length ** 2) / 12,
          Math.abs(frameEndForce(output, "f", 4)),
          "N*m",
        ),
        value(
          "end fixed My magnitude",
          (Math.abs(w) * length ** 2) / 12,
          Math.abs(frameEndForce(output, "f", 10)),
          "N*m",
        ),
      ];
    },
  ),
  validationCase(
    {
      id: "VAL-08-004",
      category: 8,
      description: "A torsional release transfers all interior torque to the retained end",
      model: "4 m Euler beam with end-b rx released.",
      supports: "Both nodes fixed in all DOFs.",
      loads: "Interior local-x point moment T=7,500 N·m at midspan.",
      referenceMethod: "closed-form hand calc",
      frame3ddCoverage: "direct",
    },
    () => {
      const torque = 7_500;
      const builder = frameBuilder(4, { end: ["rx"] });
      fixed(builder, "a");
      fixed(builder, "b");
      const output = solve(
        builder.addLoadCase({
          id: "LC",
          loads: [
            {
              kind: "member-point-moment",
              frameId: "f",
              coordinateSystem: "local",
              positionRatio: 0.5,
              moment: [torque, 0, 0],
            },
          ],
        }),
      );
      return [
        value("released end torsion", 0, frameEndForce(output, "f", 9), "N*m", torque),
        value(
          "retained end torsion magnitude",
          torque,
          Math.abs(frameEndForce(output, "f", 3)),
          "N*m",
        ),
      ];
    },
  ),
  validationCase(
    {
      id: "VAL-08-005",
      category: 8,
      description:
        "Multiple bending releases plus a torsional end release preserve exact two-force axial behavior",
      model:
        "3 m member with ry and rz released at both ends and rx released at end b; releasing rx at both ends is separately classified as a local mechanism.",
      supports:
        "Start translations fixed; end transverse translations fixed; rotations hard-restrained only to remove inactive rigid modes.",
      loads: "End axial force Fx=36,000 N.",
      referenceMethod: "closed-form hand calc",
      frame3ddCoverage: "direct",
    },
    () => {
      const length = 3;
      const load = 36_000;
      const builder = frameBuilder(length, { start: ["ry", "rz"], end: ["rx", "ry", "rz"] });
      constrain(builder, "a", allDofs);
      constrain(builder, "b", ["uy", "uz", "rx", "ry", "rz"]);
      const output = solve(
        builder.addLoadCase({
          id: "LC",
          loads: [{ kind: "nodal", nodeId: "b", force: [load, 0, 0] }],
        }),
      );
      return [
        value(
          "axial displacement",
          (load * length) / (E * A),
          displacement(output, "b", "ux"),
          "m",
        ),
        value("axial force magnitude", load, Math.abs(frameEndForce(output, "f", 0)), "N"),
        value(
          "maximum released action",
          0,
          Math.max(
            ...[3, 4, 5, 9, 10, 11].map((index) => Math.abs(frameEndForce(output, "f", index))),
          ),
          "N*m",
          load * length,
        ),
      ];
    },
  ),
  validationCase(
    {
      id: "VAL-08-006",
      category: 8,
      description: "A released end under UDL condenses fixed-end forces before global assembly",
      model: "6 m Euler beam with end-b rz released.",
      supports: "Both nodes fixed in all DOFs.",
      loads: "Uniform local-y load w=-4,000 N/m.",
      referenceMethod: "closed-form hand calc",
      frame3ddCoverage: "direct",
    },
    () => {
      const length = 6;
      const w = -4_000;
      const builder = frameBuilder(length, { end: ["rz"] });
      fixed(builder, "a");
      fixed(builder, "b");
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
          Math.abs(w) * length ** 2,
        ),
        value("left reaction", (-5 * w * length) / 8, reaction(output, "a", "uy"), "N"),
        value("right reaction", (-3 * w * length) / 8, reaction(output, "b", "uy"), "N"),
      ];
    },
  ),
  validationCase(
    {
      id: "VAL-08-007",
      category: 8,
      description: "A release pattern that creates a local mechanism is rejected",
      model: "Single member with rz released at both ends and no alternative in-plane load path.",
      supports: "Start reference node fixed; end node otherwise free.",
      loads: "Tip force Fy=-1,000 N.",
      referenceMethod: "self-consistency check",
      frame3ddCoverage: "overlap-indirect",
    },
    () => {
      const builder = frameBuilder(4, { start: ["rz"], end: ["rz"] });
      fixed(builder);
      builder.addLoadCase({
        id: "LC",
        loads: [{ kind: "nodal", nodeId: "b", force: [0, -1_000, 0] }],
      });
      let detected = 0;
      try {
        prepareAnalysis(builder.finalize());
      } catch (error) {
        detected = error instanceof XFrameError && error.code === "GLOBAL_MECHANISM" ? 1 : 0;
      }
      return [value("mechanism detected", 1, detected, "boolean")];
    },
  ),
];

const loadCases: ValidationCase[] = [
  validationCase(
    {
      id: "VAL-09-001",
      category: 9,
      description:
        "Nodal forces and moments in all six global DOFs match independent cantilever formulas",
      model: "3 m global-x Euler cantilever with unequal bending inertias.",
      supports: "Base fixed; tip free.",
      loads: "Six separate load cases: unit-scaled Fx, Fy, Fz, Mx, My, and Mz.",
      referenceMethod: "closed-form hand calc",
      frame3ddCoverage: "direct",
    },
    () => {
      const length = 3;
      const actions = [
        {
          id: "Fx",
          load: { kind: "nodal" as const, nodeId: "b", force: [10_000, 0, 0] as const },
          dof: "ux" as const,
          expected: (10_000 * length) / (E * A),
        },
        {
          id: "Fy",
          load: { kind: "nodal" as const, nodeId: "b", force: [0, -12_000, 0] as const },
          dof: "uy" as const,
          expected: (-12_000 * length ** 3) / (3 * E * IZ),
        },
        {
          id: "Fz",
          load: { kind: "nodal" as const, nodeId: "b", force: [0, 0, 14_000] as const },
          dof: "uz" as const,
          expected: (14_000 * length ** 3) / (3 * E * IY),
        },
        {
          id: "Mx",
          load: { kind: "nodal" as const, nodeId: "b", moment: [6_000, 0, 0] as const },
          dof: "rx" as const,
          expected: (6_000 * length) / (G * J),
        },
        {
          id: "My",
          load: { kind: "nodal" as const, nodeId: "b", moment: [0, 7_000, 0] as const },
          dof: "ry" as const,
          expected: (7_000 * length) / (E * IY),
        },
        {
          id: "Mz",
          load: { kind: "nodal" as const, nodeId: "b", moment: [0, 0, -8_000] as const },
          dof: "rz" as const,
          expected: (-8_000 * length) / (E * IZ),
        },
      ];
      let builder = frameBuilder(length);
      fixed(builder);
      for (const action of actions)
        builder = builder.addLoadCase({ id: action.id, loads: [action.load] });
      const analysis = prepareAnalysis(builder.finalize());
      return actions.map((action) =>
        value(
          action.id,
          action.expected,
          displacement(analysis.solveCase(action.id), "b", action.dof),
          action.dof.startsWith("r") ? "rad" : "m",
        ),
      );
    },
  ),
  ...[0.25, 1 / 3].map((ratio, index) =>
    validationCase(
      {
        id: `VAL-09-00${index + 2}`,
        category: 9,
        description: `Interior point force at ${ratio === 0.25 ? "quarter-span" : "one-third-span"} matches cantilever closed form`,
        model: "6 m Euler cantilever.",
        supports: "Base fixed; tip free.",
        loads: `Local-y point force P=-15,000 N at x/L=${ratio}.`,
        referenceMethod: "closed-form hand calc",
        frame3ddCoverage: "overlap-indirect",
        notes:
          "Frame3DD point-load outputs are retained separately because two interpolation defects were observed in the supplied binary.",
      },
      () => {
        const length = 6;
        const position = ratio * length;
        const load = -15_000;
        const builder = frameBuilder(length);
        fixed(builder);
        const output = solve(
          builder.addLoadCase({
            id: "LC",
            loads: [
              {
                kind: "member-point-force",
                frameId: "f",
                coordinateSystem: "local",
                positionRatio: ratio,
                force: [0, load, 0],
              },
            ],
          }),
        );
        return [
          value(
            "tip deflection",
            (load * position ** 2 * (3 * length - position)) / (6 * E * IZ),
            displacement(output, "b", "uy"),
            "m",
          ),
          value(
            "tip rotation",
            (load * position ** 2) / (2 * E * IZ),
            displacement(output, "b", "rz"),
            "rad",
          ),
        ];
      },
    ),
  ),
  validationCase(
    {
      id: "VAL-09-004",
      category: 9,
      description: "An interior point moment creates the exact bending-moment jump",
      model: "5 m Euler cantilever.",
      supports: "Base fixed; tip free.",
      loads: "Local-z point moment M=18,000 N·m at x=2 m.",
      referenceMethod: "closed-form hand calc",
      frame3ddCoverage: "overlap-indirect",
    },
    () => {
      const moment = 18_000;
      const position = 2;
      const builder = frameBuilder(5);
      fixed(builder);
      const output = solve(
        builder.addLoadCase({
          id: "LC",
          loads: [
            {
              kind: "member-point-moment",
              frameId: "f",
              coordinateSystem: "local",
              distanceFromElasticStart: position,
              moment: [0, 0, moment],
            },
          ],
        }),
      );
      const frame = output.frames[0]!;
      const stations = frame.internalForces.filter(({ x }) => Math.abs(x - position) < 1e-12);
      return [
        value(
          "moment jump magnitude",
          moment,
          Math.abs(stations[1]!.bendingZ - stations[0]!.bendingZ),
          "N*m",
        ),
        value("base moment magnitude", moment, Math.abs(frameEndForce(output, "f", 5)), "N*m"),
      ];
    },
  ),
  validationCase(
    {
      id: "VAL-09-005",
      category: 9,
      description:
        "Global-direction UDL on an inclined member equals its transformed local-direction model",
      model: "Inclined 4.5 m Euler cantilever from [0,0,0] to [3,2,2.6926].",
      supports: "Base fixed; tip free.",
      loads: "Equivalent uniform load vectors represented once globally and once locally.",
      referenceMethod: "equivalent-model cross-check",
      frame3ddCoverage: "direct",
    },
    () => {
      const end = [3, 2, Math.sqrt(8.25)] as const;
      const length = 4.5;
      const axes = buildLocalAxes([0, 0, 0], end, [0, 0, 1]);
      const local = [120, -850, 430] as const;
      const global = tuple3(
        [0, 1, 2].map(
          (row) =>
            axes.localToGlobal[row * 3]! * local[0] +
            axes.localToGlobal[row * 3 + 1]! * local[1] +
            axes.localToGlobal[row * 3 + 2]! * local[2],
        ),
      );
      function run(
        coordinateSystem: "local" | "global",
        intensity: readonly [number, number, number],
      ) {
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
        fixed(builder);
        return solve(
          builder.addLoadCase({
            id: "LC",
            loads: [
              {
                kind: "member-distributed",
                frameId: "f",
                coordinateSystem,
                startIntensity: intensity,
                endIntensity: intensity,
              },
            ],
          }),
        );
      }
      const localResult = run("local", local);
      const globalResult = run("global", global);
      return allDofs.map((dof) =>
        value(
          `tip ${dof}`,
          displacement(localResult, "b", dof),
          displacement(globalResult, "b", dof),
          dof.startsWith("r") ? "rad" : "m",
          1,
        ),
      );
    },
  ),
  validationCase(
    {
      id: "VAL-09-006",
      category: 9,
      description:
        "Partial trapezoidal load reactions equal independent resultant and centroid integration",
      model: "7 m Euler cantilever; load acts from x=1.2 m to x=5.8 m.",
      supports: "Base fixed; tip free.",
      loads: "Local-y intensity varies linearly from -3,000 to -11,000 N/m.",
      referenceMethod: "closed-form hand calc",
      frame3ddCoverage: "direct",
    },
    () => {
      const start = 1.2;
      const end = 5.8;
      const w0 = -3_000;
      const w1 = -11_000;
      const span = end - start;
      const resultant = (span * (w0 + w1)) / 2;
      const firstMomentFromStart = (span ** 2 * (w0 + 2 * w1)) / 6;
      const centroid = start + firstMomentFromStart / resultant;
      const builder = frameBuilder(7);
      fixed(builder);
      const output = solve(
        builder.addLoadCase({
          id: "LC",
          loads: [
            {
              kind: "member-distributed",
              frameId: "f",
              coordinateSystem: "local",
              startDistanceFromElasticStart: start,
              endDistanceFromElasticStart: end,
              startIntensity: [0, w0, 0],
              endIntensity: [0, w1, 0],
            },
          ],
        }),
      );
      return [
        value("base shear", -resultant, reaction(output, "a", "uy"), "N"),
        value("base moment", -resultant * centroid, reaction(output, "a", "rz"), "N*m"),
      ];
    },
  ),
  validationCase(
    {
      id: "VAL-09-007",
      category: 9,
      description:
        "Self-weight on horizontal and inclined members balances exact mass times gravity",
      model:
        "Two independent 3 m frames with identical A and density; one horizontal, one inclined.",
      supports: "Both frame starts fixed.",
      loads: "Global gravity vector [1.2,-9.81,2.4] m/s² applied as self-weight.",
      referenceMethod: "closed-form hand calc",
      frame3ddCoverage: "direct",
    },
    () => {
      const gravity = [1.2, -9.81, 2.4] as const;
      const density = 7850;
      const length = 3;
      const mass = density * A * length;
      let builder = createModelBuilder()
        .setUnitSystem(siUnits)
        .addNode({ id: "a", coordinates: [0, 0, 0] })
        .addNode({ id: "b", coordinates: [3, 0, 0] })
        .addNode({ id: "c", coordinates: [10, 0, 0] })
        .addNode({ id: "d", coordinates: [11, 2, 2] })
        .addMaterial({ id: "m", elasticModulus: E, shearModulus: G, density })
        .addFrameSection({
          id: "s",
          area: A,
          torsionalConstant: J,
          momentOfInertiaY: IY,
          momentOfInertiaZ: IZ,
        })
        .addFrame({
          id: "h",
          startNodeId: "a",
          endNodeId: "b",
          materialId: "m",
          sectionId: "s",
          theory: { kind: "euler-bernoulli" },
          orientation: [0, 1, 0],
        })
        .addFrame({
          id: "i",
          startNodeId: "c",
          endNodeId: "d",
          materialId: "m",
          sectionId: "s",
          theory: { kind: "euler-bernoulli" },
          orientation: [0, 0, 1],
        });
      fixed(builder, "a");
      fixed(builder, "c");
      const output = solve(
        builder.addLoadCase({ id: "LC", loads: [{ kind: "self-weight", gravity }] }),
      );
      const values = [];
      for (const [nodeId, prefix] of [
        ["a", "horizontal"],
        ["c", "inclined"],
      ] as const) {
        values.push(value(`${prefix} Rx`, -mass * gravity[0], reaction(output, nodeId, "ux"), "N"));
        values.push(value(`${prefix} Ry`, -mass * gravity[1], reaction(output, nodeId, "uy"), "N"));
        values.push(value(`${prefix} Rz`, -mass * gravity[2], reaction(output, nodeId, "uz"), "N"));
      }
      return values;
    },
  ),
  validationCase(
    {
      id: "VAL-09-008",
      category: 9,
      description: "A combined load case is exact superposition of separately solved cases",
      model: "4 m Euler cantilever with three compatible load cases.",
      supports: "Base fixed; tip free.",
      loads: "Case A tip force, case B UDL, case AB contains both.",
      referenceMethod: "self-consistency check",
      frame3ddCoverage: "direct",
    },
    () => {
      let builder = frameBuilder(4);
      fixed(builder);
      const point = { kind: "nodal" as const, nodeId: "b", force: [0, -10_000, 0] as const };
      const udl = {
        kind: "member-distributed" as const,
        frameId: "f",
        coordinateSystem: "local" as const,
        startIntensity: [0, -2_000, 0] as const,
        endIntensity: [0, -2_000, 0] as const,
      };
      builder = builder
        .addLoadCase({ id: "A", loads: [point] })
        .addLoadCase({ id: "B", loads: [udl] })
        .addLoadCase({ id: "AB", loads: [point, udl] });
      const analysis = prepareAnalysis(builder.finalize());
      const a = analysis.solveCase("A");
      const b = analysis.solveCase("B");
      const ab = analysis.solveCase("AB");
      const combined = combineResults("C", [
        { result: a, factor: 1 },
        { result: b, factor: 1 },
      ]);
      return [
        value(
          "tip uy",
          displacement(ab, "b", "uy"),
          combined.nodes
            .find(({ id }) => id === "b")!
            .displacements.find(({ dof }) => dof === "uy")!.value,
          "m",
          1,
        ),
        value(
          "base Mz",
          frameEndForce(ab, "f", 5),
          combined.frames.find(({ id }) => id === "f")!.localEndForces[5]!,
          "N*m",
          1,
        ),
        value(
          "full displacement max difference",
          0,
          Math.max(
            ...ab.fullDisplacements.map((entry, index) =>
              Math.abs(entry - combined.fullDisplacements[index]!),
            ),
          ),
          "m",
          1,
        ),
      ];
    },
  ),
];

export const springReleaseLoadValidationCases = Object.freeze([
  ...springCases,
  ...releaseCases,
  ...loadCases,
]);
