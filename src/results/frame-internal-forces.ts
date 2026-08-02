import type { FrameMemberLoad } from "../elements/frame/member-load-vector.js";
import type { FrameInternalForceStation } from "./result-types.js";

export type FrameForceCoefficients = readonly [number, number, number, number];
type FrameForceComponents = readonly [number, number, number, number, number, number];
type MutableFrameForceComponents = [number, number, number, number, number, number];

export interface FrameInternalForceSegment {
  readonly start: number;
  readonly end: number;
  readonly coefficients: readonly [
    FrameForceCoefficients,
    FrameForceCoefficients,
    FrameForceCoefficients,
    FrameForceCoefficients,
    FrameForceCoefficients,
    FrameForceCoefficients,
  ];
  readonly startLeft?: FrameForceComponents;
  readonly endRight?: FrameForceComponents;
}

function crossX(vector: readonly number[]): readonly [number, number, number] {
  return [0, -vector[2]!, vector[1]!];
}

function pointIncluded(
  distance: number,
  x: number,
  side: FrameInternalForceStation["side"],
): boolean {
  return distance < x || (distance === x && side !== "left");
}

function distributedIntegrals(
  load: Extract<FrameMemberLoad, { readonly kind: "distributed" }>,
  x: number,
): {
  readonly force: readonly [number, number, number];
  readonly firstMoment: readonly [number, number, number];
} {
  const end = Math.min(x, load.end);
  if (end <= load.start) return { force: [0, 0, 0], firstMoment: [0, 0, 0] };
  const span = load.end - load.start;
  const d = end - load.start;
  const force = [0, 0, 0] as number[];
  const firstMoment = [0, 0, 0] as number[];
  for (let component = 0; component < 3; component += 1) {
    const q0 = load.startIntensity[component]!;
    const slope = (load.endIntensity[component]! - q0) / span;
    force[component] = q0 * d + (slope * d ** 2) / 2;
    firstMoment[component] =
      load.start * q0 * d + ((load.start * slope + q0) * d ** 2) / 2 + (slope * d ** 3) / 3;
  }
  return {
    force: force as [number, number, number],
    firstMoment: firstMoment as [number, number, number],
  };
}

function station(
  x: number,
  side: FrameInternalForceStation["side"],
  startForces: ArrayLike<number>,
  loads: readonly FrameMemberLoad[],
): FrameInternalForceStation {
  const force = [startForces[0]!, startForces[1]!, startForces[2]!] as number[];
  const moment = [startForces[3]!, startForces[4]!, startForces[5]!] as number[];
  const startCross = crossX(force);
  for (let component = 0; component < 3; component += 1)
    moment[component] = moment[component]! - x * startCross[component]!;

  for (const load of loads) {
    if (load.kind === "point-force") {
      if (!pointIncluded(load.distance, x, side)) continue;
      const arm = x - load.distance;
      const loadCross = crossX(load.vector);
      for (let component = 0; component < 3; component += 1) {
        force[component] = force[component]! + load.vector[component]!;
        moment[component] = moment[component]! - arm * loadCross[component]!;
      }
    } else if (load.kind === "point-moment") {
      if (!pointIncluded(load.distance, x, side)) continue;
      for (let component = 0; component < 3; component += 1)
        moment[component] = moment[component]! - load.vector[component]!;
    } else {
      const integral = distributedIntegrals(load, x);
      const aboutCut = [
        integral.firstMoment[0]! - x * integral.force[0]!,
        integral.firstMoment[1]! - x * integral.force[1]!,
        integral.firstMoment[2]! - x * integral.force[2]!,
      ] as const;
      const loadCross = crossX(aboutCut);
      for (let component = 0; component < 3; component += 1)
        force[component] = force[component]! + integral.force[component]!;
      for (let component = 0; component < 3; component += 1)
        moment[component] = moment[component]! + loadCross[component]!;
    }
  }

  return Object.freeze({
    x,
    side,
    axial: force[0]!,
    shearY: force[1]!,
    shearZ: force[2]!,
    torsion: moment[0]!,
    bendingY: moment[1]!,
    bendingZ: moment[2]!,
  });
}

export function frameStationLayout(
  length: number,
  allLoads: readonly FrameMemberLoad[],
): readonly {
  readonly x: number;
  readonly side: FrameInternalForceStation["side"];
}[] {
  const coordinates = new Set<number>([0, length]);
  const pointCoordinates = new Set<number>();
  for (const load of allLoads) {
    if (load.kind === "distributed") {
      coordinates.add(load.start);
      coordinates.add(load.end);
    } else {
      coordinates.add(load.distance);
      pointCoordinates.add(load.distance);
    }
  }
  const layout: { readonly x: number; readonly side: FrameInternalForceStation["side"] }[] = [];
  for (const x of [...coordinates].toSorted((left, right) => left - right)) {
    if (pointCoordinates.has(x)) {
      layout.push(Object.freeze({ x, side: "left" }), Object.freeze({ x, side: "right" }));
    } else {
      layout.push(Object.freeze({ x, side: "single" }));
    }
  }
  return Object.freeze(layout);
}

export function recoverFrameInternalForces(
  startForces: ArrayLike<number>,
  loads: readonly FrameMemberLoad[],
  layout: readonly { readonly x: number; readonly side: FrameInternalForceStation["side"] }[],
): readonly FrameInternalForceStation[] {
  return Object.freeze(layout.map(({ x, side }) => station(x, side, startForces, loads)));
}

function mutableComponents(values: ArrayLike<number>): MutableFrameForceComponents {
  return [values[0]!, values[1]!, values[2]!, values[3]!, values[4]!, values[5]!];
}

function frozenComponents(values: ArrayLike<number>): FrameForceComponents {
  return Object.freeze(mutableComponents(values)) as FrameForceComponents;
}

function canonicalZero(value: number): number {
  return Object.is(value, -0) ? 0 : value;
}

function forcePolynomial(c0: number, c1: number, c2: number, c3: number): FrameForceCoefficients {
  return Object.freeze([
    canonicalZero(c0),
    canonicalZero(c1),
    canonicalZero(c2),
    canonicalZero(c3),
  ]) as FrameForceCoefficients;
}

function pointActionsAt(
  actions: MutableFrameForceComponents,
  loads: readonly FrameMemberLoad[],
  x: number,
): void {
  for (const load of loads) {
    if (load.kind === "point-force" && load.distance === x) {
      for (let component = 0; component < 3; component += 1)
        actions[component] = actions[component]! + load.vector[component]!;
    } else if (load.kind === "point-moment" && load.distance === x) {
      for (let component = 0; component < 3; component += 1)
        actions[component + 3] = actions[component + 3]! - load.vector[component]!;
    }
  }
}

function distributedCoefficients(
  start: number,
  end: number,
  loads: readonly FrameMemberLoad[],
): readonly [readonly [number, number, number], readonly [number, number, number]] {
  const intensity = [0, 0, 0] as [number, number, number];
  const slope = [0, 0, 0] as [number, number, number];
  for (const load of loads) {
    if (load.kind !== "distributed" || load.start > start || load.end < end) continue;
    const span = load.end - load.start;
    const offset = start - load.start;
    for (let component = 0; component < 3; component += 1) {
      const rate = (load.endIntensity[component]! - load.startIntensity[component]!) / span;
      intensity[component] =
        intensity[component]! + load.startIntensity[component]! + rate * offset;
      slope[component] = slope[component]! + rate;
    }
  }
  return [intensity, slope];
}

function frameForceBoundaries(
  length: number,
  loads: readonly FrameMemberLoad[],
  modelLoads: readonly FrameMemberLoad[],
): readonly number[] {
  const coordinates = new Set<number>([0, length]);
  for (const source of [modelLoads, loads]) {
    for (const load of source) {
      if (load.kind === "distributed") {
        coordinates.add(load.start);
        coordinates.add(load.end);
      } else {
        coordinates.add(load.distance);
      }
    }
  }
  return Object.freeze([...coordinates].toSorted((left, right) => left - right));
}

function evaluateSegment(segment: FrameInternalForceSegment, xi: number): FrameForceComponents {
  return [
    evaluateFrameForcePolynomial(segment.coefficients[0], xi),
    evaluateFrameForcePolynomial(segment.coefficients[1], xi),
    evaluateFrameForcePolynomial(segment.coefficients[2], xi),
    evaluateFrameForcePolynomial(segment.coefficients[3], xi),
    evaluateFrameForcePolynomial(segment.coefficients[4], xi),
    evaluateFrameForcePolynomial(segment.coefficients[5], xi),
  ];
}

function segmentCoefficients(
  actions: FrameForceComponents,
  intensity: readonly [number, number, number],
  slope: readonly [number, number, number],
): FrameInternalForceSegment["coefficients"] {
  return Object.freeze([
    forcePolynomial(actions[0], intensity[0], slope[0] / 2, 0),
    forcePolynomial(actions[1], intensity[1], slope[1] / 2, 0),
    forcePolynomial(actions[2], intensity[2], slope[2] / 2, 0),
    forcePolynomial(actions[3], 0, 0, 0),
    forcePolynomial(actions[4], actions[2], intensity[2] / 2, slope[2] / 6),
    forcePolynomial(actions[5], -actions[1], -intensity[1] / 2, -slope[1] / 6),
  ]) as FrameInternalForceSegment["coefficients"];
}

export function buildFrameInternalForceSegments(
  length: number,
  startForces: ArrayLike<number>,
  loads: readonly FrameMemberLoad[],
  modelLoads: readonly FrameMemberLoad[],
): readonly FrameInternalForceSegment[] {
  const boundaries = frameForceBoundaries(length, loads, modelLoads);
  const segments: FrameInternalForceSegment[] = [];
  let actions = mutableComponents(startForces);
  for (let index = 0; index + 1 < boundaries.length; index += 1) {
    const start = boundaries[index]!;
    const end = boundaries[index + 1]!;
    const startLeft = mutableComponents(actions);
    pointActionsAt(actions, loads, start);
    const [intensity, slope] = distributedCoefficients(start, end, loads);
    const values = segmentCoefficients(actions, intensity, slope);
    const endLeft = mutableComponents(
      values.map((value) => evaluateFrameForcePolynomial(value, end - start)),
    );
    const endRight = mutableComponents(endLeft);
    if (index + 2 === boundaries.length) pointActionsAt(endRight, loads, end);
    segments.push(
      Object.freeze({
        start,
        end,
        coefficients: values,
        ...(index === 0 ? { startLeft: frozenComponents(startLeft) } : {}),
        ...(index + 2 === boundaries.length ? { endRight: frozenComponents(endRight) } : {}),
      }),
    );
    actions = endLeft;
  }
  return Object.freeze(segments);
}

export function evaluateFrameForcePolynomial(
  coefficients: FrameForceCoefficients,
  xi: number,
): number {
  return coefficients[0] + xi * (coefficients[1] + xi * (coefficients[2] + xi * coefficients[3]));
}

function interiorRoot(root: number, length: number): readonly number[] {
  return root > 0 && root < length ? [root] : [];
}

export function frameForceDerivativeRoots(
  coefficients: FrameForceCoefficients,
  segmentLength: number,
): readonly number[] {
  const constant = coefficients[1];
  const linear = 2 * coefficients[2];
  const quadratic = 3 * coefficients[3];
  if (quadratic === 0) {
    if (linear === 0) return Object.freeze([]);
    return Object.freeze(interiorRoot(-constant / linear, segmentLength));
  }
  const discriminant = linear ** 2 - 4 * quadratic * constant;
  if (discriminant < 0) return Object.freeze([]);
  if (discriminant === 0) {
    return Object.freeze(interiorRoot(-linear / (2 * quadratic), segmentLength));
  }
  const root = Math.sqrt(discriminant);
  const q = -0.5 * (linear + (linear < 0 ? -root : root));
  const roots = [
    ...interiorRoot(q / quadratic, segmentLength),
    ...interiorRoot(constant / q, segmentLength),
  ];
  return Object.freeze([...new Set(roots)].toSorted((left, right) => left - right));
}

function addedCoefficients(
  left: FrameForceCoefficients,
  right: FrameForceCoefficients,
  rightFactor: number,
): FrameForceCoefficients {
  return forcePolynomial(
    left[0] + rightFactor * right[0],
    left[1] + rightFactor * right[1],
    left[2] + rightFactor * right[2],
    left[3] + rightFactor * right[3],
  );
}

function addedComponents(
  left: FrameForceComponents,
  right: FrameForceComponents,
  rightFactor: number,
): FrameForceComponents {
  return frozenComponents([
    left[0] + rightFactor * right[0],
    left[1] + rightFactor * right[1],
    left[2] + rightFactor * right[2],
    left[3] + rightFactor * right[3],
    left[4] + rightFactor * right[4],
    left[5] + rightFactor * right[5],
  ]);
}

export function addFrameInternalForceSegments(
  left: readonly FrameInternalForceSegment[],
  right: readonly FrameInternalForceSegment[],
  rightFactor = 1,
): readonly FrameInternalForceSegment[] {
  if (left.length !== right.length) {
    throw new RangeError("Frame internal-force segment layouts must have equal lengths.");
  }
  return Object.freeze(
    left.map((segment, index) => {
      const other = right[index]!;
      if (segment.start !== other.start || segment.end !== other.end) {
        throw new RangeError("Frame internal-force segment boundaries must match.");
      }
      const coefficients = Object.freeze([
        addedCoefficients(segment.coefficients[0], other.coefficients[0], rightFactor),
        addedCoefficients(segment.coefficients[1], other.coefficients[1], rightFactor),
        addedCoefficients(segment.coefficients[2], other.coefficients[2], rightFactor),
        addedCoefficients(segment.coefficients[3], other.coefficients[3], rightFactor),
        addedCoefficients(segment.coefficients[4], other.coefficients[4], rightFactor),
        addedCoefficients(segment.coefficients[5], other.coefficients[5], rightFactor),
      ]) as FrameInternalForceSegment["coefficients"];
      const leftStart = segment.startLeft ?? evaluateSegment(segment, 0);
      const rightStart = other.startLeft ?? evaluateSegment(other, 0);
      const length = segment.end - segment.start;
      const leftEnd = segment.endRight ?? evaluateSegment(segment, length);
      const rightEnd = other.endRight ?? evaluateSegment(other, length);
      return Object.freeze({
        start: segment.start,
        end: segment.end,
        coefficients,
        ...(index === 0 ? { startLeft: addedComponents(leftStart, rightStart, rightFactor) } : {}),
        ...(index + 1 === left.length
          ? { endRight: addedComponents(leftEnd, rightEnd, rightFactor) }
          : {}),
      });
    }),
  );
}

function equalComponents(left: FrameForceComponents, right: FrameForceComponents): boolean {
  for (let component = 0; component < left.length; component += 1) {
    if (left[component] !== right[component]) return false;
  }
  return true;
}

function polynomialStation(
  x: number,
  side: FrameInternalForceStation["side"],
  values: FrameForceComponents,
): FrameInternalForceStation {
  return Object.freeze({
    x,
    side,
    axial: values[0],
    shearY: values[1],
    shearZ: values[2],
    torsion: values[3],
    bendingY: values[4],
    bendingZ: values[5],
  });
}

function addBoundaryStations(
  result: FrameInternalForceStation[],
  x: number,
  left: FrameForceComponents,
  right: FrameForceComponents,
): void {
  if (equalComponents(left, right)) {
    result.push(polynomialStation(x, "single", left));
  } else {
    result.push(polynomialStation(x, "left", left), polynomialStation(x, "right", right));
  }
}

export function deriveFrameInternalForceStations(
  segments: readonly FrameInternalForceSegment[],
): readonly FrameInternalForceStation[] {
  if (segments.length === 0) return Object.freeze([]);
  const stations: FrameInternalForceStation[] = [];
  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index]!;
    const length = segment.end - segment.start;
    if (index === 0) {
      const right = evaluateSegment(segment, 0);
      addBoundaryStations(stations, segment.start, segment.startLeft ?? right, right);
    }
    const roots = new Set<number>();
    for (const coefficients of segment.coefficients) {
      for (const root of frameForceDerivativeRoots(coefficients, length)) roots.add(root);
    }
    for (const xi of [...roots].toSorted((left, right) => left - right)) {
      stations.push(polynomialStation(segment.start + xi, "single", evaluateSegment(segment, xi)));
    }
    const left = evaluateSegment(segment, length);
    const right =
      index + 1 === segments.length
        ? (segment.endRight ?? left)
        : evaluateSegment(segments[index + 1]!, 0);
    addBoundaryStations(stations, segment.end, left, right);
  }
  return Object.freeze(stations);
}
