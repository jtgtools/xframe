import { XFrameError } from "../errors/xframe-error.js";
import { finiteNumber } from "../geometry/finite.js";
import type { CompiledConstraints } from "./compile-constraints.js";

export interface ConstraintDofForce {
  readonly dof: number;
  readonly force: number;
}

export interface ConstraintForceResult {
  readonly sourceId: string;
  readonly multiplier: number;
  readonly dofForces: readonly ConstraintDofForce[];
}

export interface RecoveredConstrainedState {
  readonly fullDisplacements: Float64Array;
  readonly dofReactions: Float64Array;
  readonly constraintForces: readonly ConstraintForceResult[];
}

function solveDense(matrix: number[][], rhs: number[]): number[] {
  const size = rhs.length;
  for (let pivot = 0; pivot < size; pivot += 1) {
    let selected = pivot;
    for (let row = pivot + 1; row < size; row += 1) {
      if (Math.abs(matrix[row]![pivot]!) > Math.abs(matrix[selected]![pivot]!)) selected = row;
    }
    if (Math.abs(matrix[selected]![pivot]!) <= 256 * Number.EPSILON) {
      throw new XFrameError("CONSTRAINT_RANK_DEFICIENT", "Constraint force recovery encountered a rank-deficient block.", {
        kind: "analysis",
        stage: "constraint-force-recovery",
        detail: `pivot=${pivot}`,
        equation: pivot,
      });
    }
    [matrix[pivot], matrix[selected]] = [matrix[selected]!, matrix[pivot]!];
    [rhs[pivot], rhs[selected]] = [rhs[selected]!, rhs[pivot]!];
    const diagonal = matrix[pivot]![pivot]!;
    for (let column = pivot; column < size; column += 1) matrix[pivot]![column] = matrix[pivot]![column]! / diagonal;
    rhs[pivot] = rhs[pivot]! / diagonal;
    for (let row = 0; row < size; row += 1) {
      if (row === pivot) continue;
      const factor = matrix[row]![pivot]!;
      if (factor === 0) continue;
      for (let column = pivot; column < size; column += 1) matrix[row]![column] = matrix[row]![column]! - factor * matrix[pivot]![column]!;
      rhs[row] = rhs[row]! - factor * rhs[pivot]!;
    }
  }
  return rhs;
}

export function recoverConstrainedState(
  compiled: CompiledConstraints,
  reducedDisplacements: ArrayLike<number>,
  fullResidualInput: ArrayLike<number>,
): RecoveredConstrainedState {
  if (fullResidualInput.length !== compiled.fullDofCount) {
    throw new XFrameError("INPUT_INVALID", "Residual length must match full physical DOF count.", {
      kind: "input",
      path: "fullResidual",
      expected: `array-like of length ${compiled.fullDofCount}`,
      actual: `length ${fullResidualInput.length}`,
    });
  }
  const fullDisplacements = compiled.recover(reducedDisplacements);
  const dofReactions = new Float64Array(compiled.fullDofCount);
  for (let index = 0; index < dofReactions.length; index += 1) dofReactions[index] = finiteNumber(fullResidualInput[index], `fullResidual[${index}]`);
  if (compiled.equations.length === 0) return Object.freeze({ fullDisplacements, dofReactions, constraintForces: Object.freeze([]) });

  const rows = compiled.equations.map((equation) => new Map(equation.terms.map(({ dof, coefficient }) => [dof, coefficient])));
  const gram = rows.map((left) => rows.map((right) => {
    let value = 0;
    for (const [dof, coefficient] of left) value += coefficient * (right.get(dof) ?? 0);
    return value;
  }));
  const rhs = rows.map((row) => {
    let value = 0;
    for (const [dof, coefficient] of row) value -= coefficient * dofReactions[dof]!;
    return value;
  });
  const multipliers = solveDense(gram, rhs);
  const constraintForces = compiled.equations.map((equation, index): ConstraintForceResult => {
    const multiplier = finiteNumber(multipliers[index], `constraintMultiplier[${index}]`);
    return Object.freeze({
      sourceId: equation.sourceId,
      multiplier,
      dofForces: Object.freeze(equation.terms.map(({ dof, coefficient }) => Object.freeze({ dof, force: finiteNumber(coefficient * multiplier, "constraintForce") }))),
    });
  });
  return Object.freeze({ fullDisplacements, dofReactions, constraintForces: Object.freeze(constraintForces) });
}
