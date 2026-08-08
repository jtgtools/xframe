import { XFrameError } from "../errors/xframe-error.js";
import { finiteNumber } from "../geometry/finite.js";
import type { SymmetricCoordinateMatrix } from "./symmetric-coordinate-matrix.js";

export interface ResidualDiagnostics {
  readonly maximumAbsoluteResidual: number;
  readonly normalizedResidual: number;
  readonly quadraticEnergy: number;
}

export function computeResidualDiagnostics(
  matrix: SymmetricCoordinateMatrix,
  solution: ArrayLike<number>,
  rhs: ArrayLike<number>,
): ResidualDiagnostics {
  if (rhs.length !== matrix.size) {
    throw new XFrameError("INPUT_INVALID", "Right-hand side length must match matrix size.", {
      kind: "input",
      path: "rhs",
      expected: `array-like of length ${matrix.size}`,
      actual: `length ${rhs.length}`,
    });
  }
  const product = matrix.multiply(solution);
  let maximumAbsoluteResidual = 0;
  let loadScale = 0;
  for (let index = 0; index < matrix.size; index += 1) {
    const load = finiteNumber(rhs[index], `rhs[${index}]`);
    maximumAbsoluteResidual = Math.max(maximumAbsoluteResidual, Math.abs(product[index]! - load));
    loadScale = Math.max(loadScale, Math.abs(load));
  }
  const normalizedResidual =
    loadScale === 0
      ? maximumAbsoluteResidual === 0
        ? 0
        : Number.MAX_VALUE
      : maximumAbsoluteResidual / loadScale;
  return Object.freeze({
    maximumAbsoluteResidual,
    normalizedResidual,
    quadraticEnergy: matrix.quadraticForm(solution),
  });
}
