import { describe, expect, it } from "vitest";
import { XFrameError } from "../../src/errors/xframe-error.js";
import { finiteFloat64Array, finiteNumber } from "../../src/geometry/finite.js";
import {
  GEOMETRY_COMPARISON_TOLERANCE,
  isScaledZero,
  withinTolerance,
} from "../../src/geometry/tolerance.js";
import {
  addVector3,
  createVector3,
  crossVector3,
  dotVector3,
  normVector3,
  normalizeVector3,
  scaleVector3,
  subtractVector3,
} from "../../src/geometry/vector-3.js";
import {
  determinantMatrix3,
  matrix3FromRows,
  multiplyMatrix3,
  multiplyMatrix3Vector3,
  transposeMatrix3,
} from "../../src/geometry/matrix-3.js";

function codeOf(action: () => unknown): string | undefined {
  try {
    action();
  } catch (error) {
    return error instanceof XFrameError ? error.code : undefined;
  }
  return undefined;
}

describe("finite numeric boundaries", () => {
  it("FR-GEO-001: accepts finite subnormals and normalizes negative zero", () => {
    expect(finiteNumber(Number.MIN_VALUE, "value")).toBe(Number.MIN_VALUE);
    expect(Object.is(finiteNumber(-0, "value"), -0)).toBe(false);
    expect(Array.from(finiteFloat64Array([-0, Number.MIN_VALUE], "values"))).toEqual([0, Number.MIN_VALUE]);
  });

  it("FR-GEO-001: rejects NaN, infinities, and overflow products", () => {
    for (const value of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.MAX_VALUE * 2]) {
      expect(codeOf(() => finiteNumber(value, "value"))).toBe("NON_FINITE_VALUE");
    }
    expect(codeOf(() => finiteFloat64Array([1, Number.NaN], "values"))).toBe("NON_FINITE_VALUE");
  });
});

describe("scale-aware tolerance", () => {
  it("FR-GEO-002: combines absolute and relative terms against an independent reference scale", () => {
    expect(withinTolerance(1_000_000.000001, 1_000_000, 1_000_000, { absolute: 1e-9, relative: 2e-12 })).toBe(true);
    expect(withinTolerance(1_000_000.01, 1_000_000, 1_000_000, { absolute: 1e-9, relative: 2e-12 })).toBe(false);
    expect(withinTolerance(5e-13, 0, 1, { absolute: 1e-12, relative: 0 })).toBe(true);
  });

  it("FR-GEO-002: scaled-zero checks preserve small valid quantities at small physical scales", () => {
    expect(isScaledZero(1e-15, 1e-15, GEOMETRY_COMPARISON_TOLERANCE)).toBe(false);
    expect(isScaledZero(1e-7, 1e9, GEOMETRY_COMPARISON_TOLERANCE)).toBe(true);
  });
});

describe("Vector3 and Matrix3", () => {
  it("FR-GEO-003: implements vector algebra without aliasing caller storage", () => {
    const input = [1, 2, 3];
    const a = createVector3(input, "a");
    input[0] = 99;
    const b = createVector3([4, -2, 1], "b");

    expect(Array.from(a)).toEqual([1, 2, 3]);
    expect(Array.from(addVector3(a, b))).toEqual([5, 0, 4]);
    expect(Array.from(subtractVector3(a, b))).toEqual([-3, 4, 2]);
    expect(Array.from(scaleVector3(a, 2))).toEqual([2, 4, 6]);
    expect(dotVector3(a, b)).toBe(3);
    expect(Array.from(crossVector3(a, b))).toEqual([8, 11, -10]);
    expect(normVector3(createVector3([3, 4, 0]))).toBe(5);
    const normalized = normalizeVector3(createVector3([0, 3, 4]));
    expect(normalized[0]).toBe(0);
    expect(normalized[1]).toBeCloseTo(0.6, 15);
    expect(normalized[2]).toBeCloseTo(0.8, 15);
  });

  it("FR-GEO-003: applies row-major 3x3 transforms and transpose round-trips", () => {
    const rotation = matrix3FromRows(
      createVector3([0, 1, 0]),
      createVector3([-1, 0, 0]),
      createVector3([0, 0, 1]),
    );
    const transpose = transposeMatrix3(rotation);
    const identity = multiplyMatrix3(rotation, transpose);

    expect(Array.from(multiplyMatrix3Vector3(rotation, createVector3([2, 3, 4])))).toEqual([3, -2, 4]);
    expect(Array.from(identity)).toEqual([1, 0, 0, 0, 1, 0, 0, 0, 1]);
    expect(determinantMatrix3(rotation)).toBe(1);
  });

  it("FR-GEO-002: rejects normalization of the zero vector", () => {
    expect(() => normalizeVector3(createVector3([0, 0, 0]))).toThrow(XFrameError);
  });
});
