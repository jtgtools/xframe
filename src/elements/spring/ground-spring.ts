import { XFrameError } from "../../errors/xframe-error.js";
import { createMatrix3, determinantMatrix3, multiplyMatrix3, transposeMatrix3 } from "../../geometry/matrix-3.js";
import { finiteNumber } from "../../geometry/finite.js";

const IDENTITY = [1, 0, 0, 0, 1, 0, 0, 0, 1] as const;

function checkedComponents(values: ArrayLike<number>): Float64Array {
  if (values.length !== 6) {
    throw new XFrameError("INPUT_INVALID", "Spring stiffness requires six components.", {
      kind: "input",
      path: "spring.stiffness",
      expected: "array-like of length 6",
      actual: `length ${values.length}`,
    });
  }
  const result = new Float64Array(6);
  for (let index = 0; index < 6; index += 1) {
    const value = finiteNumber(values[index], `spring.stiffness[${index}]`);
    if (value < 0) {
      throw new XFrameError("INPUT_INVALID", "Spring stiffness cannot be negative.", {
        kind: "input",
        path: `spring.stiffness[${index}]`,
        expected: "nonnegative finite number",
        actual: String(value),
      });
    }
    result[index] = value;
  }
  return result;
}

function checkedBasis(values: ArrayLike<number>): Float64Array {
  const basis = createMatrix3(values, "spring.basis");
  const product = multiplyMatrix3(transposeMatrix3(basis), basis);
  for (let row = 0; row < 3; row += 1) {
    for (let column = 0; column < 3; column += 1) {
      const expected = row === column ? 1 : 0;
      if (Math.abs(product[row * 3 + column]! - expected) > 1e-12) {
        throw new XFrameError("GEOMETRY_INVALID", "Spring basis must be orthonormal.", {
          kind: "geometry",
          path: "spring.basis",
          reason: "basis is not orthonormal",
        });
      }
    }
  }
  if (Math.abs(determinantMatrix3(basis) - 1) > 1e-12) {
    throw new XFrameError("GEOMETRY_INVALID", "Spring basis must be right-handed.", {
      kind: "geometry",
      path: "spring.basis",
      reason: "basis determinant is not +1",
    });
  }
  return basis;
}

function rotatedBlock(components: Float64Array, start: number, basis: Float64Array): Float64Array {
  const local = new Float64Array(9);
  for (let index = 0; index < 3; index += 1) local[index * 3 + index] = components[start + index]!;
  return multiplyMatrix3(multiplyMatrix3(basis, local), transposeMatrix3(basis));
}

export function computeGroundSpringStiffness(
  stiffnessInput: ArrayLike<number>,
  localToGlobalBasis: ArrayLike<number> = IDENTITY,
): Float64Array {
  const components = checkedComponents(stiffnessInput);
  const basis = checkedBasis(localToGlobalBasis);
  const translation = rotatedBlock(components, 0, basis);
  const rotation = rotatedBlock(components, 3, basis);
  const result = new Float64Array(36);
  for (let row = 0; row < 3; row += 1) {
    for (let column = 0; column < 3; column += 1) {
      result[row * 6 + column] = finiteNumber(translation[row * 3 + column], `spring.translation[${row},${column}]`);
      result[(row + 3) * 6 + column + 3] = finiteNumber(rotation[row * 3 + column], `spring.rotation[${row},${column}]`);
    }
  }
  return result;
}
