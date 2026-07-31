import { XFrameError } from "../../errors/xframe-error.js";
import { finiteNumber } from "../../geometry/finite.js";
import { computeGroundSpringStiffness } from "./ground-spring.js";

export function computeTwoNodeSpringStiffness(
  stiffness: ArrayLike<number>,
  localToGlobalBasis?: ArrayLike<number>,
): Float64Array {
  const block = computeGroundSpringStiffness(stiffness, localToGlobalBasis);
  const result = new Float64Array(144);
  for (let row = 0; row < 6; row += 1) {
    for (let column = 0; column < 6; column += 1) {
      const value = block[row * 6 + column]!;
      result[row * 12 + column] = value;
      result[row * 12 + column + 6] = -value;
      result[(row + 6) * 12 + column] = -value;
      result[(row + 6) * 12 + column + 6] = value;
    }
  }
  return result;
}

export function recoverTwoNodeSpringForces(
  stiffness: ArrayLike<number>,
  displacements: ArrayLike<number>,
  localToGlobalBasis?: ArrayLike<number>,
): Float64Array {
  if (displacements.length !== 12) {
    throw new XFrameError("INPUT_INVALID", "Two-node spring recovery requires twelve displacements.", {
      kind: "input",
      path: "spring.displacements",
      expected: "array-like of length 12",
      actual: `length ${displacements.length}`,
    });
  }
  const matrix = computeTwoNodeSpringStiffness(stiffness, localToGlobalBasis);
  const result = new Float64Array(12);
  for (let row = 0; row < 12; row += 1) {
    let value = 0;
    for (let column = 0; column < 12; column += 1) value += matrix[row * 12 + column]! * finiteNumber(displacements[column], `spring.displacements[${column}]`);
    result[row] = finiteNumber(value, `spring.force[${row}]`);
  }
  return result;
}
