import { XFrameError } from "../errors/xframe-error.js";
import type { SymmetricCoordinateMatrix } from "./symmetric-coordinate-matrix.js";

export type Adjacency = readonly (readonly number[])[];

export function buildAdjacency(matrix: SymmetricCoordinateMatrix): Adjacency {
  const neighbors = Array.from({ length: matrix.size }, () => new Set<number>());
  for (const { row, column } of matrix.entries()) {
    if (row === column) continue;
    neighbors[row]!.add(column);
    neighbors[column]!.add(row);
  }
  return Object.freeze(
    neighbors.map((entries) => Object.freeze([...entries].toSorted((left, right) => left - right))),
  );
}

function checkedInversePermutation(
  size: number,
  inversePermutation?: readonly number[],
): readonly number[] {
  if (inversePermutation === undefined)
    return Object.freeze(Array.from({ length: size }, (_, index) => index));
  if (inversePermutation.length !== size) {
    throw new XFrameError("INPUT_INVALID", "Permutation length must match matrix size.", {
      kind: "input",
      path: "inversePermutation",
      expected: `permutation of length ${size}`,
      actual: `length ${inversePermutation.length}`,
    });
  }
  const seen = new Uint8Array(size);
  for (let oldIndex = 0; oldIndex < size; oldIndex += 1) {
    const next = inversePermutation[oldIndex];
    if (!Number.isSafeInteger(next) || next! < 0 || next! >= size || seen[next!] !== 0) {
      throw new XFrameError("INPUT_INVALID", "Expected a zero-based inverse permutation.", {
        kind: "input",
        path: `inversePermutation[${oldIndex}]`,
        expected: `unique integer in [0, ${size})`,
        actual: String(next),
      });
    }
    seen[next!] = 1;
  }
  return inversePermutation;
}

export function matrixBandwidth(
  matrix: SymmetricCoordinateMatrix,
  inversePermutation?: readonly number[],
): number {
  const inverse = checkedInversePermutation(matrix.size, inversePermutation);
  let bandwidth = 0;
  for (const { row, column } of matrix.entries()) {
    bandwidth = Math.max(bandwidth, Math.abs(inverse[row]! - inverse[column]!));
  }
  return bandwidth;
}
