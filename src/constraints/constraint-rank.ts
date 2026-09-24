import { XFrameError } from "../errors/xframe-error.js";
import { finiteNumber } from "../geometry/finite.js";
import { compareIdentifiers } from "../model/identifier.js";
import type { CanonicalAffineConstraint } from "./affine-equation.js";
import { WorkingScalar } from "./constraint-numerics.js";

// Rank pruning bound: 256 ulps (~5.7e-14) covers Neumaier-compensated
// elimination rounding over the bounded constraint widths used here.
// Residuals at or below the propagated bound are treated as exact zeros;
// see combinedBound/dividedBound below for the per-step error propagation.
export const TOLERANCE = 256 * Number.EPSILON;

const ROUNDING_EPSILON = Number.EPSILON;

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

interface ActiveRow {
  readonly sourceId: string;
  readonly coefficients: Map<number, WorkingScalar>;
  readonly coefficientBounds: Map<number, number>;
  readonly compareBounds: Map<number, number>;
  rhs: WorkingScalar;
  rhsBound: number;
  pivotDof: number;
}

interface PivotCandidate {
  readonly row: ActiveRow;
  readonly dof: number;
}

function initialBound(value: number): number {
  return ROUNDING_EPSILON * Math.abs(value);
}

function dividedBound(
  bound: number,
  divisor: number,
  divisorBound: number,
  dividedValue: number,
): number {
  return (
    bound / Math.abs(divisor) +
    Math.abs(dividedValue) * (divisorBound / Math.abs(divisor) + 2 * ROUNDING_EPSILON)
  );
}

function combinedBound(
  operandBound: number,
  factor: number,
  factorBound: number,
  pivotValue: number,
  pivotBound: number,
  contribution: number,
): number {
  return (
    operandBound +
    Math.abs(factor) * pivotBound +
    Math.abs(pivotValue) * factorBound +
    factorBound * pivotBound +
    ROUNDING_EPSILON * Math.abs(contribution)
  );
}

function combinedCompareBound(
  operandBound: number,
  factor: number,
  factorBound: number,
  pivotValue: number,
  pivotBound: number,
  contribution: number,
  residual: number,
): number {
  return (
    operandBound +
    Math.abs(factor) * pivotBound +
    Math.abs(pivotValue) * factorBound +
    factorBound * pivotBound +
    ROUNDING_EPSILON * (Math.abs(contribution) + Math.abs(residual))
  );
}

function coefficientTotal(row: ActiveRow, dof: number): number {
  return row.coefficients.get(dof)!.total(`constraint-rank.coefficient[${row.sourceId}][${dof}]`);
}

function sortedRowEntries(row: ActiveRow): Array<[number, number]> {
  return Array.from(row.coefficients.entries())
    .map(([dof, scalar]): [number, number] => [
      dof,
      scalar.total(`constraint-rank.rowEntry[${dof}]`),
    ])
    .toSorted(([leftDof], [rightDof]) => leftDof - rightDof);
}

function compareRows(left: ActiveRow, right: ActiveRow): number {
  const leftEntries = sortedRowEntries(left);
  const rightEntries = sortedRowEntries(right);
  const sharedLength = Math.min(leftEntries.length, rightEntries.length);
  for (let index = 0; index < sharedLength; index += 1) {
    const [leftDof, leftValue] = leftEntries[index]!;
    const [rightDof, rightValue] = rightEntries[index]!;
    if (leftDof !== rightDof) return leftDof - rightDof;
    if (leftValue !== rightValue) return leftValue - rightValue;
  }
  if (leftEntries.length !== rightEntries.length) {
    return leftEntries.length - rightEntries.length;
  }
  const leftRhs = left.rhs.total(`constraint-rank.rhs[${left.sourceId}]`);
  const rightRhs = right.rhs.total(`constraint-rank.rhs[${right.sourceId}]`);
  return leftRhs - rightRhs;
}

function isBetterCandidate(candidate: PivotCandidate, incumbent: PivotCandidate): boolean {
  const candidateStrength = Math.abs(coefficientTotal(candidate.row, candidate.dof));
  const incumbentStrength = Math.abs(coefficientTotal(incumbent.row, incumbent.dof));
  const candidateBound = candidate.row.compareBounds.get(candidate.dof)!;
  const incumbentBound = incumbent.row.compareBounds.get(incumbent.dof)!;
  if (candidateStrength > incumbentStrength + candidateBound + incumbentBound) return true;
  if (incumbentStrength > candidateStrength + candidateBound + incumbentBound) return false;
  if (candidate.dof !== incumbent.dof) return candidate.dof < incumbent.dof;
  if (candidate.row.coefficients.size !== incumbent.row.coefficients.size) {
    return candidate.row.coefficients.size < incumbent.row.coefficients.size;
  }
  const rowComparison = compareRows(candidate.row, incumbent.row);
  if (rowComparison !== 0) return rowComparison < 0;
  return compareIdentifiers(candidate.row.sourceId, incumbent.row.sourceId) < 0;
}

function classifyRow(row: ActiveRow, redundantSourceIds: string[]): void {
  const rhs = row.rhs.total(`constraint-rank.rhs[${row.sourceId}]`);
  if (rhs === 0) {
    redundantSourceIds.push(row.sourceId);
    return;
  }
  throw new XFrameError(
    "CONSTRAINT_CONTRADICTION",
    "Constraint system contains conflicting dependent equations.",
    {
      kind: "analysis",
      stage: "constraint-rank",
      detail: `source=${row.sourceId}, reducedRhs=${String(rhs)}`,
      entityId: row.sourceId,
    },
  );
}

export function analyzeConstraintRank(
  equationsInput: readonly CanonicalAffineConstraint[],
): ConstraintRankAnalysis {
  let active: ActiveRow[] = [];
  const redundantSourceIds: string[] = [];
  for (const equation of equationsInput) {
    const coefficients = new Map<number, WorkingScalar>();
    const coefficientBounds = new Map<number, number>();
    const compareBounds = new Map<number, number>();
    for (const term of equation.terms) {
      coefficients.set(
        term.dof,
        new WorkingScalar(
          finiteNumber(
            term.coefficient,
            `constraint[${equation.sourceId}].coefficient[${term.dof}]`,
          ),
        ),
      );
      coefficientBounds.set(term.dof, initialBound(term.coefficient));
      compareBounds.set(term.dof, initialBound(term.coefficient));
    }
    const row: ActiveRow = {
      sourceId: equation.sourceId,
      coefficients,
      coefficientBounds,
      compareBounds,
      rhs: new WorkingScalar(
        finiteNumber(equation.rightHandSide, `constraint[${equation.sourceId}].rightHandSide`),
      ),
      rhsBound: initialBound(equation.rightHandSide),
      pivotDof: -1,
    };
    if (row.coefficients.size === 0) {
      classifyRow(row, redundantSourceIds);
    } else {
      active.push(row);
    }
  }
  const rows: ActiveRow[] = [];

  while (active.length > 0) {
    let best: PivotCandidate | undefined;
    for (const row of active) {
      for (const dof of row.coefficients.keys()) {
        const candidate = { row, dof };
        if (best === undefined || isBetterCandidate(candidate, best)) best = candidate;
      }
    }
    const pivotRow = best!.row;
    const pivotDof = best!.dof;
    const pivot = coefficientTotal(pivotRow, pivotDof);
    const pivotBound = pivotRow.coefficientBounds.get(pivotDof)!;
    const pivotCompareBound = pivotRow.compareBounds.get(pivotDof)!;
    if (pivot === 0) {
      throw new XFrameError(
        "CONSTRAINT_RANK_DEFICIENT",
        "Constraint elimination retained a zero pivot.",
        {
          kind: "analysis",
          stage: "constraint-rank",
          detail: `source=${pivotRow.sourceId}, pivot=${String(pivotDof)}`,
          entityId: pivotRow.sourceId,
          equation: pivotDof,
        },
      );
    }
    for (const [dof, scalar] of pivotRow.coefficients) {
      scalar.divideBy(pivot, `constraint[${pivotRow.sourceId}].normalized[${dof}]`);
      const dividedValue = scalar.total(`constraint[${pivotRow.sourceId}].normalizedValue[${dof}]`);
      pivotRow.coefficientBounds.set(
        dof,
        dividedBound(pivotRow.coefficientBounds.get(dof)!, pivot, pivotBound, dividedValue),
      );
      pivotRow.compareBounds.set(
        dof,
        dividedBound(pivotRow.compareBounds.get(dof)!, pivot, pivotCompareBound, dividedValue),
      );
    }
    pivotRow.rhs.divideBy(pivot, `constraint[${pivotRow.sourceId}].normalizedRightHandSide`);
    pivotRow.rhsBound = dividedBound(
      pivotRow.rhsBound,
      pivot,
      pivotBound,
      pivotRow.rhs.total(`constraint[${pivotRow.sourceId}].normalizedRhsValue`),
    );
    pivotRow.coefficients.set(pivotDof, new WorkingScalar(1));
    pivotRow.coefficientBounds.set(pivotDof, 0);
    pivotRow.compareBounds.set(pivotDof, 0);
    pivotRow.pivotDof = pivotDof;
    active.splice(active.indexOf(pivotRow), 1);
    rows.push(pivotRow);

    for (const row of active) {
      const factorScalar = row.coefficients.get(pivotDof);
      if (factorScalar === undefined) continue;
      const factor = factorScalar.total(`constraint-rank.factor[${row.sourceId}][${pivotDof}]`);
      const factorBound = row.coefficientBounds.get(pivotDof)!;
      const factorCompareBound = row.compareBounds.get(pivotDof)!;
      row.coefficients.delete(pivotDof);
      row.coefficientBounds.delete(pivotDof);
      row.compareBounds.delete(pivotDof);
      for (const [dof, pivotCoefficientScalar] of pivotRow.coefficients) {
        if (dof === pivotDof) continue;
        const pivotCoefficient = pivotCoefficientScalar.total(
          `constraint-rank.pivotCoefficient[${pivotDof}][${dof}]`,
        );
        const pivotCoefficientBound = pivotRow.coefficientBounds.get(dof)!;
        const pivotCoefficientCompareBound = pivotRow.compareBounds.get(dof)!;
        const contribution = finiteNumber(
          factor * pivotCoefficient,
          `constraint-rank.coefficientContribution[${row.sourceId}][${dof}]`,
        );
        const existing = row.coefficients.get(dof);
        const operandBound = existing === undefined ? 0 : row.coefficientBounds.get(dof)!;
        const operandCompareBound = existing === undefined ? 0 : row.compareBounds.get(dof)!;
        if (existing === undefined) {
          row.coefficients.set(dof, new WorkingScalar(0));
          row.coefficientBounds.set(dof, 0);
          row.compareBounds.set(dof, 0);
        }
        const scalar = row.coefficients.get(dof)!;
        scalar.add(-contribution);
        const residual = scalar.total(`constraint-rank.coefficientResidual[${dof}]`);
        const residualBound = combinedBound(
          operandBound,
          factor,
          factorBound,
          pivotCoefficient,
          pivotCoefficientBound,
          contribution,
        );
        const residualCompareBound = combinedCompareBound(
          operandCompareBound,
          factor,
          factorCompareBound,
          pivotCoefficient,
          pivotCoefficientCompareBound,
          contribution,
          residual,
        );
        if (Math.abs(residual) <= residualBound) {
          row.coefficients.delete(dof);
          row.coefficientBounds.delete(dof);
          row.compareBounds.delete(dof);
        } else {
          row.coefficientBounds.set(dof, residualBound);
          row.compareBounds.set(dof, residualCompareBound);
        }
      }
      const rhsOperandBound = row.rhsBound;
      const pivotRhs = pivotRow.rhs.total(`constraint-rank.pivotRhs[${pivotDof}]`);
      const pivotRhsBound = pivotRow.rhsBound;
      const rhsContribution = finiteNumber(
        factor * pivotRhs,
        `constraint-rank.rhsContribution[${row.sourceId}]`,
      );
      row.rhs.add(-rhsContribution);
      const rhsResidual = row.rhs.total(`constraint-rank.rhsResidual[${row.sourceId}]`);
      const rhsResidualBound = combinedBound(
        rhsOperandBound,
        factor,
        factorBound,
        pivotRhs,
        pivotRhsBound,
        rhsContribution,
      );
      if (Math.abs(rhsResidual) <= rhsResidualBound) {
        row.rhs = new WorkingScalar(0);
        row.rhsBound = 0;
      } else {
        row.rhsBound = rhsResidualBound;
      }
      if (row.coefficients.size === 0) {
        classifyRow(row, redundantSourceIds);
      }
    }
    const remaining: ActiveRow[] = [];
    for (const row of active) {
      if (row.coefficients.size > 0) remaining.push(row);
    }
    active = remaining;
  }

  return Object.freeze({
    rank: rows.length,
    rows: Object.freeze(
      rows.map((row) => {
        const orderedCoefficients = new Map<number, number>();
        for (const [dof, scalar] of [...row.coefficients.entries()].toSorted(
          ([left], [right]) => left - right,
        )) {
          orderedCoefficients.set(
            dof,
            scalar.total(`constraint[${row.sourceId}].outputCoefficient[${dof}]`),
          );
        }
        return Object.freeze({
          sourceId: row.sourceId,
          coefficients: orderedCoefficients,
          rightHandSide: row.rhs.total(`constraint[${row.sourceId}].outputRightHandSide`),
          pivotDof: row.pivotDof,
        });
      }),
    ),
    redundantSourceIds: Object.freeze(
      [...redundantSourceIds].toSorted((left, right) => compareIdentifiers(left, right)),
    ),
  });
}
