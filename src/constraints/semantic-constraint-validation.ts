import { XFrameError } from "../errors/xframe-error.js";
import { finiteNumber } from "../geometry/finite.js";
import type { AffineConstraintEquation } from "./affine-equation.js";
import { TOLERANCE } from "./constraint-rank.js";
import type { SparseAffineTransformRow } from "./compile-constraints.js";

// Temporary Phase 1 containment policy: reuse the constraint rank tolerance
// (256 * Number.EPSILON) without changing its value. The compiler redesign
// phase must re-derive a dedicated semantic tolerance with written evidence.
export const SEMANTIC_CONSTRAINT_TOLERANCE = TOLERANCE;

export interface SemanticTransformViolation {
  readonly sourceId: string;
  readonly kind: "constant" | "transform-column";
  readonly normalizedResidual: number;
  readonly numerator: number;
  readonly scale: number;
  readonly tolerance: number;
  readonly reducedDof?: number;
}

class CompensatedAccumulator {
  private sum = 0;
  private compensation = 0;

  add(value: number): void {
    const next = this.sum + value;
    if (Math.abs(this.sum) >= Math.abs(value)) {
      this.compensation += this.sum - next + value;
    } else {
      this.compensation += value - next + this.sum;
    }
    this.sum = next;
  }

  total(path: string): number {
    return finiteNumber(this.sum + this.compensation, path);
  }
}

function accumulate(map: Map<number, CompensatedAccumulator>, key: number, value: number): void {
  let accumulator = map.get(key);
  if (accumulator === undefined) {
    accumulator = new CompensatedAccumulator();
    map.set(key, accumulator);
  }
  accumulator.add(value);
}

function compensatedCoefficientSum(values: readonly number[]): number {
  // Deterministic: ascending |value| with value tie-break, then Neumaier
  // compensated accumulation. Every permutation of the same multiset takes
  // the identical numerical path, so the effective coefficient is
  // independent of user term order and survives catastrophic-looking
  // cancellation without tolerance pruning.
  const ordered = [...values].toSorted(
    (left, right) => Math.abs(left) - Math.abs(right) || left - right,
  );
  let sum = 0;
  let compensation = 0;
  for (const value of ordered) {
    const next = sum + value;
    if (Math.abs(sum) >= Math.abs(value)) {
      compensation += sum - next + value;
    } else {
      compensation += value - next + sum;
    }
    sum = next;
  }
  return finiteNumber(sum + compensation, "semanticConstraint.effectiveCoefficient");
}

function aggregateCoefficients(equation: AffineConstraintEquation): Map<number, number> {
  const grouped = new Map<number, number[]>();
  for (let index = 0; index < equation.terms.length; index += 1) {
    const term = equation.terms[index]!;
    const dof = term.dof;
    const coefficient = finiteNumber(
      term.coefficient,
      `constraint[${equation.sourceId}].terms[${index}].coefficient`,
    );
    const coefficients = grouped.get(dof);
    if (coefficients === undefined) {
      grouped.set(dof, [coefficient]);
    } else {
      coefficients.push(coefficient);
    }
  }
  const aggregated = new Map<number, number>();
  for (const [dof, coefficients] of grouped) {
    aggregated.set(dof, compensatedCoefficientSum(coefficients));
  }
  return aggregated;
}

function normalizedResidual(numerator: number, scale: number): number {
  // Explicit zero-scale handling: an exact zero row is satisfied; a nonzero
  // residual with zero scale is a hard violation (not hidden behind a floor).
  if (scale === 0) return numerator === 0 ? 0 : Number.POSITIVE_INFINITY;
  return numerator / scale;
}

/**
 * Evaluates one original affine equation a^T u = b against a physical
 * displacement vector. Duplicate DOF terms are aggregated with their complete
 * mathematical contribution; accumulation is ordered by DOF index so the
 * result is invariant to input term order and source ID.
 */
export function evaluateAffineSemanticResidual(
  equation: AffineConstraintEquation,
  displacement: ArrayLike<number>,
): number {
  const rightHandSide = finiteNumber(
    equation.rightHandSide,
    `constraint[${equation.sourceId}].rightHandSide`,
  );
  const coefficients = aggregateCoefficients(equation);
  const numerator = new CompensatedAccumulator();
  const scale = new CompensatedAccumulator();
  numerator.add(-rightHandSide);
  scale.add(Math.abs(rightHandSide));
  for (const dof of [...coefficients.keys()].toSorted((left, right) => left - right)) {
    const coefficient = coefficients.get(dof)!;
    const value = finiteNumber(
      displacement[dof],
      `constraint[${equation.sourceId}].displacement[${dof}]`,
    );
    const contribution = finiteNumber(
      coefficient * value,
      `constraint[${equation.sourceId}].contribution[${dof}]`,
    );
    numerator.add(contribution);
    scale.add(Math.abs(contribution));
  }
  return normalizedResidual(
    Math.abs(numerator.total(`constraint[${equation.sourceId}].residual`)),
    scale.total(`constraint[${equation.sourceId}].scale`),
  );
}

/**
 * Maximum normalized residual over all original equations against the
 * recovered physical displacement. The equations are the untouched semantic
 * oracle; nothing is pruned, normalized, or eliminated here.
 */
export function maximumSemanticConstraintResidual(
  equations: readonly AffineConstraintEquation[],
  displacement: ArrayLike<number>,
): number {
  let maximum = 0;
  for (const equation of equations) {
    maximum = Math.max(maximum, evaluateAffineSemanticResidual(equation, displacement));
  }
  return maximum;
}

/**
 * Validates a compiled sparse affine map u = T q + c against every original
 * equation: the constant condition a^T c = b and, for every free coordinate
 * j, the zero-column condition a^T T[:, j] = 0. Returns the first violation
 * or undefined when the transform is semantically consistent. Free
 * coordinates with no contribution trivially satisfy the column condition.
 */
export function findSemanticTransformViolation(
  equations: readonly AffineConstraintEquation[],
  rows: readonly SparseAffineTransformRow[],
): SemanticTransformViolation | undefined {
  const tolerance = SEMANTIC_CONSTRAINT_TOLERANCE;
  for (const equation of equations) {
    const coefficients = aggregateCoefficients(equation);
    const rightHandSide = finiteNumber(
      equation.rightHandSide,
      `constraint[${equation.sourceId}].rightHandSide`,
    );
    const constantNumerator = new CompensatedAccumulator();
    const constantScale = new CompensatedAccumulator();
    constantNumerator.add(-rightHandSide);
    constantScale.add(Math.abs(rightHandSide));
    for (const dof of [...coefficients.keys()].toSorted((left, right) => left - right)) {
      const coefficient = coefficients.get(dof)!;
      const row = rows[dof];
      if (row === undefined) {
        throw new XFrameError(
          "INPUT_INVALID",
          "Semantic validation cannot find a transform row for a constrained DOF.",
          {
            kind: "input",
            path: `constraints.rows[${dof}]`,
            expected: "a compiled transform row",
            actual: "missing row",
          },
        );
      }
      const offset = finiteNumber(
        row.offset,
        `constraint[${equation.sourceId}].transformOffset[${dof}]`,
      );
      constantNumerator.add(
        finiteNumber(
          coefficient * offset,
          `constraint[${equation.sourceId}].constantContribution[${dof}]`,
        ),
      );
      constantScale.add(Math.abs(coefficient) * Math.abs(offset));
    }
    const constantNormalized = normalizedResidual(
      Math.abs(constantNumerator.total(`constraint[${equation.sourceId}].constantResidual`)),
      constantScale.total(`constraint[${equation.sourceId}].constantScale`),
    );
    if (constantNormalized > tolerance) {
      return {
        sourceId: equation.sourceId,
        kind: "constant",
        normalizedResidual: constantNormalized,
        numerator: Math.abs(constantNumerator.total("semanticConstantNumerator")),
        scale: constantScale.total("semanticConstantScale"),
        tolerance,
      };
    }

    const columnNumerators = new Map<number, CompensatedAccumulator>();
    const columnScales = new Map<number, CompensatedAccumulator>();
    for (const dof of [...coefficients.keys()].toSorted((left, right) => left - right)) {
      const coefficient = coefficients.get(dof)!;
      const absoluteCoefficient = Math.abs(coefficient);
      for (const term of rows[dof]!.terms) {
        const value = finiteNumber(
          term.coefficient,
          `constraint[${equation.sourceId}].transformCoefficient[${dof}]`,
        );
        const contribution = finiteNumber(
          coefficient * value,
          `constraint[${equation.sourceId}].columnContribution[${term.reducedDof}]`,
        );
        accumulate(columnNumerators, term.reducedDof, contribution);
        accumulate(columnScales, term.reducedDof, absoluteCoefficient * Math.abs(value));
      }
    }
    for (const [reducedDof, scaleAccumulator] of columnScales) {
      const numerator = Math.abs(
        columnNumerators
          .get(reducedDof)!
          .total(`constraint[${equation.sourceId}].columnResidual[${reducedDof}]`),
      );
      const columnNormalized = normalizedResidual(
        numerator,
        scaleAccumulator.total(`constraint[${equation.sourceId}].columnScale[${reducedDof}]`),
      );
      if (columnNormalized > tolerance) {
        return {
          sourceId: equation.sourceId,
          kind: "transform-column",
          normalizedResidual: columnNormalized,
          numerator,
          scale: scaleAccumulator.total("semanticColumnScale"),
          tolerance,
          reducedDof,
        };
      }
    }
  }
  return undefined;
}
