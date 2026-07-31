import { XFrameError } from "../errors/xframe-error.js";
import { finiteNumber } from "../geometry/finite.js";
import type {
  AffineConstraintEquation,
  AffineConstraintTerm,
  CanonicalAffineConstraint,
} from "./affine-equation.js";

const ZERO_TOLERANCE = 64 * Number.EPSILON;

function checkedDof(value: number, path: string): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new XFrameError("INPUT_INVALID", "Constraint DOF index must be a nonnegative safe integer.", {
      kind: "input",
      path,
      expected: "nonnegative safe integer",
      actual: String(value),
    });
  }
  return value;
}

export function canonicalizeConstraint(input: AffineConstraintEquation): CanonicalAffineConstraint {
  const sums = new Map<number, number>();
  for (let index = 0; index < input.terms.length; index += 1) {
    const term = input.terms[index]!;
    const dof = checkedDof(term.dof, `constraint[${input.sourceId}].terms[${index}].dof`);
    const coefficient = finiteNumber(
      term.coefficient,
      `constraint[${input.sourceId}].terms[${index}].coefficient`,
    );
    sums.set(dof, finiteNumber((sums.get(dof) ?? 0) + coefficient, "constraint.coefficientSum"));
  }
  const rightHandSide = finiteNumber(
    input.rightHandSide,
    `constraint[${input.sourceId}].rightHandSide`,
  );
  const maximum = Math.max(1, ...[...sums.values()].map(Math.abs), Math.abs(rightHandSide));
  const terms = [...sums]
    .filter(([, coefficient]) => Math.abs(coefficient) > ZERO_TOLERANCE * maximum)
    .sort(([left], [right]) => left - right);
  if (terms.length === 0) {
    if (Math.abs(rightHandSide) > ZERO_TOLERANCE * maximum) {
      throw new XFrameError("CONSTRAINT_CONTRADICTION", "Constraint has no terms but a nonzero right-hand side.", {
        kind: "analysis",
        stage: "constraint-canonicalization",
        detail: `source=${input.sourceId}, rhs=${String(rightHandSide)}`,
        entityId: input.sourceId,
      });
    }
    return Object.freeze({ sourceId: input.sourceId, terms: Object.freeze([]), rightHandSide: 0 });
  }
  const first = terms[0]![1];
  const divisor = Math.abs(first);
  const sign = first < 0 ? -1 : 1;
  const normalizedTerms: AffineConstraintTerm[] = terms.map(([dof, coefficient]) =>
    Object.freeze({ dof, coefficient: finiteNumber((coefficient / divisor) * sign, "constraint.normalizedCoefficient") }),
  );
  const normalizedRhs = finiteNumber((rightHandSide / divisor) * sign, "constraint.normalizedRightHandSide");
  return Object.freeze({
    sourceId: input.sourceId,
    terms: Object.freeze(normalizedTerms),
    rightHandSide: Object.is(normalizedRhs, -0) ? 0 : normalizedRhs,
  });
}
