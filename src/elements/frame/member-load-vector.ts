import { XFrameError } from "../../errors/xframe-error.js";
import { finiteNumber } from "../../geometry/finite.js";
import type { FrameTheory } from "../frame-theory.js";

export type LocalLoadVector = readonly [number, number, number];

export type FrameMemberLoad =
  | { readonly kind: "point-force"; readonly distance: number; readonly vector: LocalLoadVector }
  | { readonly kind: "point-moment"; readonly distance: number; readonly vector: LocalLoadVector }
  | {
      readonly kind: "distributed";
      readonly start: number;
      readonly end: number;
      readonly startIntensity: LocalLoadVector;
      readonly endIntensity: LocalLoadVector;
    };

export interface FrameEquivalentLoadInput {
  readonly length: number;
  readonly elasticModulus: number;
  readonly shearModulus: number;
  readonly momentOfInertiaY: number;
  readonly momentOfInertiaZ: number;
  readonly shearAreaY?: number;
  readonly shearAreaZ?: number;
  readonly theory: FrameTheory;
  readonly load: FrameMemberLoad;
}

const GAUSS_POINTS = [
  -0.9602898564975363, -0.7966664774136267, -0.525532409916329, -0.1834346424956498,
  0.1834346424956498, 0.525532409916329, 0.7966664774136267, 0.9602898564975363,
] as const;
const GAUSS_WEIGHTS = [
  0.1012285362903763, 0.2223810344533745, 0.3137066458778873, 0.362683783378362, 0.362683783378362,
  0.3137066458778873, 0.2223810344533745, 0.1012285362903763,
] as const;

function positive(value: number | undefined, path: string): number {
  if (value === undefined || !Number.isFinite(value) || value <= 0) {
    throw new XFrameError(
      "LOAD_INVALID",
      "Member-load kernel property must be positive and finite.",
      {
        kind: "input",
        path,
        expected: "positive finite number",
        actual: String(value),
      },
    );
  }
  return value;
}

function checkedDistance(value: number, length: number, path: string): number {
  const result = finiteNumber(value, path);
  if (result < 0 || result > length) {
    throw new XFrameError(
      "LOAD_INVALID",
      "Member-load coordinate lies outside the deformable member.",
      {
        kind: "input",
        path,
        expected: `distance in [0, ${length}]`,
        actual: String(result),
      },
    );
  }
  return result;
}

function checkedVector(value: LocalLoadVector, path: string): LocalLoadVector {
  return [
    finiteNumber(value[0], `${path}[0]`),
    finiteNumber(value[1], `${path}[1]`),
    finiteNumber(value[2], `${path}[2]`),
  ];
}

function shearParameters(
  input: FrameEquivalentLoadInput,
  length: number,
): readonly [number, number] {
  if (input.theory.kind === "euler-bernoulli") return [0, 0];
  const elasticModulus = positive(input.elasticModulus, "frame.elasticModulus");
  const shearModulus = positive(input.shearModulus, "frame.shearModulus");
  const phiY =
    (12 * elasticModulus * positive(input.momentOfInertiaZ, "frame.momentOfInertiaZ")) /
    (shearModulus * positive(input.shearAreaY, "frame.shearAreaY") * length ** 2);
  const phiZ =
    (12 * elasticModulus * positive(input.momentOfInertiaY, "frame.momentOfInertiaY")) /
    (shearModulus * positive(input.shearAreaZ, "frame.shearAreaZ") * length ** 2);
  return [finiteNumber(phiY, "frame.phiY"), finiteNumber(phiZ, "frame.phiZ")];
}

function displacementShapes(
  xi: number,
  length: number,
  phi: number,
): readonly [number, number, number, number] {
  const denominator = 1 + phi;
  const oneMinus = 1 - xi;
  return [
    (1 - 3 * xi ** 2 + 2 * xi ** 3 + phi * oneMinus) / denominator,
    (length * (xi - 2 * xi ** 2 + xi ** 3 + 0.5 * phi * (xi - xi ** 2))) / denominator,
    (3 * xi ** 2 - 2 * xi ** 3 + phi * xi) / denominator,
    (length * (-(xi ** 2) + xi ** 3 - 0.5 * phi * (xi - xi ** 2))) / denominator,
  ];
}

function rotationShapes(
  xi: number,
  length: number,
  phi: number,
): readonly [number, number, number, number] {
  const denominator = 1 + phi;
  return [
    (6 * (-xi + xi ** 2)) / (length * denominator),
    (1 - 4 * xi + 3 * xi ** 2 + phi * (1 - xi)) / denominator,
    (6 * (xi - xi ** 2)) / (length * denominator),
    (-2 * xi + 3 * xi ** 2 + phi * xi) / denominator,
  ];
}

function addForceShape(
  result: Float64Array,
  x: number,
  length: number,
  phiY: number,
  phiZ: number,
  vector: LocalLoadVector,
  scale: number,
): void {
  const xi = x / length;
  const linear = [1 - xi, xi] as const;
  result[0] = result[0]! + scale * linear[0] * vector[0];
  result[6] = result[6]! + scale * linear[1] * vector[0];
  const y = displacementShapes(xi, length, phiY);
  const yIndices = [1, 5, 7, 11] as const;
  const z = displacementShapes(xi, length, phiZ);
  const zIndices = [2, 4, 8, 10] as const;
  for (let index = 0; index < 4; index += 1) {
    result[yIndices[index]!] = result[yIndices[index]!]! + scale * y[index]! * vector[1];
    const sign = index % 2 === 1 ? -1 : 1;
    result[zIndices[index]!] = result[zIndices[index]!]! + scale * z[index]! * sign * vector[2];
  }
}

function addMomentShape(
  result: Float64Array,
  x: number,
  length: number,
  phiY: number,
  phiZ: number,
  vector: LocalLoadVector,
): void {
  const xi = x / length;
  result[3] = result[3]! + (1 - xi) * vector[0];
  result[9] = result[9]! + xi * vector[0];
  const aboutZ = rotationShapes(xi, length, phiY);
  const yIndices = [1, 5, 7, 11] as const;
  const slopeZ = rotationShapes(xi, length, phiZ);
  const zIndices = [2, 4, 8, 10] as const;
  for (let index = 0; index < 4; index += 1) {
    result[yIndices[index]!] = result[yIndices[index]!]! + aboutZ[index]! * vector[2];
    const sign = index % 2 === 1 ? 1 : -1;
    result[zIndices[index]!] = result[zIndices[index]!]! + slopeZ[index]! * sign * vector[1];
  }
}

export function computeFrameEquivalentLoad(input: FrameEquivalentLoadInput): Float64Array {
  const length = positive(input.length, "frame.length");
  const [phiY, phiZ] = shearParameters(input, length);
  const result = new Float64Array(12);
  if (input.load.kind === "point-force") {
    const distance = checkedDistance(input.load.distance, length, "memberLoad.distance");
    addForceShape(
      result,
      distance,
      length,
      phiY,
      phiZ,
      checkedVector(input.load.vector, "memberLoad.vector"),
      1,
    );
  } else if (input.load.kind === "point-moment") {
    const distance = checkedDistance(input.load.distance, length, "memberLoad.distance");
    addMomentShape(
      result,
      distance,
      length,
      phiY,
      phiZ,
      checkedVector(input.load.vector, "memberLoad.vector"),
    );
  } else {
    const start = checkedDistance(input.load.start, length, "memberLoad.start");
    const end = checkedDistance(input.load.end, length, "memberLoad.end");
    if (end <= start) {
      throw new XFrameError("LOAD_INVALID", "Distributed-load end must be after its start.", {
        kind: "input",
        path: "memberLoad.end",
        expected: `distance greater than ${start}`,
        actual: String(end),
      });
    }
    const startIntensity = checkedVector(input.load.startIntensity, "memberLoad.startIntensity");
    const endIntensity = checkedVector(input.load.endIntensity, "memberLoad.endIntensity");
    const midpoint = (start + end) / 2;
    const half = (end - start) / 2;
    for (let point = 0; point < GAUSS_POINTS.length; point += 1) {
      const x = midpoint + half * GAUSS_POINTS[point]!;
      const ratio = (x - start) / (end - start);
      const intensity: LocalLoadVector = [
        startIntensity[0] + ratio * (endIntensity[0] - startIntensity[0]),
        startIntensity[1] + ratio * (endIntensity[1] - startIntensity[1]),
        startIntensity[2] + ratio * (endIntensity[2] - startIntensity[2]),
      ];
      addForceShape(result, x, length, phiY, phiZ, intensity, half * GAUSS_WEIGHTS[point]!);
    }
  }
  for (let index = 0; index < result.length; index += 1)
    result[index] = finiteNumber(result[index], `frameEquivalentLoad[${index}]`);
  return result;
}
