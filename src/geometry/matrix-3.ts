import { XFrameError } from "../errors/xframe-error.js";
import { finiteFloat64Array, finiteNumber } from "./finite.js";
import { createVector3, type Vector3 } from "./vector-3.js";

export type Matrix3 = Float64Array;

function requireLengthNine(value: ArrayLike<unknown>, path: string): void {
  if (value.length !== 9) {
    throw new XFrameError("GEOMETRY_INVALID", `Expected a 3x3 matrix at ${path}.`, {
      kind: "geometry",
      path,
      reason: "matrix must contain exactly nine row-major components",
      value: String(value.length),
    });
  }
}

export function createMatrix3(value: ArrayLike<unknown>, path = "matrix"): Matrix3 {
  requireLengthNine(value, path);
  return finiteFloat64Array(value, path);
}

export function matrix3FromRows(row0: ArrayLike<number>, row1: ArrayLike<number>, row2: ArrayLike<number>): Matrix3 {
  const a = createVector3(row0, "row0");
  const b = createVector3(row1, "row1");
  const c = createVector3(row2, "row2");
  return createMatrix3([a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]]);
}

export function transposeMatrix3(matrix: ArrayLike<number>): Matrix3 {
  requireLengthNine(matrix, "matrix");
  return createMatrix3([
    matrix[0], matrix[3], matrix[6],
    matrix[1], matrix[4], matrix[7],
    matrix[2], matrix[5], matrix[8],
  ]);
}

export function multiplyMatrix3Vector3(matrix: ArrayLike<number>, vector: ArrayLike<number>): Vector3 {
  requireLengthNine(matrix, "matrix");
  const v = createVector3(vector, "vector");
  return createVector3([
    finiteNumber(matrix[0]! * v[0]! + matrix[1]! * v[1]! + matrix[2]! * v[2]!, "product[0]"),
    finiteNumber(matrix[3]! * v[0]! + matrix[4]! * v[1]! + matrix[5]! * v[2]!, "product[1]"),
    finiteNumber(matrix[6]! * v[0]! + matrix[7]! * v[1]! + matrix[8]! * v[2]!, "product[2]"),
  ]);
}

export function multiplyMatrix3(left: ArrayLike<number>, right: ArrayLike<number>): Matrix3 {
  requireLengthNine(left, "left");
  requireLengthNine(right, "right");
  const result = new Float64Array(9);
  for (let row = 0; row < 3; row += 1) {
    for (let column = 0; column < 3; column += 1) {
      let sum = 0;
      for (let inner = 0; inner < 3; inner += 1) {
        sum += left[row * 3 + inner]! * right[inner * 3 + column]!;
      }
      result[row * 3 + column] = finiteNumber(sum, `product[${row},${column}]`);
    }
  }
  return result;
}

export function determinantMatrix3(matrix: ArrayLike<number>): number {
  requireLengthNine(matrix, "matrix");
  const determinant =
    matrix[0]! * (matrix[4]! * matrix[8]! - matrix[5]! * matrix[7]!) -
    matrix[1]! * (matrix[3]! * matrix[8]! - matrix[5]! * matrix[6]!) +
    matrix[2]! * (matrix[3]! * matrix[7]! - matrix[4]! * matrix[6]!);
  return finiteNumber(determinant, "determinant");
}
