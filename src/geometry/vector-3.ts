import { XFrameError } from "../errors/xframe-error.js";
import { finiteFloat64Array, finiteNumber } from "./finite.js";

export type Vector3 = Float64Array;

function requireLengthThree(value: ArrayLike<unknown>, path: string): void {
  if (value.length !== 3) {
    throw new XFrameError("GEOMETRY_INVALID", `Expected a three-component vector at ${path}.`, {
      kind: "geometry",
      path,
      reason: "vector must contain exactly three components",
      value: String(value.length),
    });
  }
}

export function createVector3(value: ArrayLike<unknown>, path = "vector"): Vector3 {
  requireLengthThree(value, path);
  return finiteFloat64Array(value, path);
}

export function addVector3(left: ArrayLike<number>, right: ArrayLike<number>): Vector3 {
  requireLengthThree(left, "left");
  requireLengthThree(right, "right");
  return createVector3([
    finiteNumber(left[0]! + right[0]!, "sum[0]"),
    finiteNumber(left[1]! + right[1]!, "sum[1]"),
    finiteNumber(left[2]! + right[2]!, "sum[2]"),
  ]);
}

export function subtractVector3(left: ArrayLike<number>, right: ArrayLike<number>): Vector3 {
  requireLengthThree(left, "left");
  requireLengthThree(right, "right");
  return createVector3([
    finiteNumber(left[0]! - right[0]!, "difference[0]"),
    finiteNumber(left[1]! - right[1]!, "difference[1]"),
    finiteNumber(left[2]! - right[2]!, "difference[2]"),
  ]);
}

export function scaleVector3(value: ArrayLike<number>, scalar: number): Vector3 {
  requireLengthThree(value, "value");
  const checkedScalar = finiteNumber(scalar, "scalar");
  return createVector3([
    finiteNumber(value[0]! * checkedScalar, "scaled[0]"),
    finiteNumber(value[1]! * checkedScalar, "scaled[1]"),
    finiteNumber(value[2]! * checkedScalar, "scaled[2]"),
  ]);
}

export function dotVector3(left: ArrayLike<number>, right: ArrayLike<number>): number {
  requireLengthThree(left, "left");
  requireLengthThree(right, "right");
  return finiteNumber(left[0]! * right[0]! + left[1]! * right[1]! + left[2]! * right[2]!, "dot");
}

export function crossVector3(left: ArrayLike<number>, right: ArrayLike<number>): Vector3 {
  requireLengthThree(left, "left");
  requireLengthThree(right, "right");
  return createVector3([
    finiteNumber(left[1]! * right[2]! - left[2]! * right[1]!, "cross[0]"),
    finiteNumber(left[2]! * right[0]! - left[0]! * right[2]!, "cross[1]"),
    finiteNumber(left[0]! * right[1]! - left[1]! * right[0]!, "cross[2]"),
  ]);
}

export function normVector3(value: ArrayLike<number>): number {
  requireLengthThree(value, "value");
  return finiteNumber(Math.hypot(value[0]!, value[1]!, value[2]!), "norm");
}

export function normalizeVector3(value: ArrayLike<number>): Vector3 {
  const copied = createVector3(value);
  const length = normVector3(copied);
  if (length === 0) {
    throw new XFrameError("GEOMETRY_INVALID", "Cannot normalize a zero vector.", {
      kind: "geometry",
      path: "vector",
      reason: "zero vector has no direction",
      value: "0",
    });
  }
  return scaleVector3(copied, 1 / length);
}
