import { XFrameError } from "../../errors/xframe-error.js";
import { finiteNumber } from "../../geometry/finite.js";
import { createMatrix3 } from "../../geometry/matrix-3.js";
import { createVector3 } from "../../geometry/vector-3.js";

export interface FrameRigidOffsetTransform {
  readonly matrix: Float64Array;
  toLocalDisplacements(globalNodalDisplacements: ArrayLike<number>): Float64Array;
  forceToGlobal(localEndForces: ArrayLike<number>): Float64Array;
  stiffnessToGlobal(localStiffness: ArrayLike<number>): Float64Array;
}

function checkedVector(values: ArrayLike<number>, length: number, path: string): Float64Array {
  if (values.length !== length) {
    throw new XFrameError("INPUT_INVALID", "Transformation input has an invalid length.", {
      kind: "input",
      path,
      expected: `array-like of length ${length}`,
      actual: `length ${values.length}`,
    });
  }
  const result = new Float64Array(length);
  for (let index = 0; index < length; index += 1)
    result[index] = finiteNumber(values[index], `${path}[${index}]`);
  return result;
}

function endpointBlock(
  globalToLocal: ArrayLike<number>,
  offsetInput: ArrayLike<number>,
): Float64Array {
  const r = createVector3(offsetInput, "frame.rigidOffset");
  const h = new Float64Array(36);
  for (let index = 0; index < 6; index += 1) h[index * 6 + index] = 1;
  h[4] = r[2]!;
  h[5] = -r[1]!;
  h[1 * 6 + 3] = -r[2]!;
  h[1 * 6 + 5] = r[0]!;
  h[2 * 6 + 3] = r[1]!;
  h[2 * 6 + 4] = -r[0]!;
  const result = new Float64Array(36);
  for (let block = 0; block < 2; block += 1) {
    for (let row = 0; row < 3; row += 1) {
      for (let column = 0; column < 6; column += 1) {
        let value = 0;
        for (let inner = 0; inner < 3; inner += 1)
          value += globalToLocal[row * 3 + inner]! * h[(inner + block * 3) * 6 + column]!;
        result[(row + block * 3) * 6 + column] = finiteNumber(
          value,
          `frameTransform[${row + block * 3},${column}]`,
        );
      }
    }
  }
  return result;
}

function transposeMultiply(matrix: Float64Array, vector: Float64Array): Float64Array {
  const result = new Float64Array(12);
  for (let column = 0; column < 12; column += 1) {
    let value = 0;
    for (let row = 0; row < 12; row += 1) value += matrix[row * 12 + column]! * vector[row]!;
    result[column] = finiteNumber(value, `transformedForce[${column}]`);
  }
  return result;
}

export function createFrameRigidOffsetTransform(
  globalToLocalInput: ArrayLike<number>,
  startOffset: ArrayLike<number>,
  endOffset: ArrayLike<number>,
): FrameRigidOffsetTransform {
  const globalToLocal = createMatrix3(globalToLocalInput, "frame.globalToLocal");
  const start = endpointBlock(globalToLocal, startOffset);
  const end = endpointBlock(globalToLocal, endOffset);
  const matrix = new Float64Array(144);
  for (let row = 0; row < 6; row += 1) {
    for (let column = 0; column < 6; column += 1) {
      matrix[row * 12 + column] = start[row * 6 + column]!;
      matrix[(row + 6) * 12 + column + 6] = end[row * 6 + column]!;
    }
  }
  return Object.freeze({
    matrix,
    toLocalDisplacements(globalNodalDisplacements: ArrayLike<number>): Float64Array {
      const input = checkedVector(globalNodalDisplacements, 12, "frame.globalDisplacements");
      const result = new Float64Array(12);
      for (let row = 0; row < 12; row += 1) {
        let value = 0;
        for (let column = 0; column < 12; column += 1)
          value += matrix[row * 12 + column]! * input[column]!;
        result[row] = finiteNumber(value, `frame.localDisplacement[${row}]`);
      }
      return result;
    },
    forceToGlobal(localEndForces: ArrayLike<number>): Float64Array {
      return transposeMultiply(matrix, checkedVector(localEndForces, 12, "frame.localEndForces"));
    },
    stiffnessToGlobal(localStiffnessInput: ArrayLike<number>): Float64Array {
      const local = checkedVector(localStiffnessInput, 144, "frame.localStiffness");
      const intermediate = new Float64Array(144);
      for (let row = 0; row < 12; row += 1) {
        for (let column = 0; column < 12; column += 1) {
          let value = 0;
          for (let inner = 0; inner < 12; inner += 1)
            value += local[row * 12 + inner]! * matrix[inner * 12 + column]!;
          intermediate[row * 12 + column] = finiteNumber(value, `frame.KT[${row},${column}]`);
        }
      }
      const result = new Float64Array(144);
      for (let row = 0; row < 12; row += 1) {
        for (let column = 0; column < 12; column += 1) {
          let value = 0;
          for (let inner = 0; inner < 12; inner += 1)
            value += matrix[inner * 12 + row]! * intermediate[inner * 12 + column]!;
          result[row * 12 + column] = finiteNumber(
            value,
            `frame.globalStiffness[${row},${column}]`,
          );
        }
      }
      return result;
    },
  });
}
