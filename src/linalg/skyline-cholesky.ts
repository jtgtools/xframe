import { XFrameError } from "../errors/xframe-error.js";
import { finiteNumber } from "../geometry/finite.js";
import type { SkylineProfile } from "./skyline-profile.js";

export const PIVOT_RELATIVE_TOLERANCE = 128 * Number.EPSILON;

export interface CholeskyDiagnostics {
  readonly minimumNormalizedPivot: number;
  readonly minimumPivotEquation: number;
}

function checkedRightHandSide(values: ArrayLike<number>, size: number): Float64Array {
  if (values.length !== size) {
    throw new XFrameError("INPUT_INVALID", "Right-hand side length must match matrix size.", {
      kind: "input",
      path: "rhs",
      expected: `array-like of length ${size}`,
      actual: `length ${values.length}`,
    });
  }
  const result = new Float64Array(size);
  for (let index = 0; index < size; index += 1) result[index] = finiteNumber(values[index], `rhs[${index}]`);
  return result;
}

export class SkylineCholeskyFactor {
  public readonly size: number;
  public readonly diagnostics: CholeskyDiagnostics;
  readonly #firstColumns: readonly number[];
  readonly #rowStarts: readonly number[];
  readonly #factor: Float64Array;
  readonly #permutation: readonly number[];

  public constructor(profile: SkylineProfile, factor: Float64Array, diagnostics: CholeskyDiagnostics) {
    this.size = profile.size;
    this.diagnostics = Object.freeze({ ...diagnostics });
    this.#firstColumns = profile.firstColumns;
    this.#rowStarts = profile.rowStarts;
    this.#factor = factor.slice();
    this.#permutation = profile.ordering.permutation;
    Object.freeze(this);
  }

  public solve(rhs: ArrayLike<number>): Float64Array {
    const original = checkedRightHandSide(rhs, this.size);
    const solution = new Float64Array(this.size);
    for (let row = 0; row < this.size; row += 1) solution[row] = original[this.#permutation[row]!]!;

    for (let row = 0; row < this.size; row += 1) {
      const start = this.#rowStarts[row]!;
      const first = this.#firstColumns[row]!;
      for (let column = first; column < row; column += 1) solution[row] = solution[row]! - this.#factor[start + column - first]! * solution[column]!;
      solution[row] = solution[row]! / this.#factor[start + row - first]!;
    }

    for (let row = this.size - 1; row >= 0; row -= 1) {
      const start = this.#rowStarts[row]!;
      const first = this.#firstColumns[row]!;
      solution[row] = solution[row]! / this.#factor[start + row - first]!;
      for (let column = first; column < row; column += 1) solution[column] = solution[column]! - this.#factor[start + column - first]! * solution[row]!;
    }

    const unpermuted = new Float64Array(this.size);
    for (let row = 0; row < this.size; row += 1) unpermuted[this.#permutation[row]!] = finiteNumber(solution[row], `solution[${row}]`);
    return unpermuted;
  }

  public solveMany(rightHandSides: readonly ArrayLike<number>[]): readonly Float64Array[] {
    return Object.freeze(rightHandSides.map((rhs) => this.solve(rhs)));
  }
}

export function factorSkylineCholesky(profile: SkylineProfile): SkylineCholeskyFactor {
  const factor = profile.values();
  let minimumNormalizedPivot = Number.POSITIVE_INFINITY;
  let minimumPivotEquation = -1;

  for (let row = 0; row < profile.size; row += 1) {
    const rowStart = profile.rowStarts[row]!;
    const rowFirst = profile.firstColumns[row]!;
    const diagonalIndex = rowStart + row - rowFirst;
    const diagonalScale = Math.abs(factor[diagonalIndex]!);

    for (let column = rowFirst; column < row; column += 1) {
      const columnStart = profile.rowStarts[column]!;
      const columnFirst = profile.firstColumns[column]!;
      let sum = factor[rowStart + column - rowFirst]!;
      const sharedFirst = Math.max(rowFirst, columnFirst);
      for (let inner = sharedFirst; inner < column; inner += 1) {
        sum -= factor[rowStart + inner - rowFirst]! * factor[columnStart + inner - columnFirst]!;
      }
      factor[rowStart + column - rowFirst] = finiteNumber(sum / factor[columnStart + column - columnFirst]!, `factor[${row},${column}]`);
    }

    let pivot = factor[diagonalIndex]!;
    for (let column = rowFirst; column < row; column += 1) {
      const value = factor[rowStart + column - rowFirst]!;
      pivot -= value * value;
    }
    const normalizedPivot = diagonalScale === 0 ? 0 : pivot / diagonalScale;
    if (!Number.isFinite(pivot) || pivot <= 0 || normalizedPivot <= PIVOT_RELATIVE_TOLERANCE) {
      throw new XFrameError("FACTORIZATION_FAILED", "Skyline Cholesky encountered a non-positive or near-singular pivot.", {
        kind: "analysis",
        stage: "skyline-cholesky",
        detail: `pivot=${String(pivot)}, normalizedPivot=${String(normalizedPivot)}, threshold=${PIVOT_RELATIVE_TOLERANCE}`,
        equation: profile.ordering.permutation[row]!,
      });
    }
    if (normalizedPivot < minimumNormalizedPivot) {
      minimumNormalizedPivot = normalizedPivot;
      minimumPivotEquation = profile.ordering.permutation[row]!;
    }
    factor[diagonalIndex] = Math.sqrt(pivot);
  }

  return new SkylineCholeskyFactor(profile, factor, {
    minimumNormalizedPivot: profile.size === 0 ? 1 : minimumNormalizedPivot,
    minimumPivotEquation,
  });
}
