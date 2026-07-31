import { XFrameError } from "../../errors/xframe-error.js";
import { finiteNumber } from "../../geometry/finite.js";
import type { FrameTheory } from "../frame-theory.js";

export interface FrameLocalStiffnessInput {
  readonly length: number;
  readonly elasticModulus: number;
  readonly shearModulus: number;
  readonly area: number;
  readonly torsionalConstant: number;
  readonly momentOfInertiaY: number;
  readonly momentOfInertiaZ: number;
  readonly shearAreaY?: number;
  readonly shearAreaZ?: number;
  readonly theory: FrameTheory;
}

function positive(value: number | undefined, path: string): number {
  if (value === undefined || !Number.isFinite(value) || value <= 0) {
    throw new XFrameError("INPUT_INVALID", "Frame stiffness property must be positive and finite.", {
      kind: "input",
      path,
      expected: "positive finite number",
      actual: String(value),
    });
  }
  return value;
}

function add(k: Float64Array, row: number, column: number, value: number): void {
  k[row * 12 + column] = finiteNumber(k[row * 12 + column]! + value, `frameStiffness[${row},${column}]`);
}

function addPair(k: Float64Array, first: number, second: number, stiffness: number): void {
  add(k, first, first, stiffness);
  add(k, first, second, -stiffness);
  add(k, second, first, -stiffness);
  add(k, second, second, stiffness);
}

function addBending(
  k: Float64Array,
  displacementStart: number,
  rotationStart: number,
  displacementEnd: number,
  rotationEnd: number,
  elasticModulus: number,
  inertia: number,
  length: number,
  phi: number,
  rotationSign: 1 | -1,
): void {
  const denominator = 1 + phi;
  const a = (12 * elasticModulus * inertia) / (length ** 3 * denominator);
  const b = (6 * elasticModulus * inertia) / (length ** 2 * denominator);
  const c = ((4 + phi) * elasticModulus * inertia) / (length * denominator);
  const d = ((2 - phi) * elasticModulus * inertia) / (length * denominator);
  const indices = [displacementStart, rotationStart, displacementEnd, rotationEnd] as const;
  const signs = [1, rotationSign, 1, rotationSign] as const;
  const standard = [
    a, b, -a, b,
    b, c, -b, d,
    -a, -b, a, -b,
    b, d, -b, c,
  ];
  for (let row = 0; row < 4; row += 1) {
    for (let column = 0; column < 4; column += 1) {
      add(k, indices[row]!, indices[column]!, standard[row * 4 + column]! * signs[row]! * signs[column]!);
    }
  }
}

export function computeFrameLocalStiffness(input: FrameLocalStiffnessInput): Float64Array {
  const length = positive(input.length, "frame.length");
  const elasticModulus = positive(input.elasticModulus, "frame.elasticModulus");
  const shearModulus = positive(input.shearModulus, "frame.shearModulus");
  const area = positive(input.area, "frame.area");
  const torsionalConstant = positive(input.torsionalConstant, "frame.torsionalConstant");
  const inertiaY = positive(input.momentOfInertiaY, "frame.momentOfInertiaY");
  const inertiaZ = positive(input.momentOfInertiaZ, "frame.momentOfInertiaZ");
  let phiY = 0;
  let phiZ = 0;
  if (input.theory.kind === "timoshenko") {
    const shearAreaY = positive(input.shearAreaY, "frame.shearAreaY");
    const shearAreaZ = positive(input.shearAreaZ, "frame.shearAreaZ");
    phiY = finiteNumber((12 * elasticModulus * inertiaZ) / (shearModulus * shearAreaY * length ** 2), "frame.phiY");
    phiZ = finiteNumber((12 * elasticModulus * inertiaY) / (shearModulus * shearAreaZ * length ** 2), "frame.phiZ");
  }
  const stiffness = new Float64Array(144);
  addPair(stiffness, 0, 6, (elasticModulus * area) / length);
  addPair(stiffness, 3, 9, (shearModulus * torsionalConstant) / length);
  addBending(stiffness, 1, 5, 7, 11, elasticModulus, inertiaZ, length, phiY, 1);
  addBending(stiffness, 2, 4, 8, 10, elasticModulus, inertiaY, length, phiZ, -1);
  return stiffness;
}
