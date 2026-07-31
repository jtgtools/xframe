import { finiteNumber } from "../../geometry/finite.js";
import type { CondensedFrameKernel } from "./release-condensation.js";

export function recoverFrameEndForces(
  kernel: CondensedFrameKernel,
  localNodalDisplacements: ArrayLike<number>,
): Float64Array {
  const displacements = kernel.recoverLocalDisplacements(localNodalDisplacements);
  const forces = new Float64Array(12);
  for (let row = 0; row < 12; row += 1) {
    let value = -kernel.originalLoad[row]!;
    for (let column = 0; column < 12; column += 1) value += kernel.originalStiffness[row * 12 + column]! * displacements[column]!;
    forces[row] = finiteNumber(value, `frameEndForce[${row}]`);
  }
  return forces;
}
