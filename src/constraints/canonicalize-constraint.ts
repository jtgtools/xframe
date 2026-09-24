import { XFrameError } from "../errors/xframe-error.js";
import { finiteNumber } from "../geometry/finite.js";
import type {
  AffineConstraintEquation,
  AffineConstraintTerm,
  CanonicalAffineConstraint,
} from "./affine-equation.js";
import { compensatedCoefficientSum } from "./compensated-sum.js";

function checkedDof(value: number, path: string): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new XFrameError(
      "INPUT_INVALID",
      "Constraint DOF index must be a nonnegative safe integer.",
      {
        kind: "input",
        path,
        expected: "nonnegative safe integer",
        actual: String(value),
      },
    );
  }
  return value;
}

export function canonicalizeConstraint(input: AffineConstraintEquation): CanonicalAffineConstraint {
  const grouped = new Map<number, number[]>();
  for (let index = 0; index < input.terms.length; index += 1) {
    const term = input.terms[index]!;
    const dof = checkedDof(term.dof, `constraint[${input.sourceId}].terms[${index}].dof`);
    const coefficient = finiteNumber(
      term.coefficient,
      `constraint[${input.sourceId}].terms[${index}].coefficient`,
    );
    const coefficients = grouped.get(dof);
    if (coefficients === undefined) {
      grouped.set(dof, [coefficient]);
    } else {
      coefficients.push(coefficient);
    }
  }
  const rightHandSide = finiteNumber(
    input.rightHandSide,
    `constraint[${input.sourceId}].rightHandSide`,
  );
  const terms: Array<[number, number]> = [];
  for (const [dof, coefficients] of grouped) {
    // Delete a DOF term only when the compensated aggregate is exactly zero;
    // rank decisions belong to the rank engine, not canonicalization.
    const coefficient = compensatedCoefficientSum(coefficients, "constraint.effectiveCoefficient");
    if (coefficient !== 0) {
      terms.push([dof, coefficient]);
    }
  }
  terms.sort(([left], [right]) => left - right);
  if (terms.length === 0) {
    if (rightHandSide !== 0) {
      throw new XFrameError(
        "CONSTRAINT_CONTRADICTION",
        "Constraint has no terms but a nonzero right-hand side.",
        {
          kind: "analysis",
          stage: "constraint-canonicalization",
          detail: `source=${input.sourceId}, rhs=${String(rightHandSide)}`,
          entityId: input.sourceId,
        },
      );
    }
    return Object.freeze({ sourceId: input.sourceId, terms: Object.freeze([]), rightHandSide: 0 });
  }
  let rowScale = 0;
  for (const [, coefficient] of terms) {
    rowScale = Math.max(rowScale, Math.abs(coefficient));
  }
  const sign = terms[0]![1] < 0 ? -1 : 1;
  const normalizedTerms: AffineConstraintTerm[] = terms.map(([dof, coefficient]) =>
    Object.freeze({
      dof,
      coefficient: finiteNumber(
        (coefficient / rowScale) * sign,
        "constraint.normalizedCoefficient",
      ),
    }),
  );
  const normalizedRhs = finiteNumber(
    (rightHandSide / rowScale) * sign,
    "constraint.normalizedRightHandSide",
  );
  return Object.freeze({
    sourceId: input.sourceId,
    terms: Object.freeze(normalizedTerms),
    rightHandSide: Object.is(normalizedRhs, -0) ? 0 : normalizedRhs,
  });
}
