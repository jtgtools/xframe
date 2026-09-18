import { expect, it } from "vitest";
import { factorSkylineCholesky } from "../../src/linalg/skyline-cholesky.js";
import { createSkylineProfile } from "../../src/linalg/skyline-profile.js";
import { computeResidualDiagnostics } from "../../src/linalg/residual.js";
import { reverseCuthillMcKee } from "../../src/linalg/reverse-cuthill-mckee.js";
import { buildAdjacency } from "../../src/linalg/adjacency.js";
import { SymmetricCoordinateBuilder } from "../../src/linalg/symmetric-coordinate-matrix.js";

function generator(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

it("seed 24701 solves 40 sparse diagonally dominant SPD systems", () => {
  const random = generator(24701);
  let maximumError = 0;
  let maximumResidual = 0;
  for (let sample = 0; sample < 40; sample += 1) {
    const size = 4 + Math.floor(random() * 9);
    const builder = new SymmetricCoordinateBuilder(size);
    const diagonal = new Float64Array(size).fill(1);
    for (let row = 1; row < size; row += 1) {
      for (let column = 0; column < row; column += 1) {
        if (random() < 0.2) {
          const value = (random() - 0.5) * 0.4;
          builder.add(row, column, value);
          diagonal[row]! += Math.abs(value);
          diagonal[column]! += Math.abs(value);
        }
      }
    }
    for (let index = 0; index < size; index += 1) builder.add(index, index, diagonal[index]!);
    const matrix = builder.finalize();
    const expected = Float64Array.from({ length: size }, () => random() - 0.5);
    const rhs = matrix.multiply(expected);
    const ordering = reverseCuthillMcKee(buildAdjacency(matrix));
    const solution = factorSkylineCholesky(createSkylineProfile(matrix, ordering)).solve(rhs);
    for (let index = 0; index < size; index += 1)
      maximumError = Math.max(maximumError, Math.abs(solution[index]! - expected[index]!));
    maximumResidual = Math.max(
      maximumResidual,
      computeResidualDiagnostics(matrix, solution, rhs).normalizedResidual,
    );
  }
  expect(maximumError).toBeLessThan(2e-13);
  expect(maximumResidual).toBeLessThan(2e-13);
});
