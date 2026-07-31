import type { FrameMemberLoad } from "../elements/frame/member-load-vector.js";
import type { FrameInternalForceStation } from "./result-types.js";

function crossX(vector: readonly number[]): readonly [number, number, number] {
  return [0, -vector[2]!, vector[1]!];
}

function pointIncluded(distance: number, x: number, side: FrameInternalForceStation["side"]): boolean {
  return distance < x || (distance === x && side !== "left");
}

function distributedIntegrals(
  load: Extract<FrameMemberLoad, { readonly kind: "distributed" }>,
  x: number,
): { readonly force: readonly [number, number, number]; readonly firstMoment: readonly [number, number, number] } {
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
      load.start * q0 * d +
      ((load.start * slope + q0) * d ** 2) / 2 +
      (slope * d ** 3) / 3;
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
  for (let component = 0; component < 3; component += 1) moment[component] = moment[component]! - x * startCross[component]!;

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
      for (let component = 0; component < 3; component += 1) moment[component] = moment[component]! - load.vector[component]!;
    } else {
      const integral = distributedIntegrals(load, x);
      const aboutCut = [
        integral.firstMoment[0]! - x * integral.force[0]!,
        integral.firstMoment[1]! - x * integral.force[1]!,
        integral.firstMoment[2]! - x * integral.force[2]!,
      ] as const;
      const loadCross = crossX(aboutCut);
      for (let component = 0; component < 3; component += 1) force[component] = force[component]! + integral.force[component]!;
      for (let component = 0; component < 3; component += 1) moment[component] = moment[component]! + loadCross[component]!;
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

export function frameStationLayout(length: number, allLoads: readonly FrameMemberLoad[]): readonly {
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
      if (load.distance > 0 && load.distance < length) pointCoordinates.add(load.distance);
    }
  }
  const layout: { readonly x: number; readonly side: FrameInternalForceStation["side"] }[] = [];
  for (const x of [...coordinates].sort((left, right) => left - right)) {
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
