import { expect, it } from "vitest";
import { prepareAnalysis } from "../../src/analysis/prepare-analysis.js";
import { createModelBuilder } from "../../src/model/model-builder.js";
import type { FrameReleaseInput } from "../../src/model/domain-records.js";

function fixedFrame(
  length: number,
  startDofs: readonly ("tx" | "ty" | "tz" | "rx" | "ry" | "rz")[] = [
    "tx",
    "ty",
    "tz",
    "rx",
    "ry",
    "rz",
  ],
  releases?: FrameReleaseInput,
) {
  const builder = createModelBuilder()
    .setUnitSystem({
      version: "1",
      length: "m",
      force: "N",
      moment: "N*m",
      modulus: "Pa",
      distributedForce: "N/m",
      density: "kg/m^3",
      rotation: "rad",
    })
    .addNode({ id: "a", coordinates: [0, 0, 0] })
    .addNode({ id: "b", coordinates: [length, 0, 0] })
    .addMaterial({ id: "m", elasticModulus: 200e9, poissonRatio: 0.3 })
    .addFrameSection({
      id: "s",
      area: 0.02,
      torsionalConstant: 1e-5,
      momentOfInertiaY: 2e-5,
      momentOfInertiaZ: 2e-5,
    })
    .addFrame({
      id: "f",
      startNodeId: "a",
      endNodeId: "b",
      materialId: "m",
      sectionId: "s",
      theory: { kind: "euler-bernoulli" },
      orientation: [0, 1, 0],
      ...(releases === undefined ? {} : { releases }),
    });
  for (const dof of startDofs)
    builder.addConstraint({
      id: `a:${dof}`,
      terms: [{ nodeId: "a", dof, coefficient: 1 }],
      rightHandSide: 0,
    });
  return builder;
}

it("FR-SAFE-004: publishes frozen contiguous force polynomials with the simply-supported midspan extremum", () => {
  const length = 10;
  const builder = fixedFrame(length, ["tx", "ty", "tz", "rx", "ry"]);
  for (const dof of ["ty", "tz", "rx", "ry"] as const)
    builder.addConstraint({
      id: `b:${dof}`,
      terms: [{ nodeId: "b", dof, coefficient: 1 }],
      rightHandSide: 0,
    });
  const frame = prepareAnalysis(
    builder
      .addLoadCase({
        id: "q",
        loads: [
          {
            kind: "member-distributed",
            frameId: "f",
            coordinateSystem: "local",
            startIntensity: [0, -1000, 0],
            endIntensity: [0, -1000, 0],
          },
        ],
      })
      .finalize(),
  ).solveCase("q").frames[0]!;

  const segments = frame.internalForceSegments;
  expect(segments.map(({ start, end }) => [start, end])).toEqual([[0, length]]);
  expect(Object.isFrozen(segments)).toBe(true);
  expect(Object.isFrozen(segments[0])).toBe(true);
  expect(Object.isFrozen(segments[0]!.coefficients)).toBe(true);
  expect(Object.isFrozen(segments[0]!.coefficients[0])).toBe(true);
  const midspan = frame.internalForces.find(({ x }) => x > 0 && x < length);
  expect(midspan).toBeDefined();
  expect(midspan!.x).toBeCloseTo(5, 12);
  expect(Math.abs(midspan!.bendingZ)).toBeCloseTo(12500, 9);
});

it("FR-RES-002: recovers frame end forces and balanced internal-force stations for a uniform load", () => {
  const length = 4;
  const load = -10;
  const builder = createModelBuilder()
    .setUnitSystem({
      version: "1",
      length: "m",
      force: "N",
      moment: "N*m",
      modulus: "Pa",
      distributedForce: "N/m",
      density: "kg/m^3",
      rotation: "rad",
    })
    .addNode({ id: "a", coordinates: [0, 0, 0] })
    .addNode({ id: "b", coordinates: [length, 0, 0] })
    .addMaterial({ id: "m", elasticModulus: 200e9, poissonRatio: 0.3 })
    .addFrameSection({
      id: "s",
      area: 0.02,
      torsionalConstant: 1e-5,
      momentOfInertiaY: 2e-5,
      momentOfInertiaZ: 2e-5,
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
  for (const dof of ["tx", "ty", "tz", "rx", "ry", "rz"] as const)
    builder.addConstraint({
      id: `a:${dof}`,
      terms: [{ nodeId: "a", dof, coefficient: 1 }],
      rightHandSide: 0,
    });
  const model = builder
    .addLoadCase({
      id: "w",
      loads: [
        {
          kind: "member-distributed",
          frameId: "f",
          coordinateSystem: "local",
          startIntensity: [0, load, 0],
          endIntensity: [0, load, 0],
        },
      ],
    })
    .finalize();
  const result = prepareAnalysis(model).solveCase("w");
  const frame = result.frames[0]!;
  expect(frame.localEndForces[1]).toBeCloseTo(-load * length, 9);
  expect(frame.localEndForces[5]).toBeCloseTo((-load * length ** 2) / 2, 9);
  expect(frame.internalForces[0]!.shearY).toBeCloseTo(frame.localEndForces[1]!, 9);
  expect(frame.internalForces.at(-1)!.shearY).toBeCloseTo(0, 9);
  expect(frame.internalForces.at(-1)!.bendingZ).toBeCloseTo(0, 9);
});

it("FR-RES-002/FR-RES-005: returns independent global and local frame end displacements", () => {
  const builder = createModelBuilder()
    .setUnitSystem({
      version: "1",
      length: "m",
      force: "N",
      moment: "N*m",
      modulus: "Pa",
      distributedForce: "N/m",
      density: "kg/m^3",
      rotation: "rad",
    })
    .addNode({ id: "a", coordinates: [0, 0, 0] })
    .addNode({ id: "b", coordinates: [2, 0, 0] })
    .addMaterial({ id: "m", elasticModulus: 200e9, poissonRatio: 0.3 })
    .addFrameSection({
      id: "s",
      area: 0.02,
      torsionalConstant: 1e-5,
      momentOfInertiaY: 2e-5,
      momentOfInertiaZ: 2e-5,
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
  for (const dof of ["tx", "ty", "tz", "rx", "ry", "rz"] as const)
    builder.addConstraint({
      id: `a:${dof}`,
      terms: [{ nodeId: "a", dof, coefficient: 1 }],
      rightHandSide: 0,
    });
  const result = prepareAnalysis(
    builder
      .addLoadCase({ id: "P", loads: [{ kind: "nodal", nodeId: "b", force: [0, 1, 0] }] })
      .finalize(),
  ).solveCase("P");
  const frame = result.frames[0]!;
  expect(frame.globalEndDisplacements).toHaveLength(12);
  expect(frame.localEndDisplacements).toHaveLength(12);
  expect(frame.globalEndDisplacements).not.toBe(frame.localEndDisplacements);
  expect(frame.globalEndForces).not.toBe(frame.localEndForces);
  expect(Object.isFrozen(frame.globalEndDisplacements)).toBe(true);
  expect(Object.isFrozen(frame.localEndDisplacements)).toBe(true);
});

it.each(["start", "end"] as const)(
  "FR-RES-002/FR-ELE-005: reports recovered %s hinge rotation separately from fixed joint rotation",
  (end) => {
    const length = 4;
    const intensity = 1000;
    const builder = fixedFrame(length, undefined, { [end]: ["rz"] });
    for (const dof of ["tx", "ty", "tz", "rx", "ry", "rz"] as const) {
      builder.addConstraint({
        id: `b:${dof}`,
        terms: [{ nodeId: "b", dof, coefficient: 1 }],
        rightHandSide: 0,
      });
    }
    const result = prepareAnalysis(
      builder
        .addLoadCase({
          id: "q",
          loads: [
            {
              kind: "member-distributed",
              frameId: "f",
              coordinateSystem: "local",
              startIntensity: [0, -intensity, 0],
              endIntensity: [0, -intensity, 0],
            },
          ],
        })
        .finalize(),
    ).solveCase("q");
    const frame = result.frames[0]!;
    const releasedDof = end === "start" ? 5 : 11;
    const rotation = (intensity * length ** 3) / (48 * 200e9 * 2e-5);
    expect(frame.localEndDisplacements[releasedDof]! / rotation).toBeCloseTo(
      end === "start" ? -1 : 1,
      12,
    );
    expect(frame.globalEndDisplacements).toEqual(Array(12).fill(0));
    expect(result.fullDisplacements).toEqual(Array(12).fill(0));
    expect(frame.localEndForces[releasedDof]).toBeCloseTo(0, 9);
    expect(Object.isFrozen(frame.localEndDisplacements)).toBe(true);
    expect(result.diagnostics.status).toBe("pass");
  },
);

it("FR-RES-004: inserts left and right stations at point-force discontinuities", () => {
  const length = 4;
  const builder = createModelBuilder()
    .setUnitSystem({
      version: "1",
      length: "m",
      force: "N",
      moment: "N*m",
      modulus: "Pa",
      distributedForce: "N/m",
      density: "kg/m^3",
      rotation: "rad",
    })
    .addNode({ id: "a", coordinates: [0, 0, 0] })
    .addNode({ id: "b", coordinates: [length, 0, 0] })
    .addMaterial({ id: "m", elasticModulus: 200e9, poissonRatio: 0.3 })
    .addFrameSection({
      id: "s",
      area: 0.02,
      torsionalConstant: 1e-5,
      momentOfInertiaY: 2e-5,
      momentOfInertiaZ: 2e-5,
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
  for (const dof of ["tx", "ty", "tz", "rx", "ry", "rz"] as const)
    builder.addConstraint({
      id: `a:${dof}`,
      terms: [{ nodeId: "a", dof, coefficient: 1 }],
      rightHandSide: 0,
    });
  const result = prepareAnalysis(
    builder
      .addLoadCase({
        id: "P",
        loads: [
          {
            kind: "member-point-force",
            frameId: "f",
            coordinateSystem: "local",
            force: [0, -10, 0],
            distanceFromElasticStart: 2,
          },
        ],
      })
      .finalize(),
  ).solveCase("P");
  const stations = result.frames[0]!.internalForces.filter(({ x }) => x === 2);
  expect(stations.map(({ side }) => side)).toEqual(["left", "right"]);
  expect(stations[1]!.shearY - stations[0]!.shearY).toBeCloseTo(-10, 12);
  expect(stations[1]!.bendingZ).toBeCloseTo(stations[0]!.bendingZ, 12);
});

it("FR-SAFE-007: exposes both endpoint sides and full point-force jumps", () => {
  const length = 4;
  const stations = prepareAnalysis(
    fixedFrame(length)
      .addLoadCase({
        id: "P",
        loads: [
          {
            kind: "member-point-force",
            frameId: "f",
            coordinateSystem: "local",
            force: [0, -10, 0],
            distanceFromElasticStart: 0,
          },
          {
            kind: "member-point-force",
            frameId: "f",
            coordinateSystem: "local",
            force: [0, -10, 0],
            distanceFromElasticStart: length,
          },
        ],
      })
      .finalize(),
  ).solveCase("P").frames[0]!.internalForces;

  expect(stations.map(({ x, side }) => [x, side])).toEqual([
    [0, "left"],
    [0, "right"],
    [length, "left"],
    [length, "right"],
  ]);
  expect(stations[0]!.shearY).toBeCloseTo(20, 12);
  expect(stations[1]!.shearY).toBeCloseTo(10, 12);
  expect(stations[2]!.shearY).toBeCloseTo(10, 12);
  expect(stations[3]!.shearY).toBeCloseTo(0, 12);
  expect(stations[1]!.shearY - stations[0]!.shearY).toBeCloseTo(-10, 12);
  expect(stations[3]!.shearY - stations[2]!.shearY).toBeCloseTo(-10, 12);
});

it("FR-SAFE-007: exposes both endpoint sides and full point-moment jumps", () => {
  const length = 4;
  const stations = prepareAnalysis(
    fixedFrame(length)
      .addLoadCase({
        id: "M",
        loads: [
          {
            kind: "member-point-moment",
            frameId: "f",
            coordinateSystem: "local",
            moment: [0, 0, 5],
            distanceFromElasticStart: 0,
          },
          {
            kind: "member-point-moment",
            frameId: "f",
            coordinateSystem: "local",
            moment: [0, 0, 5],
            distanceFromElasticStart: length,
          },
        ],
      })
      .finalize(),
  ).solveCase("M").frames[0]!.internalForces;

  expect(stations.map(({ x, side }) => [x, side])).toEqual([
    [0, "left"],
    [0, "right"],
    [length, "left"],
    [length, "right"],
  ]);
  expect(stations[0]!.bendingZ).toBeCloseTo(-10, 12);
  expect(stations[1]!.bendingZ).toBeCloseTo(-15, 12);
  expect(stations[2]!.bendingZ).toBeCloseTo(-15, 12);
  expect(stations[3]!.bendingZ).toBeCloseTo(-20, 12);
  expect(stations[1]!.bendingZ - stations[0]!.bendingZ).toBeCloseTo(-5, 12);
  expect(stations[3]!.bendingZ - stations[2]!.bendingZ).toBeCloseTo(-5, 12);
});
