import type { CanonicalAffineConstraint } from "./affine-equation.js";

export interface ConstraintBlock {
  readonly equations: readonly CanonicalAffineConstraint[];
  readonly dofs: readonly number[];
}

export function buildConstraintBlocks(
  equations: readonly CanonicalAffineConstraint[],
): readonly ConstraintBlock[] {
  const dofToEquations = new Map<number, number[]>();
  for (let index = 0; index < equations.length; index += 1) {
    for (const { dof } of equations[index]!.terms) {
      const values = dofToEquations.get(dof);
      if (values === undefined) dofToEquations.set(dof, [index]);
      else values.push(index);
    }
  }
  const visited = new Set<number>();
  const blocks: ConstraintBlock[] = [];
  for (let start = 0; start < equations.length; start += 1) {
    if (visited.has(start) || equations[start]!.terms.length === 0) continue;
    const queue = [start];
    const indexes: number[] = [];
    const dofs = new Set<number>();
    visited.add(start);
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const equationIndex = queue[cursor]!;
      indexes.push(equationIndex);
      for (const { dof } of equations[equationIndex]!.terms) {
        dofs.add(dof);
        for (const neighbor of dofToEquations.get(dof) ?? []) {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            queue.push(neighbor);
          }
        }
      }
    }
    blocks.push(
      Object.freeze({
        equations: Object.freeze(indexes.map((index) => equations[index]!)),
        dofs: Object.freeze([...dofs].sort((left, right) => left - right)),
      }),
    );
  }
  return Object.freeze(blocks.sort((left, right) => left.dofs[0]! - right.dofs[0]!));
}
