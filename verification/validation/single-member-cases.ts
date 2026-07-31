import { createModelBuilder, type DofName, type FrameTheoryInput, type ModelBuilder } from "../../src/index.js";
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

function addPlanarNode(builder: ModelBuilder, id: string, x: number): ModelBuilder {
  return builder.addNode({ id, coordinates: [x, 0, 0] });
}

function addPlanarFrame(builder: ModelBuilder, id: string, start: string, end: string, theory: FrameTheoryInput = { kind: "euler-bernoulli" }): ModelBuilder {
  return builder.addFrame({
    id,
    startNodeId: start,
    endNodeId: end,
    materialId: "m",
    sectionId: "s",
    theory,
    orientation: [0, 1, 0],
  });
}

function planarBuilder(nodes: readonly [string, number][], frames: readonly [string, string, string][]): ModelBuilder {
  let builder = createModelBuilder()
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
    });
  for (const [id, x] of nodes) builder = addPlanarNode(builder, id, x);
  for (const [id, start, end] of frames) builder = addPlanarFrame(builder, id, start, end);
  return builder;
}

const outOfPlane = ["tz", "rx", "ry"] as const satisfies readonly DofName[];

function pin(builder: ModelBuilder, nodeId: string, fixAxial = false): void {
  constrain(builder, nodeId, fixAxial ? ["tx", "ty", ...outOfPlane] : ["ty", ...outOfPlane], `pin:${nodeId}`);
}

function cantileverCase(options: {
  readonly id: string;
  readonly description: string;
  readonly length: number;
  readonly load: { readonly force?: readonly [number, number, number]; readonly moment?: readonly [number, number, number] };
  readonly dof: DofName;
  readonly reference: number;
  readonly units: string;
  readonly modelDetail: string;
}): ValidationCase {
  return validationCase({
    id: options.id,
    category: 1,
    description: options.description,
    model: options.modelDetail,
    supports: "Node a fixed in all six global DOFs; node b free.",
    loads: `Tip nodal action ${JSON.stringify(options.load)} at node b.`,
    referenceMethod: "closed-form hand calc",
    frame3ddCoverage: "direct",
  }, () => {
    const builder = prismaticFrameBuilder({
      length: options.length,
      elasticModulus: E,
      shearModulus: G,
      area: A,
      inertiaY: IY,
      inertiaZ: IZ,
      torsionalConstant: J,
    });
    constrain(builder, "a", allDofs);
    const result = solve(builder.addLoadCase({ id: "LC", loads: [{ kind: "nodal", nodeId: "b", ...options.load }] }));
    return [value(options.dof, options.reference, displacement(result, "b", options.dof), options.units, options.reference)];
  });
}

const singleMemberCases: ValidationCase[] = [
  cantileverCase({
    id: "VAL-01-001",
    description: "Euler cantilever tip point load about the strong bending axis",
    length: 3.6,
    load: { force: [0, 18_000, 0] },
    dof: "ty",
    reference: (18_000 * 3.6 ** 3) / (3 * E * IZ),
    units: "m",
    modelDetail: `L=3.6 m, A=${A} m², Izz=${IZ} m⁴, E=${E} Pa, Euler-Bernoulli.`,
  }),
  cantileverCase({
    id: "VAL-01-002",
    description: "Euler cantilever tip point load about the weak bending axis",
    length: 3.6,
    load: { force: [0, 0, 18_000] },
    dof: "tz",
    reference: (18_000 * 3.6 ** 3) / (3 * E * IY),
    units: "m",
    modelDetail: `L=3.6 m, A=${A} m², Iyy=${IY} m⁴, E=${E} Pa, Euler-Bernoulli.`,
  }),
  cantileverCase({
    id: "VAL-01-003",
    description: "Euler cantilever axial tip load",
    length: 3.6,
    load: { force: [18_000, 0, 0] },
    dof: "tx",
    reference: (18_000 * 3.6) / (E * A),
    units: "m",
    modelDetail: `L=3.6 m, A=${A} m², E=${E} Pa, Euler-Bernoulli.`,
  }),
  cantileverCase({
    id: "VAL-01-004",
    description: "Euler cantilever tip torque",
    length: 3.6,
    load: { moment: [11_000, 0, 0] },
    dof: "rx",
    reference: (11_000 * 3.6) / (G * J),
    units: "rad",
    modelDetail: `L=3.6 m, J=${J} m⁴, G=${G} Pa, Euler-Bernoulli.`,
  }),
  cantileverCase({
    id: "VAL-01-005",
    description: "Euler cantilever strong-axis tip moment",
    length: 3.6,
    load: { moment: [0, 0, 11_000] },
    dof: "rz",
    reference: (11_000 * 3.6) / (E * IZ),
    units: "rad",
    modelDetail: `L=3.6 m, Izz=${IZ} m⁴, E=${E} Pa, Euler-Bernoulli.`,
  }),
  cantileverCase({
    id: "VAL-01-006",
    description: "Euler cantilever weak-axis tip moment",
    length: 3.6,
    load: { moment: [0, 11_000, 0] },
    dof: "ry",
    reference: (11_000 * 3.6) / (E * IY),
    units: "rad",
    modelDetail: `L=3.6 m, Iyy=${IY} m⁴, E=${E} Pa, Euler-Bernoulli.`,
  }),
  validationCase({
    id: "VAL-01-007",
    category: 1,
    description: "Euler cantilever full-span UDL",
    model: `L=4.2 m, Izz=${IZ} m⁴, E=${E} Pa, Euler-Bernoulli.`,
    supports: "Node a fixed in all six global DOFs; node b free.",
    loads: "Uniform local-y distributed load w=-9,000 N/m over the full span.",
    referenceMethod: "closed-form hand calc",
    frame3ddCoverage: "direct",
  }, () => {
    const length = 4.2;
    const w = -9_000;
    const builder = prismaticFrameBuilder({ length, elasticModulus: E, shearModulus: G, area: A, inertiaY: IY, inertiaZ: IZ, torsionalConstant: J });
    constrain(builder, "a", allDofs);
    const result = solve(builder.addLoadCase({ id: "LC", loads: [{ kind: "member-distributed", frameId: "f", coordinateSystem: "local", startIntensity: [0, w, 0], endIntensity: [0, w, 0] }] }));
    return [
      value("tip ty", (w * length ** 4) / (8 * E * IZ), displacement(result, "b", "ty"), "m"),
      value("base Fy", -w * length, reaction(result, "a", "ty"), "N"),
      value("base Mz", (-w * length ** 2) / 2, reaction(result, "a", "rz"), "N*m"),
    ];
  }),
  validationCase({
    id: "VAL-01-008",
    category: 1,
    description: "Simply supported beam with a midspan point load",
    model: `Two equal Euler elements, total L=6 m, Izz=${IZ} m⁴, E=${E} Pa.`,
    supports: "Node a pinned with axial restraint; node c roller; planar unused DOFs restrained.",
    loads: "Midspan nodal force P=-24,000 N at node b.",
    referenceMethod: "closed-form hand calc",
    frame3ddCoverage: "overlap-indirect",
  }, () => {
    const length = 6;
    const load = -24_000;
    const builder = planarBuilder([["a", 0], ["b", length / 2], ["c", length]], [["f1", "a", "b"], ["f2", "b", "c"]]);
    pin(builder, "a", true);
    pin(builder, "c");
    const result = solve(builder.addLoadCase({ id: "LC", loads: [{ kind: "nodal", nodeId: "b", force: [0, load, 0] }] }));
    return [
      value("midspan ty", (load * length ** 3) / (48 * E * IZ), displacement(result, "b", "ty"), "m"),
      value("left reaction", -load / 2, reaction(result, "a", "ty"), "N"),
      value("right reaction", -load / 2, reaction(result, "c", "ty"), "N"),
    ];
  }),
  validationCase({
    id: "VAL-01-009",
    category: 1,
    description: "Simply supported beam with full-span UDL",
    model: `Two equal Euler elements, total L=6 m, Izz=${IZ} m⁴, E=${E} Pa.`,
    supports: "Node a pinned with axial restraint; node c roller; planar unused DOFs restrained.",
    loads: "Uniform local-y load w=-8,000 N/m on both half-span elements.",
    referenceMethod: "closed-form hand calc",
    frame3ddCoverage: "direct",
  }, () => {
    const length = 6;
    const w = -8_000;
    const builder = planarBuilder([["a", 0], ["b", length / 2], ["c", length]], [["f1", "a", "b"], ["f2", "b", "c"]]);
    pin(builder, "a", true);
    pin(builder, "c");
    const loads = ["f1", "f2"].map((frameId) => ({ kind: "member-distributed" as const, frameId, coordinateSystem: "local" as const, startIntensity: [0, w, 0] as const, endIntensity: [0, w, 0] as const }));
    const result = solve(builder.addLoadCase({ id: "LC", loads }));
    return [
      value("midspan ty", (5 * w * length ** 4) / (384 * E * IZ), displacement(result, "b", "ty"), "m"),
      value("left reaction", (-w * length) / 2, reaction(result, "a", "ty"), "N"),
      value("right reaction", (-w * length) / 2, reaction(result, "c", "ty"), "N"),
    ];
  }),
  validationCase({
    id: "VAL-01-010",
    category: 1,
    description: "Simply supported beam with unequal end moments",
    model: `Single Euler member L=5 m, Izz=${IZ} m⁴, E=${E} Pa.`,
    supports: "Node a pinned with axial restraint; node b roller; planar unused DOFs restrained.",
    loads: "Global end moments Mz(a)=7,000 N*m and Mz(b)=-3,000 N*m.",
    referenceMethod: "closed-form hand calc",
    frame3ddCoverage: "direct",
  }, () => {
    const length = 5;
    const ma = 7_000;
    const mb = -3_000;
    const builder = prismaticFrameBuilder({ length, elasticModulus: E, shearModulus: G, area: A, inertiaY: IY, inertiaZ: IZ, torsionalConstant: J });
    pin(builder, "a", true);
    pin(builder, "b");
    const result = solve(builder.addLoadCase({ id: "LC", loads: [
      { kind: "nodal", nodeId: "a", moment: [0, 0, ma] },
      { kind: "nodal", nodeId: "b", moment: [0, 0, mb] },
    ] }));
    const leftSlope = (length * (2 * ma - mb)) / (6 * E * IZ);
    const rightSlope = (length * (-ma + 2 * mb)) / (6 * E * IZ);
    return [
      value("left rotation rz", leftSlope, displacement(result, "a", "rz"), "rad"),
      value("right rotation rz", rightSlope, displacement(result, "b", "rz"), "rad"),
      value("left vertical reaction", (ma + mb) / length, reaction(result, "a", "ty"), "N"),
      value("right vertical reaction", -(ma + mb) / length, reaction(result, "b", "ty"), "N"),
    ];
  }),
  validationCase({
    id: "VAL-01-011",
    category: 1,
    description: "Fixed-fixed beam with a central point load",
    model: `Two equal Euler elements, total L=6 m, Izz=${IZ} m⁴, E=${E} Pa.`,
    supports: "Both end nodes fixed in all six DOFs.",
    loads: "Central nodal force P=-24,000 N.",
    referenceMethod: "published benchmark table",
    frame3ddCoverage: "direct",
  }, () => {
    const length = 6;
    const load = -24_000;
    const builder = planarBuilder([["a", 0], ["b", length / 2], ["c", length]], [["f1", "a", "b"], ["f2", "b", "c"]]);
    constrain(builder, "a", allDofs);
    constrain(builder, "c", allDofs);
    const result = solve(builder.addLoadCase({ id: "LC", loads: [{ kind: "nodal", nodeId: "b", force: [0, load, 0] }] }));
    return [
      value("midspan ty", (load * length ** 3) / (192 * E * IZ), displacement(result, "b", "ty"), "m"),
      value("left reaction", -load / 2, reaction(result, "a", "ty"), "N"),
      value("right reaction", -load / 2, reaction(result, "c", "ty"), "N"),
      value("left fixed-end moment magnitude", Math.abs(load * length) / 8, Math.abs(reaction(result, "a", "rz")), "N*m"),
      value("right fixed-end moment magnitude", Math.abs(load * length) / 8, Math.abs(reaction(result, "c", "rz")), "N*m"),
    ];
  }),
  validationCase({
    id: "VAL-01-012",
    category: 1,
    description: "Fixed-fixed beam with full-span UDL",
    model: `Two equal Euler elements, total L=6 m, Izz=${IZ} m⁴, E=${E} Pa.`,
    supports: "Both end nodes fixed in all six DOFs.",
    loads: "Uniform local-y load w=-8,000 N/m on both half-span elements.",
    referenceMethod: "published benchmark table",
    frame3ddCoverage: "direct",
  }, () => {
    const length = 6;
    const w = -8_000;
    const builder = planarBuilder([["a", 0], ["b", length / 2], ["c", length]], [["f1", "a", "b"], ["f2", "b", "c"]]);
    constrain(builder, "a", allDofs);
    constrain(builder, "c", allDofs);
    const loads = ["f1", "f2"].map((frameId) => ({ kind: "member-distributed" as const, frameId, coordinateSystem: "local" as const, startIntensity: [0, w, 0] as const, endIntensity: [0, w, 0] as const }));
    const result = solve(builder.addLoadCase({ id: "LC", loads }));
    return [
      value("midspan ty", (w * length ** 4) / (384 * E * IZ), displacement(result, "b", "ty"), "m"),
      value("left reaction", (-w * length) / 2, reaction(result, "a", "ty"), "N"),
      value("right reaction", (-w * length) / 2, reaction(result, "c", "ty"), "N"),
      value("left fixed-end moment magnitude", Math.abs(w) * length ** 2 / 12, Math.abs(reaction(result, "a", "rz")), "N*m"),
      value("right fixed-end moment magnitude", Math.abs(w) * length ** 2 / 12, Math.abs(reaction(result, "c", "rz")), "N*m"),
    ];
  }),
  validationCase({
    id: "VAL-01-013",
    category: 1,
    description: "Propped cantilever with a central point load",
    model: `Two equal Euler elements, total L=6 m, Izz=${IZ} m⁴, E=${E} Pa.`,
    supports: "Node a fixed; node c vertical roller with planar unused DOFs restrained.",
    loads: "Central nodal force P=-24,000 N.",
    referenceMethod: "closed-form hand calc",
    frame3ddCoverage: "direct",
  }, () => {
    const length = 6;
    const load = -24_000;
    const builder = planarBuilder([["a", 0], ["b", length / 2], ["c", length]], [["f1", "a", "b"], ["f2", "b", "c"]]);
    constrain(builder, "a", allDofs);
    pin(builder, "c");
    const result = solve(builder.addLoadCase({ id: "LC", loads: [{ kind: "nodal", nodeId: "b", force: [0, load, 0] }] }));
    return [
      value("prop reaction", (-5 * load) / 16, reaction(result, "c", "ty"), "N"),
      value("fixed vertical reaction", (-11 * load) / 16, reaction(result, "a", "ty"), "N"),
      value("fixed moment magnitude", Math.abs(3 * load * length) / 16, Math.abs(reaction(result, "a", "rz")), "N*m"),
    ];
  }),
  validationCase({
    id: "VAL-01-014",
    category: 1,
    description: "Propped cantilever with full-span UDL",
    model: `Two equal Euler elements, total L=6 m, Izz=${IZ} m⁴, E=${E} Pa.`,
    supports: "Node a fixed; node c vertical roller with planar unused DOFs restrained.",
    loads: "Uniform local-y load w=-8,000 N/m on both half-span elements.",
    referenceMethod: "closed-form hand calc",
    frame3ddCoverage: "direct",
  }, () => {
    const length = 6;
    const w = -8_000;
    const builder = planarBuilder([["a", 0], ["b", length / 2], ["c", length]], [["f1", "a", "b"], ["f2", "b", "c"]]);
    constrain(builder, "a", allDofs);
    pin(builder, "c");
    const loads = ["f1", "f2"].map((frameId) => ({ kind: "member-distributed" as const, frameId, coordinateSystem: "local" as const, startIntensity: [0, w, 0] as const, endIntensity: [0, w, 0] as const }));
    const result = solve(builder.addLoadCase({ id: "LC", loads }));
    return [
      value("prop reaction", (-3 * w * length) / 8, reaction(result, "c", "ty"), "N"),
      value("fixed vertical reaction", (-5 * w * length) / 8, reaction(result, "a", "ty"), "N"),
      value("fixed moment magnitude", Math.abs(w) * length ** 2 / 8, Math.abs(reaction(result, "a", "rz")), "N*m"),
    ];
  }),
  validationCase({
    id: "VAL-01-015",
    category: 1,
    description: "Simply supported beam with a loaded overhang",
    model: `Euler beam with support span L=5 m and overhang a=2 m, Izz=${IZ} m⁴.`,
    supports: "Node a pin with axial restraint; node b roller; free overhang tip c.",
    loads: "Downward tip load P=-15,000 N at c.",
    referenceMethod: "closed-form hand calc",
    frame3ddCoverage: "direct",
  }, () => {
    const length = 5;
    const overhang = 2;
    const load = -15_000;
    const builder = planarBuilder([["a", 0], ["b", length], ["c", length + overhang]], [["f1", "a", "b"], ["f2", "b", "c"]]);
    pin(builder, "a", true);
    pin(builder, "b");
    const result = solve(builder.addLoadCase({ id: "LC", loads: [{ kind: "nodal", nodeId: "c", force: [0, load, 0] }] }));
    return [
      value("left reaction", (load * overhang) / length, reaction(result, "a", "ty"), "N"),
      value("right reaction", (-load * (length + overhang)) / length, reaction(result, "b", "ty"), "N"),
      value("support moment magnitude", Math.abs(load * overhang), Math.abs(frameEndForce(result, "f1", 11)), "N*m"),
    ];
  }),
  validationCase({
    id: "VAL-01-016",
    category: 1,
    description: "Two-span continuous beam under equal full-span UDL",
    model: `Two equal Euler spans L=4 m, Izz=${IZ} m⁴, E=${E} Pa.`,
    supports: "Three simple supports; first support restrains axial translation; planar unused DOFs restrained.",
    loads: "Uniform local-y load w=-10,000 N/m on each span.",
    referenceMethod: "published benchmark table",
    frame3ddCoverage: "direct",
  }, () => {
    const length = 4;
    const w = -10_000;
    const builder = planarBuilder([["a", 0], ["b", length], ["c", 2 * length]], [["f1", "a", "b"], ["f2", "b", "c"]]);
    pin(builder, "a", true);
    pin(builder, "b");
    pin(builder, "c");
    const loads = ["f1", "f2"].map((frameId) => ({ kind: "member-distributed" as const, frameId, coordinateSystem: "local" as const, startIntensity: [0, w, 0] as const, endIntensity: [0, w, 0] as const }));
    const result = solve(builder.addLoadCase({ id: "LC", loads }));
    return [
      value("left reaction", (-3 * w * length) / 8, reaction(result, "a", "ty"), "N"),
      value("interior reaction", (-5 * w * length) / 4, reaction(result, "b", "ty"), "N"),
      value("right reaction", (-3 * w * length) / 8, reaction(result, "c", "ty"), "N"),
      value("interior support moment magnitude", Math.abs(w) * length ** 2 / 8, Math.abs(frameEndForce(result, "f1", 11)), "N*m"),
    ];
  }),
  validationCase({
    id: "VAL-01-017",
    category: 1,
    description: "Three-span continuous beam under equal full-span UDL",
    model: `Three equal Euler spans L=4 m, Izz=${IZ} m⁴, E=${E} Pa.`,
    supports: "Four simple supports; first support restrains axial translation; planar unused DOFs restrained.",
    loads: "Uniform local-y load w=-10,000 N/m on all three spans.",
    referenceMethod: "published benchmark table",
    frame3ddCoverage: "direct",
  }, () => {
    const length = 4;
    const w = -10_000;
    const builder = planarBuilder([["a", 0], ["b", length], ["c", 2 * length], ["d", 3 * length]], [["f1", "a", "b"], ["f2", "b", "c"], ["f3", "c", "d"]]);
    pin(builder, "a", true);
    pin(builder, "b");
    pin(builder, "c");
    pin(builder, "d");
    const loads = ["f1", "f2", "f3"].map((frameId) => ({ kind: "member-distributed" as const, frameId, coordinateSystem: "local" as const, startIntensity: [0, w, 0] as const, endIntensity: [0, w, 0] as const }));
    const result = solve(builder.addLoadCase({ id: "LC", loads }));
    return [
      value("end reaction a", -0.4 * w * length, reaction(result, "a", "ty"), "N"),
      value("interior reaction b", -1.1 * w * length, reaction(result, "b", "ty"), "N"),
      value("interior reaction c", -1.1 * w * length, reaction(result, "c", "ty"), "N"),
      value("end reaction d", -0.4 * w * length, reaction(result, "d", "ty"), "N"),
      value("support moment b magnitude", Math.abs(w) * length ** 2 / 10, Math.abs(frameEndForce(result, "f1", 11)), "N*m"),
      value("support moment c magnitude", Math.abs(w) * length ** 2 / 10, Math.abs(frameEndForce(result, "f2", 11)), "N*m"),
    ];
  }),
];

const timoshenkoCases: ValidationCase[] = [
  validationCase({
    id: "VAL-02-001",
    category: 2,
    description: "Deep Timoshenko cantilever tip load includes exact shear deformation",
    model: "L=1.0 m, A=0.12 m², Izz=0.0036 m⁴, Asy=0.10 m², E=30 GPa, G=12 GPa.",
    supports: "Node a fixed; node b free.",
    loads: "Tip local/global-y force P=120,000 N.",
    referenceMethod: "closed-form hand calc",
    frame3ddCoverage: "direct",
  }, () => {
    const length = 1;
    const load = 120_000;
    const elasticModulus = 30e9;
    const shearModulus = 12e9;
    const inertia = 0.0036;
    const shearArea = 0.1;
    const builder = prismaticFrameBuilder({ length, elasticModulus, shearModulus, area: 0.12, inertiaY: inertia, inertiaZ: inertia, torsionalConstant: 0.002, shearAreaY: shearArea, shearAreaZ: shearArea, theory: { kind: "timoshenko" } });
    constrain(builder, "a", allDofs);
    const result = solve(builder.addLoadCase({ id: "LC", loads: [{ kind: "nodal", nodeId: "b", force: [0, load, 0] }] }));
    const reference = (load * length ** 3) / (3 * elasticModulus * inertia) + (load * length) / (shearModulus * shearArea);
    return [value("tip ty", reference, displacement(result, "b", "ty"), "m")];
  }),
  validationCase({
    id: "VAL-02-002",
    category: 2,
    description: "Timoshenko cantilever under pure tip moment equals Euler-Bernoulli",
    model: "Same deep beam analyzed once as Euler-Bernoulli and once as Timoshenko.",
    supports: "Node a fixed; node b free.",
    loads: "Tip moment Mz=80,000 N*m; no shear force.",
    referenceMethod: "closed-form hand calc",
    frame3ddCoverage: "direct",
  }, () => {
    const length = 1;
    const moment = 80_000;
    const elasticModulus = 30e9;
    const inertia = 0.0036;
    const outputs: number[] = [];
    for (const theory of [{ kind: "euler-bernoulli" }, { kind: "timoshenko" }] as const) {
      const builder = prismaticFrameBuilder({ length, elasticModulus, shearModulus: 12e9, area: 0.12, inertiaY: inertia, inertiaZ: inertia, torsionalConstant: 0.002, shearAreaY: 0.1, shearAreaZ: 0.1, theory });
      constrain(builder, "a", allDofs);
      outputs.push(displacement(solve(builder.addLoadCase({ id: "LC", loads: [{ kind: "nodal", nodeId: "b", moment: [0, 0, moment] }] })), "b", "rz"));
    }
    const reference = (moment * length) / (elasticModulus * inertia);
    return [
      value("Euler tip rotation", reference, outputs[0]!, "rad"),
      value("Timoshenko tip rotation", reference, outputs[1]!, "rad"),
      value("theory difference", 0, outputs[1]! - outputs[0]!, "rad", reference),
    ];
  }),
  validationCase({
    id: "VAL-02-003",
    category: 2,
    description: "Timoshenko slenderness sweep converges monotonically to Euler-Bernoulli",
    model: "Rectangular beam b=0.2 m, d=0.4 m, As=5A/6, L/d={2,5,10,20,50}.",
    supports: "Cantilever fixed at a.",
    loads: "Tip local-y force P=10,000 N.",
    referenceMethod: "closed-form hand calc",
    frame3ddCoverage: "overlap-indirect",
  }, () => {
    const b = 0.2;
    const d = 0.4;
    const area = b * d;
    const inertia = (b * d ** 3) / 12;
    const shearArea = (5 * area) / 6;
    const load = 10_000;
    const ratios = [2, 5, 10, 20, 50];
    const values = [];
    let previousExcess = Number.POSITIVE_INFINITY;
    for (const ratio of ratios) {
      const length = ratio * d;
      const builder = prismaticFrameBuilder({ length, elasticModulus: E, shearModulus: G, area, inertiaY: inertia, inertiaZ: inertia, torsionalConstant: J, shearAreaY: shearArea, shearAreaZ: shearArea, theory: { kind: "timoshenko" } });
      constrain(builder, "a", allDofs);
      const actual = displacement(solve(builder.addLoadCase({ id: "LC", loads: [{ kind: "nodal", nodeId: "b", force: [0, load, 0] }] })), "b", "ty");
      const reference = (load * length ** 3) / (3 * E * inertia) + (load * length) / (G * shearArea);
      const euler = (load * length ** 3) / (3 * E * inertia);
      const excess = actual / euler - 1;
      if (!(excess < previousExcess)) throw new Error(`Timoshenko excess did not decrease at L/d=${ratio}.`);
      previousExcess = excess;
      values.push(value(`L/d=${ratio}`, reference, actual, "m"));
    }
    return values;
  }),
  validationCase({
    id: "VAL-02-004",
    category: 2,
    description: "Explicit effective shear areas for rectangular, circular, and wide-flange sections are consumed once",
    model: "Three otherwise identical deep cantilevers with As/A={5/6,0.90,0.35}.",
    supports: "Each cantilever fixed at a.",
    loads: "Tip local-y force P=15,000 N.",
    referenceMethod: "published benchmark table",
    frame3ddCoverage: "direct",
    notes: "xframe accepts effective shear area; it does not infer section shape. Published factors are supplied by the caller.",
  }, () => {
    const length = 1.2;
    const area = 0.08;
    const inertia = 0.0012;
    const load = 15_000;
    return [
      ["rectangular", (5 * area) / 6],
      ["circular", 0.9 * area],
      ["wide-flange", 0.35 * area],
    ].map(([name, shearArea]) => {
      const builder = prismaticFrameBuilder({ length, elasticModulus: E, shearModulus: G, area, inertiaY: inertia, inertiaZ: inertia, torsionalConstant: J, shearAreaY: shearArea as number, shearAreaZ: shearArea as number, theory: { kind: "timoshenko" } });
      constrain(builder, "a", allDofs);
      const actual = displacement(solve(builder.addLoadCase({ id: "LC", loads: [{ kind: "nodal", nodeId: "b", force: [0, load, 0] }] })), "b", "ty");
      const reference = (load * length ** 3) / (3 * E * inertia) + (load * length) / (G * (shearArea as number));
      return value(`${name} tip ty`, reference, actual, "m");
    });
  }),
  validationCase({
    id: "VAL-02-005",
    category: 2,
    description: "Simply supported deep Timoshenko beam under UDL",
    model: "Two equal Timoshenko elements, L=2 m, Izz=0.0015 m⁴, Asy=0.06 m².",
    supports: "Pin at a, roller at c, planar unused DOFs restrained.",
    loads: "Uniform local-y load w=-40,000 N/m over the full span.",
    referenceMethod: "published benchmark table",
    frame3ddCoverage: "direct",
  }, () => {
    const length = 2;
    const w = -40_000;
    const elasticModulus = 30e9;
    const shearModulus = 12e9;
    const inertia = 0.0015;
    const shearArea = 0.06;
    let builder = createModelBuilder()
      .setUnitSystem(siUnits)
      .addNode({ id: "a", coordinates: [0, 0, 0] })
      .addNode({ id: "b", coordinates: [length / 2, 0, 0] })
      .addNode({ id: "c", coordinates: [length, 0, 0] })
      .addMaterial({ id: "m", elasticModulus, shearModulus })
      .addFrameSection({ id: "s", area: 0.08, shearAreaY: shearArea, shearAreaZ: shearArea, torsionalConstant: 0.002, momentOfInertiaY: inertia, momentOfInertiaZ: inertia });
    builder = addPlanarFrame(builder, "f1", "a", "b", { kind: "timoshenko" });
    builder = addPlanarFrame(builder, "f2", "b", "c", { kind: "timoshenko" });
    pin(builder, "a", true);
    pin(builder, "c");
    const loads = ["f1", "f2"].map((frameId) => ({ kind: "member-distributed" as const, frameId, coordinateSystem: "local" as const, startIntensity: [0, w, 0] as const, endIntensity: [0, w, 0] as const }));
    const actual = displacement(solve(builder.addLoadCase({ id: "LC", loads })), "b", "ty");
    const reference = (5 * w * length ** 4) / (384 * elasticModulus * inertia) + (w * length ** 2) / (8 * shearModulus * shearArea);
    return [value("midspan ty", reference, actual, "m")];
  }),
  validationCase({
    id: "VAL-02-006",
    category: 2,
    description: "Timoshenko with enormous shear area degenerates to Euler-Bernoulli",
    model: "Identical cantilevers; Timoshenko As=1e12 m² versus Euler-Bernoulli.",
    supports: "Node a fixed; node b free.",
    loads: "Tip local-y force P=20,000 N.",
    referenceMethod: "self-consistency check",
    frame3ddCoverage: "overlap-indirect",
  }, () => {
    const length = 3;
    const load = 20_000;
    const outputs = [];
    for (const theory of [{ kind: "euler-bernoulli" }, { kind: "timoshenko" }] as const) {
      const builder = prismaticFrameBuilder({ length, elasticModulus: E, shearModulus: G, area: A, inertiaY: IY, inertiaZ: IZ, torsionalConstant: J, shearAreaY: 1e12, shearAreaZ: 1e12, theory });
      constrain(builder, "a", allDofs);
      outputs.push(displacement(solve(builder.addLoadCase({ id: "LC", loads: [{ kind: "nodal", nodeId: "b", force: [0, load, 0] }] })), "b", "ty"));
    }
    return [value("tip ty", outputs[0]!, outputs[1]!, "m", outputs[0]!)];
  }),
];

const complianceByDof: Readonly<Record<DofName, (theory: FrameTheoryInput) => number>> = {
  tx: () => 3.1 / (E * A),
  ty: (theory) => 3.1 ** 3 / (3 * E * IZ) + (theory.kind === "timoshenko" ? 3.1 / (G * 0.014) : 0),
  tz: (theory) => 3.1 ** 3 / (3 * E * IY) + (theory.kind === "timoshenko" ? 3.1 / (G * 0.013) : 0),
  rx: () => 3.1 / (G * J),
  ry: () => 3.1 / (E * IY),
  rz: () => 3.1 / (E * IZ),
};

function unitAction(dof: DofName): { readonly force?: readonly [number, number, number]; readonly moment?: readonly [number, number, number] } {
  const index = allDofs.indexOf(dof);
  if (index < 3) {
    const force = [0, 0, 0] as [number, number, number];
    force[index] = 1;
    return { force };
  }
  const moment = [0, 0, 0] as [number, number, number];
  moment[index - 3] = 1;
  return { moment };
}

const stiffnessUnitLoadCases: ValidationCase[] = [];
for (const theory of [{ kind: "euler-bernoulli" }, { kind: "timoshenko" }] as const) {
  for (const freeEnd of ["start", "end"] as const) {
    for (const dof of allDofs) {
      const id = `VAL-03-${String(stiffnessUnitLoadCases.length + 1).padStart(3, "0")}`;
      stiffnessUnitLoadCases.push(validationCase({
        id,
        category: 3,
        description: `${theory.kind} unit ${dof} compliance at the ${freeEnd} end`,
        model: `Single local-x member L=3.1 m, A=${A}, Iyy=${IY}, Izz=${IZ}, J=${J}; ${theory.kind}.`,
        supports: `The ${freeEnd === "start" ? "end" : "start"} node is fixed in all six DOFs.`,
        loads: `Positive unit action in local/global ${dof} at the free ${freeEnd} node.`,
        referenceMethod: "closed-form hand calc",
        frame3ddCoverage: "matrix-direct",
      }, () => {
        const builder = prismaticFrameBuilder({ length: 3.1, elasticModulus: E, shearModulus: G, area: A, inertiaY: IY, inertiaZ: IZ, torsionalConstant: J, shearAreaY: 0.014, shearAreaZ: 0.013, theory });
        const loadedNode = freeEnd === "start" ? "a" : "b";
        constrain(builder, freeEnd === "start" ? "b" : "a", allDofs);
        const actual = displacement(solve(builder.addLoadCase({ id: "LC", loads: [{ kind: "nodal", nodeId: loadedNode, ...unitAction(dof) }] })), loadedNode, dof);
        const reference = complianceByDof[dof](theory);
        return [value(`${loadedNode}.${dof}`, reference, actual, dof.startsWith("r") ? "rad" : "m")];
      }));
    }
  }
}

export const singleMemberValidationCases = Object.freeze([
  ...singleMemberCases,
  ...timoshenkoCases,
  ...stiffnessUnitLoadCases,
]);
