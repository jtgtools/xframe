import { XFrameError } from "../errors/xframe-error.js";
import { finiteNumber } from "./finite.js";

export interface Tolerance {
  readonly absolute: number;
  readonly relative: number;
}

// 64 ulps allow for the bounded accumulation in fixed-size 3D vector and matrix kernels.
export const GEOMETRY_COMPARISON_TOLERANCE: Tolerance = Object.freeze({
  absolute: 0,
  relative: 64 * Number.EPSILON,
});

// sqrt(epsilon) is the conventional angular separation boundary at which projection
// loses roughly half of double-precision significant digits.
export const GEOMETRY_ORIENTATION_TOLERANCE: Tolerance = Object.freeze({
  absolute: 0,
  relative: Math.sqrt(Number.EPSILON),
});

function checkedTolerance(tolerance: Tolerance): Tolerance {
  const absolute = finiteNumber(tolerance.absolute, "tolerance.absolute");
  const relative = finiteNumber(tolerance.relative, "tolerance.relative");
  if (absolute < 0 || relative < 0) {
    throw new XFrameError("INPUT_INVALID", "Tolerance terms must be nonnegative.", {
      kind: "input",
      path: "tolerance",
      expected: "nonnegative absolute and relative terms",
      actual: `${absolute},${relative}`,
    });
  }
  return tolerance;
}

export function withinTolerance(
  actual: number,
  expected: number,
  referenceScale: number,
  tolerance: Tolerance,
): boolean {
  const checkedActual = finiteNumber(actual, "actual");
  const checkedExpected = finiteNumber(expected, "expected");
  const checkedScale = finiteNumber(referenceScale, "referenceScale");
  const checked = checkedTolerance(tolerance);
  if (checkedScale < 0) {
    throw new XFrameError("INPUT_INVALID", "Reference scale must be nonnegative.", {
      kind: "input",
      path: "referenceScale",
      expected: "nonnegative finite number",
      actual: String(checkedScale),
    });
  }
  return Math.abs(checkedActual - checkedExpected) <= checked.absolute + checked.relative * checkedScale;
}

export function isScaledZero(value: number, referenceScale: number, tolerance: Tolerance): boolean {
  return withinTolerance(value, 0, referenceScale, tolerance);
}
