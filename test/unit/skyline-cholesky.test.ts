import { describe, expect, it } from "vitest";
import { XFrameError } from "../../src/errors/xframe-error.js";
import { estimateSkylineMemory } from "../../src/linalg/memory-estimate.js";
import { factorSkylineCholesky } from "../../src/linalg/skyline-cholesky.js";
import { createSkylineProfile } from "../../src/linalg/skyline-profile.js";
import { computeResidualDiagnostics } from "../../src/linalg/residual.js";
import { identityOrdering } from "../../src/linalg/reverse-cuthill-mckee.js";
import { SymmetricCoordinateBuilder } from "../../src/linalg/symmetric-coordinate-matrix.js";

function handMatrix() {
  return new SymmetricCoordinateBuilder(3)
    .add(0, 0, 4)
    .add(1, 0, 1)
    .add(1, 1, 3)
    .add(2, 1, 1)
    .add(2, 2, 2)
    .finalize();
}

function failureCode(action: () => unknown): string {
  try {
    action();
  } catch (error) {
    if (error instanceof XFrameError) return error.code;
    throw error;
  }
  throw new Error("expected failure");
}

describe("skyline profile and Cholesky", () => {
  it("stores the exact lower skyline for a hand matrix", () => {
    const profile = createSkylineProfile(handMatrix(), identityOrdering(3));
    expect(profile.firstColumns).toEqual([0, 0, 1]);
    expect(profile.rowStarts).toEqual([0, 1, 3, 5]);
    expect(Array.from(profile.values())).toEqual([4, 1, 3, 1, 2]);
    expect(profile.storageCount).toBe(5);
  });

  it("solves one and multiple right-hand sides", () => {
    const matrix = handMatrix();
    const factor = factorSkylineCholesky(createSkylineProfile(matrix, identityOrdering(3)));
    const solution = factor.solve([1, 2, 3]);
    expect(solution[0]).toBeCloseTo(2 / 9, 12);
    expect(solution[1]).toBeCloseTo(1 / 9, 12);
    expect(solution[2]).toBeCloseTo(13 / 9, 12);
    const multiple = factor.solveMany([
      [1, 2, 3],
      [6, 10, 8],
    ]);
    expect(multiple[1]![0]).toBeCloseTo(1, 14);
    expect(multiple[1]![1]).toBeCloseTo(2, 14);
    expect(multiple[1]![2]).toBeCloseTo(3, 14);
    expect(factor.diagnostics.minimumNormalizedPivot).toBeGreaterThan(0);
  });

  it("rejects intermediate non-finite products with a located error", () => {
    const matrix = new SymmetricCoordinateBuilder(1).add(0, 0, 1e308).finalize();
    expect(() => matrix.multiply([1e308])).toThrowError(XFrameError);
    expect(failureCode(() => matrix.multiply([1e308]))).toBe("NON_FINITE_VALUE");
  });

  it("uses a finite sentinel for zero-load nonzero residual that still fails diagnostics", () => {
    const matrix = handMatrix();
    const diagnostics = computeResidualDiagnostics(matrix, new Float64Array([1, 0, 0]), [0, 0, 0]);
    expect(diagnostics.maximumAbsoluteResidual).toBeGreaterThan(0);
    expect(Number.isFinite(diagnostics.normalizedResidual)).toBe(true);
    expect(diagnostics.normalizedResidual).toBe(Number.MAX_VALUE);
  });

  it("computes residual and energy diagnostics against the original sparse matrix", () => {
    const matrix = handMatrix();
    const x = new Float64Array([2 / 9, 1 / 9, 13 / 9]);
    const diagnostics = computeResidualDiagnostics(matrix, x, [1, 2, 3]);
    expect(diagnostics.maximumAbsoluteResidual).toBeLessThan(1e-14);
    expect(diagnostics.normalizedResidual).toBeLessThan(1e-14);
    expect(diagnostics.quadraticEnergy).toBeCloseTo(43 / 9, 12);
  });

  it("rejects singular or indefinite pivots structurally", () => {
    const singular = new SymmetricCoordinateBuilder(2)
      .add(0, 0, 1)
      .add(1, 0, 1)
      .add(1, 1, 1)
      .finalize();
    expect(() =>
      factorSkylineCholesky(createSkylineProfile(singular, identityOrdering(2))),
    ).toThrow(XFrameError);
    const indefinite = new SymmetricCoordinateBuilder(2).add(0, 0, 1).add(1, 1, -1).finalize();
    expect(() =>
      factorSkylineCholesky(createSkylineProfile(indefinite, identityOrdering(2))),
    ).toThrow(XFrameError);
  });

  it("rejects unsafe skyline allocation before creating typed arrays", () => {
    const estimate = estimateSkylineMemory([0, 0, 0, 0], 1024);
    expect(estimate.storageCount).toBe(10);
    expect(estimate.estimatedBytes).toBeGreaterThan(80);
    expect(() =>
      estimateSkylineMemory(
        Array.from({ length: 1000 }, () => 0),
        1000,
      ),
    ).toThrow(XFrameError);
  });
});
