import { XFrameError } from "../errors/xframe-error.js";
import { estimateSkylineMemory } from "./memory-estimate.js";
import type { MatrixOrdering } from "./reverse-cuthill-mckee.js";
import type { SymmetricCoordinateMatrix } from "./symmetric-coordinate-matrix.js";

function validateOrdering(ordering: MatrixOrdering, size: number): void {
  if (ordering.permutation.length !== size || ordering.inversePermutation.length !== size) {
    throw new XFrameError("INPUT_INVALID", "Ordering size must match matrix size.", {
      kind: "input",
      path: "ordering",
      expected: `permutations of length ${size}`,
      actual: `${ordering.permutation.length}/${ordering.inversePermutation.length}`,
    });
  }
  for (let index = 0; index < size; index += 1) {
    if (ordering.inversePermutation[ordering.permutation[index]!] !== index) {
      throw new XFrameError("INPUT_INVALID", "Ordering permutations are inconsistent.", {
        kind: "input",
        path: `ordering.permutation[${index}]`,
        expected: "mutually inverse zero-based permutations",
        actual: String(ordering.permutation[index]),
      });
    }
  }
}

export class SkylineProfile {
  public readonly size: number;
  public readonly firstColumns: readonly number[];
  public readonly rowStarts: readonly number[];
  public readonly storageCount: number;
  public readonly ordering: MatrixOrdering;
  readonly #values: Float64Array;

  public constructor(
    firstColumns: readonly number[],
    rowStarts: readonly number[],
    values: Float64Array,
    ordering: MatrixOrdering,
  ) {
    this.size = firstColumns.length;
    this.firstColumns = Object.freeze([...firstColumns]);
    this.rowStarts = Object.freeze([...rowStarts]);
    this.storageCount = values.length;
    this.ordering = ordering;
    this.#values = values.slice();
    Object.freeze(this);
  }

  public values(): Float64Array {
    return this.#values.slice();
  }
}

export function createSkylineProfile(
  matrix: SymmetricCoordinateMatrix,
  ordering: MatrixOrdering,
  memoryLimitBytes?: number,
): SkylineProfile {
  validateOrdering(ordering, matrix.size);
  const firstColumns = Array.from({ length: matrix.size }, (_, row) => row);
  for (const { row: oldRow, column: oldColumn } of matrix.entries()) {
    const mappedRow = ordering.inversePermutation[oldRow]!;
    const mappedColumn = ordering.inversePermutation[oldColumn]!;
    const row = Math.max(mappedRow, mappedColumn);
    const column = Math.min(mappedRow, mappedColumn);
    firstColumns[row] = Math.min(firstColumns[row]!, column);
  }

  const estimate = estimateSkylineMemory(firstColumns, memoryLimitBytes);
  const rowStarts = new Array<number>(matrix.size + 1).fill(0);
  for (let row = 0; row < matrix.size; row += 1) rowStarts[row + 1] = rowStarts[row]! + row - firstColumns[row]! + 1;
  const values = new Float64Array(estimate.storageCount);
  for (const { row: oldRow, column: oldColumn, value } of matrix.entries()) {
    const mappedRow = ordering.inversePermutation[oldRow]!;
    const mappedColumn = ordering.inversePermutation[oldColumn]!;
    const row = Math.max(mappedRow, mappedColumn);
    const column = Math.min(mappedRow, mappedColumn);
    const index = rowStarts[row]! + column - firstColumns[row]!;
    values[index] = values[index]! + value;
  }
  return new SkylineProfile(firstColumns, rowStarts, values, ordering);
}
