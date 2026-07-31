export interface AffineConstraintTerm {
  readonly dof: number;
  readonly coefficient: number;
}

export interface AffineConstraintEquation {
  readonly sourceId: string;
  readonly terms: readonly AffineConstraintTerm[];
  readonly rightHandSide: number;
}

export interface CanonicalAffineConstraint extends AffineConstraintEquation {
  readonly terms: readonly AffineConstraintTerm[];
}
