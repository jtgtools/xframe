import { describe, expect, it } from "vitest";
import { XFrameError } from "../../src/errors/xframe-error.js";
import { SymmetricCoordinateBuilder } from "../../src/linalg/symmetric-coordinate-matrix.js";

function entries(values: readonly [number, number, number][]) {
  const builder = new SymmetricCoordinateBuilder(3);
  for (const [row, column, value] of values) builder.add(row, column, value);
  return Array.from(builder.finalize().entries());
}

describe("symmetric coordinate assembly", () => {
  it("FR-SOL-001: normalizes to the lower triangle and combines duplicates deterministically", () => {
    const forward = entries([
      [0, 0, 4],
      [0, 1, 0.25],
      [1, 0, 0.75],
      [1, 1, 3],
      [2, 1, 1],
      [2, 2, 2],
    ]);
    const reverse = entries([
      [2, 2, 2],
      [2, 1, 1],
      [1, 1, 3],
      [1, 0, 0.75],
      [0, 1, 0.25],
      [0, 0, 4],
    ]);
    expect(forward).toEqual([
      { row: 0, column: 0, value: 4 },
      { row: 1, column: 0, value: 1 },
      { row: 1, column: 1, value: 3 },
      { row: 2, column: 1, value: 1 },
      { row: 2, column: 2, value: 2 },
    ]);
    expect(reverse).toEqual(forward);
  });

  it("FR-SOL-001: rejects invalid indices and nonfinite contributions", () => {
    const builder = new SymmetricCoordinateBuilder(2);
    expect(() => builder.add(-1, 0, 1)).toThrow(XFrameError);
    expect(() => builder.add(2, 0, 1)).toThrow(XFrameError);
    expect(() => builder.add(0, 0, Number.NaN)).toThrow(XFrameError);
  });

  it("FR-SOL-001: sparse matvec and quadratic form use symmetric contributions", () => {
    const builder = new SymmetricCoordinateBuilder(3);
    builder.add(0, 0, 4).add(1, 0, 1).add(1, 1, 3).add(2, 1, 1).add(2, 2, 2);
    const matrix = builder.finalize();
    expect(Array.from(matrix.multiply([1, 2, 3]))).toEqual([6, 10, 8]);
    expect(matrix.quadraticForm([1, 2, 3])).toBe(50);
  });
});
