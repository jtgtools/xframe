import { XFrameError } from "../../errors/xframe-error.js";
import { finiteNumber } from "../../geometry/finite.js";
import { createVector3, normVector3 } from "../../geometry/vector-3.js";

export interface TrussStiffnessInput {
  readonly length: number;
  readonly elasticModulus: number;
  readonly area: number;
  readonly direction: ArrayLike<number>;
}

function positive(value: number, path: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new XFrameError("INPUT_INVALID", "Truss property must be positive and finite.", {
      kind: "input",
      path,
      expected: "positive finite number",
      actual: String(value),
    });
  }
  return value;
}

export function normalizedTrussDirection(
  input: ArrayLike<number>,
): readonly [number, number, number] {
  const vector = createVector3(input, "truss.direction");
  const norm = normVector3(vector);
  if (norm <= 256 * Number.EPSILON) {
    throw new XFrameError("GEOMETRY_INVALID", "Truss direction cannot be zero.", {
      kind: "geometry",
      path: "truss.direction",
      reason: "direction norm is zero",
      value: String(norm),
    });
  }
  return Object.freeze([vector[0]! / norm, vector[1]! / norm, vector[2]! / norm]);
}

export function computeTrussGlobalStiffness(input: TrussStiffnessInput): Float64Array {
  const length = positive(input.length, "truss.length");
  const stiffness =
    (positive(input.elasticModulus, "truss.elasticModulus") * positive(input.area, "truss.area")) /
    length;
  const direction = normalizedTrussDirection(input.direction);
  const result = new Float64Array(36);
  for (let row = 0; row < 3; row += 1) {
    for (let column = 0; column < 3; column += 1) {
      const value = finiteNumber(
        stiffness * direction[row]! * direction[column]!,
        `trussStiffness[${row},${column}]`,
      );
      result[row * 6 + column] = value;
      result[row * 6 + column + 3] = -value;
      result[(row + 3) * 6 + column] = -value;
      result[(row + 3) * 6 + column + 3] = value;
    }
  }
  return result;
}
