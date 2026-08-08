import { XFrameError } from "../errors/xframe-error.js";
import { determinantMatrix3, matrix3FromRows, transposeMatrix3, type Matrix3 } from "./matrix-3.js";
import {
  GEOMETRY_COMPARISON_TOLERANCE,
  GEOMETRY_ORIENTATION_TOLERANCE,
  isScaledZero,
  withinTolerance,
} from "./tolerance.js";
import {
  createVector3,
  crossVector3,
  dotVector3,
  normVector3,
  normalizeVector3,
  scaleVector3,
  subtractVector3,
  type Vector3,
} from "./vector-3.js";

export interface LocalAxes {
  readonly x: Vector3;
  readonly y: Vector3;
  readonly z: Vector3;
  readonly globalToLocal: Matrix3;
  readonly localToGlobal: Matrix3;
}

function geometryError(
  path: string,
  reason: string,
  value?: number,
  referenceScale?: number,
): never {
  throw new XFrameError("GEOMETRY_INVALID", "Local-axis geometry is invalid.", {
    kind: "geometry",
    path,
    reason,
    ...(value === undefined ? {} : { value: String(value) }),
    ...(referenceScale === undefined ? {} : { referenceScale }),
  });
}

function coordinateScale(start: ArrayLike<number>, end: ArrayLike<number>, length: number): number {
  return Math.max(normVector3(start), normVector3(end), length);
}

function leastAlignedBasis(x: ArrayLike<number>): Vector3 {
  const candidates = [createVector3([1, 0, 0]), createVector3([0, 1, 0]), createVector3([0, 0, 1])];
  let selected = candidates[0]!;
  let alignment = Math.abs(dotVector3(x, selected));
  for (let index = 1; index < candidates.length; index += 1) {
    const candidate = candidates[index]!;
    const candidateAlignment = Math.abs(dotVector3(x, candidate));
    if (candidateAlignment < alignment) {
      selected = candidate;
      alignment = candidateAlignment;
    }
  }
  return selected;
}

function projectedYAxis(x: Vector3, orientation: ArrayLike<unknown>, explicit: boolean): Vector3 {
  const candidate = createVector3(orientation, "orientation");
  const candidateNorm = normVector3(candidate);
  if (candidateNorm === 0) {
    geometryError("orientation", "orientation vector is zero", 0, 0);
  }
  const projection = subtractVector3(candidate, scaleVector3(x, dotVector3(candidate, x)));
  const projectionNorm = normVector3(projection);
  if (isScaledZero(projectionNorm, candidateNorm, GEOMETRY_ORIENTATION_TOLERANCE)) {
    if (explicit) {
      geometryError(
        "orientation",
        "orientation vector is parallel or nearly parallel to the member axis",
        projectionNorm,
        candidateNorm,
      );
    }
    geometryError(
      "orientation",
      "deterministic fallback unexpectedly degenerated",
      projectionNorm,
      candidateNorm,
    );
  }
  return normalizeVector3(projection);
}

function validateAxes(x: Vector3, y: Vector3, z: Vector3, globalToLocal: Matrix3): void {
  const checks = [
    withinTolerance(normVector3(x), 1, 1, GEOMETRY_COMPARISON_TOLERANCE),
    withinTolerance(normVector3(y), 1, 1, GEOMETRY_COMPARISON_TOLERANCE),
    withinTolerance(normVector3(z), 1, 1, GEOMETRY_COMPARISON_TOLERANCE),
    withinTolerance(dotVector3(x, y), 0, 1, GEOMETRY_COMPARISON_TOLERANCE),
    withinTolerance(dotVector3(x, z), 0, 1, GEOMETRY_COMPARISON_TOLERANCE),
    withinTolerance(dotVector3(y, z), 0, 1, GEOMETRY_COMPARISON_TOLERANCE),
    withinTolerance(determinantMatrix3(globalToLocal), 1, 1, GEOMETRY_COMPARISON_TOLERANCE),
  ];
  if (checks.some((passed) => !passed)) {
    geometryError("localAxes", "constructed basis failed orthonormal right-handed validation");
  }
}

export function buildLocalAxes(
  startInput: ArrayLike<unknown>,
  endInput: ArrayLike<unknown>,
  orientationInput?: ArrayLike<unknown>,
): LocalAxes {
  const start = createVector3(startInput, "start");
  const end = createVector3(endInput, "end");
  const delta = subtractVector3(end, start);
  const length = normVector3(delta);
  const scale = coordinateScale(start, end, length);
  if (length === 0 || isScaledZero(length, scale, GEOMETRY_COMPARISON_TOLERANCE)) {
    geometryError(
      "end",
      "member length is zero or unresolved at the coordinate scale",
      length,
      scale,
    );
  }

  const x = normalizeVector3(delta);
  const orientation = orientationInput === undefined ? leastAlignedBasis(x) : orientationInput;
  const projectedY = projectedYAxis(x, orientation, orientationInput !== undefined);
  const z = normalizeVector3(crossVector3(x, projectedY));
  const y = normalizeVector3(crossVector3(z, x));
  const globalToLocal = matrix3FromRows(x, y, z);
  validateAxes(x, y, z, globalToLocal);

  return Object.freeze({
    x,
    y,
    z,
    globalToLocal,
    localToGlobal: transposeMatrix3(globalToLocal),
  });
}
