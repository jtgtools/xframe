import { describe, expect, it } from "vitest";
import { buildAdjacency, matrixBandwidth } from "../../src/linalg/adjacency.js";
import { reverseCuthillMcKee } from "../../src/linalg/reverse-cuthill-mckee.js";
import { SymmetricCoordinateBuilder } from "../../src/linalg/symmetric-coordinate-matrix.js";

function graphMatrix(size: number, edges: readonly [number, number][]) {
  const builder = new SymmetricCoordinateBuilder(size);
  for (let i = 0; i < size; i += 1) builder.add(i, i, 1);
  for (const [a, b] of edges) builder.add(a, b, -0.1);
  return builder.finalize();
}

describe("reverse Cuthill-McKee", () => {
  it("FR-SOL-002: uses deterministic degree/index tie breaking", () => {
    const matrix = graphMatrix(4, [
      [0, 3],
      [3, 1],
      [1, 2],
    ]);
    const adjacency = buildAdjacency(matrix);
    const ordering = reverseCuthillMcKee(adjacency);
    expect(ordering.permutation).toEqual([2, 1, 3, 0]);
    expect(ordering.inversePermutation).toEqual([3, 1, 0, 2]);
    expect(matrixBandwidth(matrix, ordering.inversePermutation)).toBeLessThan(
      matrixBandwidth(matrix),
    );
  });

  it("FR-SOL-002: handles isolated and disconnected components deterministically", () => {
    const matrix = graphMatrix(6, [
      [0, 1],
      [1, 2],
      [4, 5],
    ]);
    const first = reverseCuthillMcKee(buildAdjacency(matrix));
    const second = reverseCuthillMcKee(buildAdjacency(matrix));
    expect(first.permutation).toEqual(second.permutation);
    expect([...first.permutation].toSorted((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5]);
  });
});
