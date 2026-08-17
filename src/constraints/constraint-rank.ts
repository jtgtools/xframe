import { XFrameError } from "../errors/xframe-error.js";
import { finiteNumber } from "../geometry/finite.js";
import { compareIdentifiers } from "../model/identifier.js";
import type { CanonicalAffineConstraint } from "./affine-equation.js";

export const TOLERANCE = 256 * Number.EPSILON;

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

function maximumAbsoluteMapValue(values: ReadonlyMap<number, number>, path: string): number {
  let maximum = 0;
  for (const value of values.values()) {
    const checkedValue = finiteNumber(value, path);
    const absoluteValue = finiteNumber(Math.abs(checkedValue), path);
    if (absoluteValue > maximum) maximum = absoluteValue;
  }
  return maximum;
}

function minimumMapKey(values: ReadonlyMap<number, number>): number {
  let minimum = Number.POSITIVE_INFINITY;
  for (const key of values.keys()) if (key < minimum) minimum = key;
  return minimum;
}

function isWithinRelativeTolerance(valueInput: number, scaleInput: number, path: string): boolean {
  const value = finiteNumber(valueInput, path);
  const scale = finiteNumber(scaleInput, `${path}Scale`);
  if (value === 0) return true;
  if (scale === 0) return false;
  return finiteNumber(Math.abs(value) / scale, `${path}Relative`) <= TOLERANCE;
}

function removeScaledZeros(
  row: Map<number, number>,
  scale: number,
  candidates: ReadonlyMap<number, number>,
): void {
  const checkedScale = finiteNumber(scale, "constraint-rank.coefficientCancellationScale");
  for (const dof of candidates.keys()) {
    const value = row.get(dof);
    if (value === undefined) continue;
    if (isWithinRelativeTolerance(value, checkedScale, `constraint-rank.coefficient[${dof}]`))
      row.delete(dof);
  }
}

function eliminateRow(
  coefficients: Map<number, number>,
  rightHandSideInput: number,
  pivot: Readonly<ReducedConstraintRow>,
): number {
  const factor = finiteNumber(
    coefficients.get(pivot.pivotDof) ?? 0,
    `constraint-rank.factor[${pivot.pivotDof}]`,
  );
  let rightHandSide = finiteNumber(rightHandSideInput, "constraint-rank.rightHandSide");
  if (factor === 0) return rightHandSide;

  coefficients.delete(pivot.pivotDof);
  const coefficientOperands = new Map<number, number>();
  const coefficientContributions = new Map<number, number>();
  for (const [dof, pivotCoefficientInput] of pivot.coefficients) {
    if (dof === pivot.pivotDof) continue;
    const operand = finiteNumber(
      coefficients.get(dof) ?? 0,
      `constraint-rank.coefficientOperand[${dof}]`,
    );
    const pivotCoefficient = finiteNumber(
      pivotCoefficientInput,
      `constraint-rank.pivotCoefficient[${dof}]`,
    );
    const contribution = finiteNumber(
      factor * pivotCoefficient,
      `constraint-rank.coefficientContribution[${dof}]`,
    );
    const residual = finiteNumber(
      operand - contribution,
      `constraint-rank.coefficientResidual[${dof}]`,
    );
    coefficients.set(dof, residual);
    coefficientOperands.set(dof, operand);
    coefficientContributions.set(dof, contribution);
  }
  const operandScale = maximumAbsoluteMapValue(
    coefficientOperands,
    "constraint-rank.coefficientOperand",
  );
  const contributionScale = maximumAbsoluteMapValue(
    coefficientContributions,
    "constraint-rank.coefficientContribution",
  );
  const coefficientScale = operandScale > contributionScale ? operandScale : contributionScale;
  removeScaledZeros(coefficients, coefficientScale, coefficientOperands);

  const rightHandSideOperand = finiteNumber(rightHandSide, "constraint-rank.rhsOperand");
  const rightHandSideContribution = finiteNumber(
    factor * finiteNumber(pivot.rightHandSide, "constraint-rank.pivotRhs"),
    "constraint-rank.rhsContribution",
  );
  const rightHandSideResidual = finiteNumber(
    rightHandSideOperand - rightHandSideContribution,
    "constraint-rank.rhsResidual",
  );
  const rightHandSideOperandAbsolute = finiteNumber(
    Math.abs(rightHandSideOperand),
    "constraint-rank.rhsOperand",
  );
  const rightHandSideContributionAbsolute = finiteNumber(
    Math.abs(rightHandSideContribution),
    "constraint-rank.rhsContribution",
  );
  const rightHandSideScale =
    rightHandSideOperandAbsolute > rightHandSideContributionAbsolute
      ? rightHandSideOperandAbsolute
      : rightHandSideContributionAbsolute;
  rightHandSide = rightHandSideResidual;
  if (
    isWithinRelativeTolerance(
      rightHandSideResidual,
      rightHandSideScale,
      "constraint-rank.rhsResidual",
    )
  )
    rightHandSide = 0;
  return rightHandSide;
}

export function analyzeConstraintRank(
  equationsInput: readonly CanonicalAffineConstraint[],
): ConstraintRankAnalysis {
  const equations = equationsInput.toSorted((left, right) =>
    compareIdentifiers(left.sourceId, right.sourceId),
  );
  const rows: {
    sourceId: string;
    coefficients: Map<number, number>;
    rightHandSide: number;
    pivotDof: number;
  }[] = [];
  const redundantSourceIds: string[] = [];

  for (const equation of equations) {
    const coefficients = new Map(
      equation.terms.map(({ dof, coefficient }) => [
        dof,
        finiteNumber(coefficient, `constraint[${equation.sourceId}].coefficient[${dof}]`),
      ]),
    );
    let rhs = finiteNumber(
      equation.rightHandSide,
      `constraint[${equation.sourceId}].rightHandSide`,
    );
    for (const pivot of rows) {
      rhs = eliminateRow(coefficients, rhs, pivot);
    }
    if (coefficients.size === 0) {
      if (rhs !== 0) {
        throw new XFrameError(
          "CONSTRAINT_CONTRADICTION",
          "Constraint system contains conflicting dependent equations.",
          {
            kind: "analysis",
            stage: "constraint-rank",
            detail: `source=${equation.sourceId}, reducedRhs=${String(rhs)}`,
            entityId: equation.sourceId,
          },
        );
      }
      redundantSourceIds.push(equation.sourceId);
      continue;
    }
    const pivotDof = minimumMapKey(coefficients);
    const pivot = finiteNumber(
      coefficients.get(pivotDof),
      `constraint[${equation.sourceId}].pivot[${pivotDof}]`,
    );
    if (pivot === 0) {
      throw new XFrameError(
        "CONSTRAINT_RANK_DEFICIENT",
        "Constraint elimination retained a zero pivot.",
        {
          kind: "analysis",
          stage: "constraint-rank",
          detail: `source=${equation.sourceId}, pivot=${String(pivotDof)}`,
          entityId: equation.sourceId,
          equation: pivotDof,
        },
      );
    }
    for (const [dof, value] of coefficients) {
      coefficients.set(
        dof,
        finiteNumber(value / pivot, `constraint[${equation.sourceId}].normalized[${dof}]`),
      );
    }
    rhs = finiteNumber(rhs / pivot, `constraint[${equation.sourceId}].normalizedRightHandSide`);

    for (const previous of rows) {
      previous.rightHandSide = eliminateRow(previous.coefficients, previous.rightHandSide, {
        sourceId: equation.sourceId,
        coefficients,
        rightHandSide: rhs,
        pivotDof,
      });
    }
    rows.push({ sourceId: equation.sourceId, coefficients, rightHandSide: rhs, pivotDof });
    rows.sort((left, right) => left.pivotDof - right.pivotDof);
  }

  return Object.freeze({
    rank: rows.length,
    rows: Object.freeze(
      rows.map((row) => {
        const orderedCoefficients = new Map<number, number>();
        const entries = Array.from(row.coefficients.entries()).toSorted(
          ([left], [right]) => left - right,
        );
        for (const [dof, coefficient] of entries) orderedCoefficients.set(dof, coefficient);
        return Object.freeze({
          sourceId: row.sourceId,
          coefficients: orderedCoefficients,
          rightHandSide: row.rightHandSide,
          pivotDof: row.pivotDof,
        });
      }),
    ),
    redundantSourceIds: Object.freeze(redundantSourceIds),
  });
}
