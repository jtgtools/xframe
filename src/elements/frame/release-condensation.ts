import { XFrameError } from "../../errors/xframe-error.js";
import { finiteNumber } from "../../geometry/finite.js";
import type { FrameReleaseInput } from "../../model/domain-records.js";
import { DOF_NAMES } from "../../model/dof-key.js";

export interface CondensedFrameKernel {
  readonly stiffness: Float64Array;
  readonly load: Float64Array;
  readonly originalStiffness: Float64Array;
  readonly originalLoad: Float64Array;
  readonly releaseMask: number;
  readonly retainedDofs: readonly number[];
  readonly releasedDofs: readonly number[];
  recoverLocalDisplacements(nodalDisplacements: ArrayLike<number>): Float64Array;
}

function checkedMatrix(values: ArrayLike<number>, length: number, path: string): Float64Array {
  if (values.length !== length) {
    throw new XFrameError("INPUT_INVALID", "Frame kernel array has an invalid length.", {
      kind: "input",
      path,
      expected: `array-like of length ${length}`,
      actual: `length ${values.length}`,
    });
  }
  const result = new Float64Array(length);
  for (let index = 0; index < length; index += 1)
    result[index] = finiteNumber(values[index], `${path}[${index}]`);
  return result;
}

function factorPositiveDefinite(matrix: number[][]): number[][] {
  const size = matrix.length;
  const factor = Array.from({ length: size }, () => Array.from({ length: size }, () => 0));
  const scale = Math.max(1, ...matrix.map((row, index) => Math.abs(row[index]!)));
  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column <= row; column += 1) {
      let value = matrix[row]![column]!;
      for (let inner = 0; inner < column; inner += 1)
        value -= factor[row]![inner]! * factor[column]![inner]!;
      if (row === column) {
        if (!Number.isFinite(value) || value <= 256 * Number.EPSILON * scale) {
          throw new XFrameError(
            "ELEMENT_LOCAL_MECHANISM",
            "Released frame DOFs form a singular local block.",
            {
              kind: "analysis",
              stage: "frame-release-condensation",
              detail: `released pivot ${row}=${String(value)}`,
              equation: row,
            },
          );
        }
        factor[row]![column] = Math.sqrt(value);
      } else factor[row]![column] = value / factor[column]![column]!;
    }
  }
  return factor;
}

function solveFactor(factor: number[][], rhs: readonly number[]): number[] {
  const size = rhs.length;
  const value = [...rhs];
  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column < row; column += 1)
      value[row] = value[row]! - factor[row]![column]! * value[column]!;
    value[row] = value[row]! / factor[row]![row]!;
  }
  for (let row = size - 1; row >= 0; row -= 1) {
    value[row] = value[row]! / factor[row]![row]!;
    for (let column = 0; column < row; column += 1)
      value[column] = value[column]! - factor[row]![column]! * value[row]!;
  }
  return value;
}

export function frameReleaseMask(releases: FrameReleaseInput | undefined): number {
  if (releases === undefined) return 0;
  let mask = 0;
  for (const [offset, values] of [
    [0, releases.start],
    [6, releases.end],
  ] as const) {
    for (const dof of values ?? []) mask |= 1 << (offset + DOF_NAMES.indexOf(dof));
  }
  return mask;
}

export function condenseFrameEndReleases(
  stiffnessInput: ArrayLike<number>,
  loadInput: ArrayLike<number>,
  releaseMask: number,
): CondensedFrameKernel {
  if (!Number.isSafeInteger(releaseMask) || releaseMask < 0 || releaseMask > 0xfff) {
    throw new XFrameError("INPUT_INVALID", "Frame release mask must be a 12-bit integer.", {
      kind: "input",
      path: "frame.releaseMask",
      expected: "integer in [0,4095]",
      actual: String(releaseMask),
    });
  }
  const originalStiffness = checkedMatrix(stiffnessInput, 144, "frame.stiffness");
  const originalLoad = checkedMatrix(loadInput, 12, "frame.load");
  const releasedDofs = Array.from({ length: 12 }, (_, index) => index).filter(
    (index) => (releaseMask & (1 << index)) !== 0,
  );
  const retainedDofs = Array.from({ length: 12 }, (_, index) => index).filter(
    (index) => (releaseMask & (1 << index)) === 0,
  );
  if (releasedDofs.length === 0) {
    return Object.freeze({
      stiffness: originalStiffness.slice(),
      load: originalLoad.slice(),
      originalStiffness,
      originalLoad,
      releaseMask,
      retainedDofs: Object.freeze(retainedDofs),
      releasedDofs: Object.freeze(releasedDofs),
      recoverLocalDisplacements(values: ArrayLike<number>): Float64Array {
        return checkedMatrix(values, 12, "frame.localDisplacements");
      },
    });
  }
  const kqq = releasedDofs.map((row) =>
    releasedDofs.map((column) => originalStiffness[row * 12 + column]!),
  );
  const factor = factorPositiveDefinite(kqq);
  const inverseKqr = retainedDofs.map((retained) =>
    solveFactor(
      factor,
      releasedDofs.map((released) => originalStiffness[released * 12 + retained]!),
    ),
  );
  const loadOffset = solveFactor(
    factor,
    releasedDofs.map((released) => originalLoad[released]!),
  );
  const stiffness = new Float64Array(144);
  const load = new Float64Array(12);
  for (let rowIndex = 0; rowIndex < retainedDofs.length; rowIndex += 1) {
    const row = retainedDofs[rowIndex]!;
    let loadValue = originalLoad[row]!;
    for (let inner = 0; inner < releasedDofs.length; inner += 1)
      loadValue -= originalStiffness[row * 12 + releasedDofs[inner]!]! * loadOffset[inner]!;
    load[row] = finiteNumber(loadValue, `condensedLoad[${row}]`);
    for (let columnIndex = 0; columnIndex < retainedDofs.length; columnIndex += 1) {
      const column = retainedDofs[columnIndex]!;
      let value = originalStiffness[row * 12 + column]!;
      const solvedColumn = inverseKqr[columnIndex]!;
      for (let inner = 0; inner < releasedDofs.length; inner += 1)
        value -= originalStiffness[row * 12 + releasedDofs[inner]!]! * solvedColumn[inner]!;
      stiffness[row * 12 + column] = finiteNumber(value, `condensedStiffness[${row},${column}]`);
    }
  }
  return Object.freeze({
    stiffness,
    load,
    originalStiffness,
    originalLoad,
    releaseMask,
    retainedDofs: Object.freeze(retainedDofs),
    releasedDofs: Object.freeze(releasedDofs),
    recoverLocalDisplacements(values: ArrayLike<number>): Float64Array {
      const result = checkedMatrix(values, 12, "frame.localDisplacements");
      for (let releasedIndex = 0; releasedIndex < releasedDofs.length; releasedIndex += 1) {
        let value = loadOffset[releasedIndex]!;
        for (let retainedIndex = 0; retainedIndex < retainedDofs.length; retainedIndex += 1)
          value -=
            inverseKqr[retainedIndex]![releasedIndex]! * result[retainedDofs[retainedIndex]!]!;
        result[releasedDofs[releasedIndex]!] = finiteNumber(
          value,
          `releasedDisplacement[${releasedIndex}]`,
        );
      }
      return result;
    },
  });
}
