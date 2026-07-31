import { XFrameError } from "../errors/xframe-error.js";
import type { CanonicalAffineConstraint } from "./affine-equation.js";

const TOLERANCE = 256 * Number.EPSILON;

export interface ReducedConstraintRow {
  readonly sourceId: string;
  readonly coefficients: ReadonlyMap<number, number>;
  readonly rightHandSide: number;
  readonly pivotDof: number;
}

export interface ConstraintRankAnalysis {
  readonly rank: number;
  readonly rows: readonly ReducedConstraintRow[];
  readonly redundantSourceIds: readonly string[];
}

function removeScaledZeros(row: Map<number, number>, scale: number): void {
  for (const [dof, value] of row) if (Math.abs(value) <= TOLERANCE * scale) row.delete(dof);
}

export function analyzeConstraintRank(
  equationsInput: readonly CanonicalAffineConstraint[],
): ConstraintRankAnalysis {
  const equations = [...equationsInput].sort((left, right) => left.sourceId.localeCompare(right.sourceId));
  const rows: { sourceId: string; coefficients: Map<number, number>; rightHandSide: number; pivotDof: number }[] = [];
  const redundantSourceIds: string[] = [];

  for (const equation of equations) {
    const coefficients = new Map(equation.terms.map(({ dof, coefficient }) => [dof, coefficient]));
    let rhs = equation.rightHandSide;
    for (const pivot of rows) {
      const factor = coefficients.get(pivot.pivotDof) ?? 0;
      if (factor === 0) continue;
      coefficients.delete(pivot.pivotDof);
      for (const [dof, value] of pivot.coefficients) {
        if (dof === pivot.pivotDof) continue;
        coefficients.set(dof, (coefficients.get(dof) ?? 0) - factor * value);
      }
      rhs -= factor * pivot.rightHandSide;
      const scale = Math.max(1, ...[...coefficients.values()].map(Math.abs), Math.abs(rhs));
      removeScaledZeros(coefficients, scale);
      if (Math.abs(rhs) <= TOLERANCE * scale) rhs = 0;
    }
    if (coefficients.size === 0) {
      if (rhs !== 0) {
        throw new XFrameError("CONSTRAINT_CONTRADICTION", "Constraint system contains conflicting dependent equations.", {
          kind: "analysis",
          stage: "constraint-rank",
          detail: `source=${equation.sourceId}, reducedRhs=${String(rhs)}`,
          entityId: equation.sourceId,
        });
      }
      redundantSourceIds.push(equation.sourceId);
      continue;
    }
    const pivotDof = Math.min(...coefficients.keys());
    const pivot = coefficients.get(pivotDof)!;
    for (const [dof, value] of coefficients) coefficients.set(dof, value / pivot);
    rhs /= pivot;

    for (const previous of rows) {
      const factor = previous.coefficients.get(pivotDof) ?? 0;
      if (factor === 0) continue;
      previous.coefficients.delete(pivotDof);
      for (const [dof, value] of coefficients) {
        if (dof === pivotDof) continue;
        previous.coefficients.set(dof, (previous.coefficients.get(dof) ?? 0) - factor * value);
      }
      previous.rightHandSide -= factor * rhs;
      removeScaledZeros(previous.coefficients, Math.max(1, ...[...previous.coefficients.values()].map(Math.abs), Math.abs(previous.rightHandSide)));
    }
    rows.push({ sourceId: equation.sourceId, coefficients, rightHandSide: rhs, pivotDof });
    rows.sort((left, right) => left.pivotDof - right.pivotDof);
  }

  return Object.freeze({
    rank: rows.length,
    rows: Object.freeze(
      rows.map((row) =>
        Object.freeze({
          sourceId: row.sourceId,
          coefficients: new Map([...row.coefficients].sort(([left], [right]) => left - right)),
          rightHandSide: row.rightHandSide,
          pivotDof: row.pivotDof,
        }),
      ),
    ),
    redundantSourceIds: Object.freeze(redundantSourceIds),
  });
}
