import { expect, it } from "vitest";
import type { FrameMemberLoad } from "../../src/elements/frame/member-load-vector.js";
import {
  addFrameInternalForceSegments,
  buildFrameInternalForceSegments,
  deriveFrameInternalForceStations,
  evaluateFrameForcePolynomial,
  frameForceDerivativeRoots,
  frameStationLayout,
  recoverFrameInternalForces,
  type FrameForceCoefficients,
  type FrameInternalForceSegment,
} from "../../src/results/frame-internal-forces.js";

const components = (value: {
  readonly axial: number;
  readonly shearY: number;
  readonly shearZ: number;
  readonly torsion: number;
  readonly bendingY: number;
  readonly bendingZ: number;
}): readonly [number, number, number, number, number, number] => [
  value.axial,
  value.shearY,
  value.shearZ,
  value.torsion,
  value.bendingY,
  value.bendingZ,
];

function expectComponents(actual: readonly number[], expected: readonly number[]): void {
  expect(actual).toHaveLength(expected.length);
  for (let index = 0; index < expected.length; index += 1)
    expect(actual[index]).toBeCloseTo(expected[index]!, 12);
}

function segment(axial: FrameForceCoefficients, start = 0, end = 1): FrameInternalForceSegment {
  return {
    start,
    end,
    coefficients: [axial, [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
  };
}

it("FR-SAFE-004/FR-SAFE-007: lays out distributed boundaries and both limits of point actions", () => {
  const layout = frameStationLayout(4, [
    {
      kind: "distributed",
      start: 1,
      end: 3,
      startIntensity: [0, -1, 0],
      endIntensity: [0, -1, 0],
    },
    { kind: "point-force", distance: 0, vector: [1, 0, 0] },
    { kind: "point-moment", distance: 2, vector: [0, 0, 1] },
  ] satisfies readonly FrameMemberLoad[]);

  expect(layout).toEqual([
    { x: 0, side: "left" },
    { x: 0, side: "right" },
    { x: 1, side: "single" },
    { x: 2, side: "left" },
    { x: 2, side: "right" },
    { x: 3, side: "single" },
    { x: 4, side: "single" },
  ]);
  expect(Object.isFrozen(layout)).toBe(true);
});

it("FR-SAFE-004: uses every model load-case boundary even when the current case has none there", () => {
  const currentLoads = [
    {
      kind: "distributed",
      start: 1,
      end: 3,
      startIntensity: [0, 2, 0],
      endIntensity: [0, 2, 0],
    },
  ] satisfies readonly FrameMemberLoad[];
  const modelLoads = [
    ...currentLoads,
    { kind: "point-force", distance: 2, vector: [0, -5, 0] },
    {
      kind: "distributed",
      start: 4,
      end: 5,
      startIntensity: [3, 0, 0],
      endIntensity: [7, 0, 0],
    },
  ] satisfies readonly FrameMemberLoad[];

  const segments = buildFrameInternalForceSegments(6, [0, 0, 0, 0, 0, 0], currentLoads, modelLoads);

  expect(segments.map(({ start, end }) => [start, end])).toEqual([
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [4, 5],
    [5, 6],
  ]);
});

it("FR-SAFE-004: represents all six actions for a constant distributed load and agrees with direct equilibrium", () => {
  const startForces = [10, 20, 30, 40, 50, 60] as const;
  const loads = [
    {
      kind: "distributed",
      start: 0,
      end: 4,
      startIntensity: [2, 3, 4],
      endIntensity: [2, 3, 4],
    },
  ] satisfies readonly FrameMemberLoad[];
  const [forceSegment] = buildFrameInternalForceSegments(4, startForces, loads, loads);
  const xi = 2;

  expect(forceSegment!.coefficients).toEqual([
    [10, 2, 0, 0],
    [20, 3, 0, 0],
    [30, 4, 0, 0],
    [40, 0, 0, 0],
    [50, 30, 2, 0],
    [60, -20, -1.5, 0],
  ]);
  expectComponents(
    forceSegment!.coefficients.map((coefficients) =>
      evaluateFrameForcePolynomial(coefficients, xi),
    ),
    [14, 26, 38, 40, 118, 14],
  );
  expectComponents(
    components(recoverFrameInternalForces(startForces, loads, [{ x: 2, side: "single" }])[0]!),
    [14, 26, 38, 40, 118, 14],
  );
});

it("FR-SAFE-004: represents a linearly varying distributed load in local segment xi and agrees with direct equilibrium", () => {
  const startForces = [10, 20, 30, 40, 50, 60] as const;
  const loads = [
    {
      kind: "distributed",
      start: 2,
      end: 6,
      startIntensity: [1, 2, 3],
      endIntensity: [5, 6, 11],
    },
  ] satisfies readonly FrameMemberLoad[];
  const segments = buildFrameInternalForceSegments(8, startForces, loads, loads);
  const forceSegment = segments[1]!;
  const xi = 2;

  expect(forceSegment.coefficients).toEqual([
    [10, 1, 0.5, 0],
    [20, 2, 0.5, 0],
    [30, 3, 1, 0],
    [40, 0, 0, 0],
    [110, 30, 1.5, 1 / 3],
    [20, -20, -1, -1 / 6],
  ]);
  expectComponents(
    forceSegment.coefficients.map((coefficients) => evaluateFrameForcePolynomial(coefficients, xi)),
    [14, 26, 40, 40, 178 + 2 / 3, -25 - 1 / 3],
  );
  expectComponents(
    components(recoverFrameInternalForces(startForces, loads, [{ x: 4, side: "single" }])[0]!),
    [14, 26, 40, 40, 178 + 2 / 3, -25 - 1 / 3],
  );
});

it("FR-SAFE-004: offsets varying intensity after a model-only boundary splits the current load", () => {
  const startForces = [10, 20, 30, 40, 50, 60] as const;
  const loads = [
    {
      kind: "distributed",
      start: 1,
      end: 5,
      startIntensity: [1, 2, 3],
      endIntensity: [5, 6, 11],
    },
  ] satisfies readonly FrameMemberLoad[];
  const modelLoads = [
    ...loads,
    { kind: "point-force", distance: 3, vector: [0, 0, 1] },
  ] satisfies readonly FrameMemberLoad[];
  const forceSegment = buildFrameInternalForceSegments(6, startForces, loads, modelLoads)[2]!;

  expect([forceSegment.start, forceSegment.end]).toEqual([3, 5]);
  const expectedCoefficients = [
    [14, 3, 0.5, 0],
    [26, 4, 0.5, 0],
    [40, 7, 1, 0],
    [40, 0, 0, 0],
    [148 + 2 / 3, 40, 3.5, 1 / 3],
    [-5 - 1 / 3, -26, -2, -1 / 6],
  ] as const;
  for (let component = 0; component < expectedCoefficients.length; component += 1)
    expectComponents(forceSegment.coefficients[component]!, expectedCoefficients[component]!);
  expectComponents(
    forceSegment.coefficients.map((coefficients) => evaluateFrameForcePolynomial(coefficients, 1)),
    [17.5, 30.5, 48, 40, 192.5, -33.5],
  );
  expectComponents(
    components(recoverFrameInternalForces(startForces, loads, [{ x: 4, side: "single" }])[0]!),
    [17.5, 30.5, 48, 40, 192.5, -33.5],
  );
});

it("FR-SAFE-004: keeps point-force and point-moment jumps at boundaries rather than in segment polynomials", () => {
  const startForces = [1, 2, 3, 4, 5, 6] as const;
  const loads = [
    { kind: "point-force", distance: 2, vector: [7, -11, 13] },
    { kind: "point-moment", distance: 2, vector: [17, 19, 23] },
  ] satisfies readonly FrameMemberLoad[];
  const segments = buildFrameInternalForceSegments(4, startForces, loads, loads);
  const stations = deriveFrameInternalForceStations(segments).filter(({ x }) => x === 2);

  expect(segments.map(({ start, end }) => [start, end])).toEqual([
    [0, 2],
    [2, 4],
  ]);
  expect(segments[1]!.coefficients).toEqual([
    [8, 0, 0, 0],
    [-9, 0, 0, 0],
    [16, 0, 0, 0],
    [-13, 0, 0, 0],
    [-8, 16, 0, 0],
    [-21, 9, 0, 0],
  ]);
  expect(stations.map(({ side }) => side)).toEqual(["left", "right"]);
  expectComponents(components(stations[0]!), [1, 2, 3, 4, 11, 2]);
  expectComponents(components(stations[1]!), [8, -9, 16, -13, -8, -21]);
  expectComponents(
    components(recoverFrameInternalForces(startForces, loads, [{ x: 2, side: "left" }])[0]!),
    [1, 2, 3, 4, 11, 2],
  );
  expectComponents(
    components(recoverFrameInternalForces(startForces, loads, [{ x: 2, side: "right" }])[0]!),
    [8, -9, 16, -13, -8, -21],
  );
});

it("FR-SAFE-004: derives both exterior endpoint limits from point actions", () => {
  const startForces = [10, 0, 0, 0, 0, 0] as const;
  const loads = [
    { kind: "point-force", distance: 0, vector: [1, 0, 0] },
    { kind: "point-moment", distance: 0, vector: [0, 0, 2] },
    { kind: "point-force", distance: 4, vector: [3, 0, 0] },
    { kind: "point-moment", distance: 4, vector: [0, 0, 5] },
  ] satisfies readonly FrameMemberLoad[];
  const stations = deriveFrameInternalForceStations(
    buildFrameInternalForceSegments(4, startForces, loads, loads),
  );

  expect(stations.map(({ x, side }) => [x, side])).toEqual([
    [0, "left"],
    [0, "right"],
    [4, "left"],
    [4, "right"],
  ]);
  expectComponents(components(stations[0]!), [10, 0, 0, 0, 0, 0]);
  expectComponents(components(stations[1]!), [11, 0, 0, 0, 0, -2]);
  expectComponents(components(stations[2]!), [11, 0, 0, 0, 0, -2]);
  expectComponents(components(stations[3]!), [14, 0, 0, 0, 0, -7]);
});

it("FR-SAFE-004: finds strict interior linear and cancellation-resistant quadratic derivative roots", () => {
  expect(frameForceDerivativeRoots([0, 6, -4.5, 1], 3)).toEqual([1, 2]);
  expect(frameForceDerivativeRoots([0, 1, -50_000_000, 1 / 3], 1)).toEqual([1e-8]);
});

it.each([
  ["large", 2 ** 1019],
  ["tiny", 2 ** -1070],
] as const)(
  "FR-SAFE-004: preserves derivative roots under a %s finite coefficient scale",
  (_, scale) => {
    expect(frameForceDerivativeRoots([0, 6 * scale, -4.5 * scale, scale], 3)).toEqual([1, 2]);
  },
);

it("FR-SAFE-004: rejects non-finite derivative-root coefficients and segment lengths", () => {
  for (const coefficients of [
    [Number.POSITIVE_INFINITY, 1, 0, 0],
    [0, Number.NaN, 0, 0],
    [0, 1, Number.NEGATIVE_INFINITY, 0],
    [0, 1, 0, Number.POSITIVE_INFINITY],
  ] as const) {
    expect(() => frameForceDerivativeRoots(coefficients, 1)).toThrow("Expected a finite number");
  }
  expect(() => frameForceDerivativeRoots([0, 1, 0, 0], Number.NaN)).toThrow(
    "Expected a finite number",
  );
});

it("FR-SAFE-004: selects the exact represented derivative degree and handles double and endpoint roots", () => {
  expect(frameForceDerivativeRoots([0, 0, 0, 0], 2)).toEqual([]);
  expect(frameForceDerivativeRoots([0, -4, 2, 0], 2)).toEqual([1]);
  expect(frameForceDerivativeRoots([0, 3, -3, 1], 2)).toEqual([1]);
  expect(frameForceDerivativeRoots([0, 0, 1, 0], 2)).toEqual([]);
  expect(frameForceDerivativeRoots([0, -4, 1, 0], 2)).toEqual([]);
});

it("FR-SAFE-004: derives a new interior station after adding compatible polynomial segments", () => {
  const first = [segment([0, 1, 1, 0])];
  const second = [segment([0, -1.5, -0.5, 0])];

  expect(deriveFrameInternalForceStations(first).map(({ x }) => x)).toEqual([0, 1]);
  expect(deriveFrameInternalForceStations(second).map(({ x }) => x)).toEqual([0, 1]);
  expect(
    deriveFrameInternalForceStations(addFrameInternalForceSegments(first, second)).map(
      ({ x }) => x,
    ),
  ).toEqual([0, 0.5, 1]);
});

it("FR-SAFE-004: preserves structural continuity when added coefficients cancel at a boundary", () => {
  const first = [segment([1e16, -1e16, 0, 0], 0, 1), segment([0, 0, 0, 0], 1, 2)];
  const second = [segment([1, 0, 0, 0], 0, 1), segment([1, 0, 0, 0], 1, 2)];

  const boundary = deriveFrameInternalForceStations(
    addFrameInternalForceSegments(first, second),
  ).filter(({ x }) => x === 1);

  expect(boundary.map(({ side, axial }) => [side, axial])).toEqual([["single", 0]]);
});

it("FR-SAFE-004: retains a genuine component jump while adding polynomial segments", () => {
  const continuous = [segment([0, 0, 0, 0], 0, 1), segment([0, 0, 0, 0], 1, 2)];
  const jumped = [segment([0, 0, 0, 0], 0, 1), segment([1, 0, 0, 0], 1, 2)];

  const boundary = deriveFrameInternalForceStations(
    addFrameInternalForceSegments(continuous, jumped),
  ).filter(({ x }) => x === 1);

  expect(boundary.map(({ side, axial }) => [side, axial])).toEqual([
    ["left", 0],
    ["right", 1],
  ]);
});
