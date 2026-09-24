import { XFrameError } from "../errors/xframe-error.js";
import { finiteNumber } from "../geometry/finite.js";

export interface SymmetricCoordinateEntry {
  readonly row: number;
  readonly column: number;
  readonly value: number;
}

function checkedSize(size: number): number {
  if (!Number.isSafeInteger(size) || size < 0) {
    throw new XFrameError("INPUT_INVALID", "Matrix size must be a nonnegative safe integer.", {
      kind: "input",
      path: "matrix.size",
      expected: "nonnegative safe integer",
      actual: String(size),
    });
  }
  return size;
}

function checkedIndex(index: number, size: number, path: string): number {
  if (!Number.isSafeInteger(index) || index < 0 || index >= size) {
    throw new XFrameError("INPUT_INVALID", `Matrix index at ${path} is outside [0, ${size}).`, {
      kind: "input",
      path,
      expected: `integer in [0, ${size})`,
      actual: String(index),
    });
  }
  return index;
}

function checkedVector(values: ArrayLike<number>, size: number, path: string): Float64Array {
  if (values.length !== size) {
    throw new XFrameError("INPUT_INVALID", `Expected ${size} entries at ${path}.`, {
      kind: "input",
      path,
      expected: `array-like of length ${size}`,
      actual: `length ${values.length}`,
    });
  }
  const result = new Float64Array(size);
  for (let index = 0; index < size; index += 1)
    result[index] = finiteNumber(values[index], `${path}[${index}]`);
  return result;
}

function deterministicSum(values: readonly number[]): number {
  const ordered = [...values].toSorted(
    (left, right) => Math.abs(left) - Math.abs(right) || left - right,
  );
  let sum = 0;
  let correction = 0;
  for (const value of ordered) {
    const next = sum + value;
    correction += Math.abs(sum) >= Math.abs(value) ? sum - next + value : value - next + sum;
    sum = next;
  }
  return finiteNumber(sum + correction, "matrix.contributionSum");
}

export class SymmetricCoordinateMatrix {
  public readonly size: number;
  readonly #entries: readonly SymmetricCoordinateEntry[];

  public constructor(size: number, entries: readonly SymmetricCoordinateEntry[]) {
    this.size = checkedSize(size);
    this.#entries = Object.freeze(entries.map((entry) => Object.freeze({ ...entry })));
    Object.freeze(this);
  }

  public entries(): IterableIterator<SymmetricCoordinateEntry> {
    return this.#entries[Symbol.iterator]();
  }

  public multiply(values: ArrayLike<number>): Float64Array {
    const vector = checkedVector(values, this.size, "vector");
    const result = new Float64Array(this.size);
    for (const { row, column, value } of this.#entries) {
      const forward = finiteNumber(value * vector[column]!, `multiply[${row},${column}]`);
      result[row] = finiteNumber(result[row]! + forward, `product[${row}]`);
      if (row !== column) {
        const symmetric = finiteNumber(value * vector[row]!, `multiply[${column},${row}]`);
        result[column] = finiteNumber(result[column]! + symmetric, `product[${column}]`);
      }
    }
    for (let index = 0; index < result.length; index += 1)
      finiteNumber(result[index], `product[${index}]`);
    return result;
  }

  public quadraticForm(values: ArrayLike<number>): number {
    const vector = checkedVector(values, this.size, "vector");
    let result = 0;
    for (const { row, column, value } of this.#entries) {
      const contribution = finiteNumber(
        value * vector[row]! * vector[column]!,
        `quadraticForm[${row},${column}]`,
      );
      result = finiteNumber(
        result + (row === column ? contribution : 2 * contribution),
        "quadraticForm",
      );
    }
    return finiteNumber(result, "quadraticForm");
  }
}

export class SymmetricCoordinateBuilder {
  public readonly size: number;
  readonly #contributions = new Map<string, number[]>();

  public constructor(size: number) {
    this.size = checkedSize(size);
  }

  public add(row: number, column: number, value: number): this {
    const checkedRow = checkedIndex(row, this.size, "matrix.row");
    const checkedColumn = checkedIndex(column, this.size, "matrix.column");
    const checkedValue = finiteNumber(value, "matrix.value");
    const lowerRow = Math.max(checkedRow, checkedColumn);
    const lowerColumn = Math.min(checkedRow, checkedColumn);
    const key = `${lowerRow}:${lowerColumn}`;
    const contributions = this.#contributions.get(key);
    if (contributions === undefined) this.#contributions.set(key, [checkedValue]);
    else contributions.push(checkedValue);
    return this;
  }

  public finalize(): SymmetricCoordinateMatrix {
    const entries: SymmetricCoordinateEntry[] = [];
    for (const [key, values] of this.#contributions) {
      const separator = key.indexOf(":");
      const row = Number(key.slice(0, separator));
      const column = Number(key.slice(separator + 1));
      const value = deterministicSum([...values]);
      if (value !== 0) entries.push({ row, column, value });
    }
    entries.sort((left, right) => left.row - right.row || left.column - right.column);
    return new SymmetricCoordinateMatrix(this.size, entries);
  }
}
