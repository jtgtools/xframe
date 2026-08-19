import { XFrameError } from "../errors/xframe-error.js";
import { finiteNumber } from "../geometry/finite.js";
import { compareIdentifiers } from "../model/identifier.js";
import type { ConstraintRecord } from "../model/domain-records.js";
import { createDofKey } from "../model/dof-key.js";
import type { PhysicalDofTable } from "../model/dof-topology.js";
import type { AffineConstraintEquation, CanonicalAffineConstraint } from "./affine-equation.js";
import { canonicalizeConstraint } from "./canonicalize-constraint.js";
import { analyzeConstraintRank } from "./constraint-rank.js";
import { WorkingScalar } from "./constraint-numerics.js";
import { findSemanticTransformViolation } from "./semantic-constraint-validation.js";

export interface SparseTransformTerm {
  readonly reducedDof: number;
  readonly coefficient: number;
}

export interface SparseAffineTransformRow {
  readonly offset: number;
  readonly terms: readonly SparseTransformTerm[];
}

export interface CompileConstraintOptions {
  readonly maximumTransformNonzeros?: number;
}

export interface CompiledConstraints {
  readonly fullDofCount: number;
  readonly reducedDofCount: number;
  readonly rows: readonly SparseAffineTransformRow[];
  readonly freeDofs: readonly number[];
  readonly pivotDofs: readonly number[];
  readonly equations: readonly CanonicalAffineConstraint[];
  readonly redundantSourceIds: readonly string[];
  readonly transformNonzeroCount: number;
  recover(reducedDisplacements: ArrayLike<number>): Float64Array;
}

interface PivotExpression {
  readonly offset: number;
  readonly terms: ReadonlyMap<number, number>;
}

function checkedCount(value: number): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new XFrameError("INPUT_INVALID", "Full DOF count must be a nonnegative safe integer.", {
      kind: "input",
      path: "constraints.fullDofCount",
      expected: "nonnegative safe integer",
      actual: String(value),
    });
  }
  return value;
}

function memoryLimitExceeded(
  termCount: number,
  maximum: number,
  fullDofCount: number,
): XFrameError {
  return new XFrameError(
    "MEMORY_LIMIT_EXCEEDED",
    "Sparse constraint transform exceeds the configured storage limit.",
    {
      kind: "memory",
      operation: "constraint-transform",
      estimatedBytes: termCount * 16 + fullDofCount * 24,
      limitBytes: maximum * 16 + fullDofCount * 24,
    },
  );
}

function detectEqualDofCycle(equations: readonly CanonicalAffineConstraint[]): void {
  const graph = new Map<number, number[]>();
  const seenEdges = new Set<string>();
  for (const equation of equations) {
    if (equation.rightHandSide !== 0 || equation.terms.length !== 2) continue;
    const [left, right] = equation.terms;
    if (
      Math.abs(Math.abs(left!.coefficient) - 1) > 1e-12 ||
      Math.abs(Math.abs(right!.coefficient) - 1) > 1e-12 ||
      left!.coefficient * right!.coefficient >= 0
    )
      continue;
    const a = Math.min(left!.dof, right!.dof);
    const b = Math.max(left!.dof, right!.dof);
    const key = `${a}:${b}`;
    if (seenEdges.has(key)) continue;
    seenEdges.add(key);
    const leftList = graph.get(a) ?? [];
    const rightList = graph.get(b) ?? [];
    leftList.push(b);
    rightList.push(a);
    graph.set(a, leftList);
    graph.set(b, rightList);
  }
  const visited = new Set<number>();
  const stack: Array<{ dof: number; parent: number; neighborIndex: number }> = [];
  for (const start of [...graph.keys()].toSorted((a, b) => a - b)) {
    if (visited.has(start)) continue;
    visited.add(start);
    stack.push({ dof: start, parent: -1, neighborIndex: 0 });
    while (stack.length > 0) {
      const frame = stack[stack.length - 1]!;
      const neighbors = graph.get(frame.dof)!;
      if (frame.neighborIndex >= neighbors.length) {
        stack.pop();
        continue;
      }
      const next = neighbors[frame.neighborIndex]!;
      frame.neighborIndex += 1;
      if (next === frame.parent) continue;
      if (visited.has(next)) {
        throw new XFrameError("CONSTRAINT_CYCLE", "Equal-DOF constraint graph contains a cycle.", {
          kind: "analysis",
          stage: "constraint-cycle",
          detail: `cycle touches dof ${start}`,
          equation: start,
        });
      }
      visited.add(next);
      stack.push({ dof: next, parent: frame.dof, neighborIndex: 0 });
    }
  }
}

export function compileConstraints(
  fullDofCountInput: number,
  equationsInput: readonly AffineConstraintEquation[],
  options: CompileConstraintOptions = {},
): CompiledConstraints {
  const fullDofCount = checkedCount(fullDofCountInput);
  const canonical = equationsInput
    .map(canonicalizeConstraint)
    .filter(({ terms }) => terms.length > 0)
    .toSorted((left, right) => compareIdentifiers(left.sourceId, right.sourceId));
  for (const equation of canonical) {
    for (const { dof } of equation.terms) {
      if (dof >= fullDofCount) {
        throw new XFrameError(
          "INPUT_INVALID",
          "Constraint DOF index is outside the physical DOF range.",
          {
            kind: "input",
            path: `constraint[${equation.sourceId}]`,
            expected: `DOF index in [0, ${fullDofCount})`,
            actual: String(dof),
          },
        );
      }
    }
  }
  detectEqualDofCycle(canonical);
  const maximum = options.maximumTransformNonzeros ?? 10_000_000;
  if (!Number.isSafeInteger(maximum) || maximum < 0) {
    throw new XFrameError(
      "MEMORY_LIMIT_EXCEEDED",
      "Sparse constraint transform exceeds the configured storage limit.",
      {
        kind: "memory",
        operation: "constraint-transform",
        estimatedBytes: fullDofCount * 24,
        limitBytes: Math.max(0, maximum) * 16 + fullDofCount * 24,
      },
    );
  }
  const analysis = analyzeConstraintRank(canonical);
  const pivotDofs = analysis.rows.map(({ pivotDof }) => pivotDof);
  const pivotSet = new Set(pivotDofs);
  const freeDofs = Array.from({ length: fullDofCount }, (_, index) => index).filter(
    (index) => !pivotSet.has(index),
  );
  if (freeDofs.length > maximum) {
    throw memoryLimitExceeded(freeDofs.length, maximum, fullDofCount);
  }
  const rowByPivot = new Map(analysis.rows.map((row) => [row.pivotDof, row]));
  const canonicalById = new Map(canonical.map((equation) => [equation.sourceId, equation]));
  const expressions = new Map<number, PivotExpression>();
  let transformNonzeroCount = 0;
  for (let reduced = 0; reduced < freeDofs.length; reduced += 1) {
    expressions.set(freeDofs[reduced]!, { offset: 0, terms: new Map([[reduced, 1]]) });
    transformNonzeroCount += 1;
  }
  for (let index = pivotDofs.length - 1; index >= 0; index -= 1) {
    const pivotDof = pivotDofs[index]!;
    const reducedRow = rowByPivot.get(pivotDof)!;
    const offset = new WorkingScalar(reducedRow.rightHandSide);
    const accumulators = new Map<number, WorkingScalar>();
    for (const [dof, coefficient] of reducedRow.coefficients) {
      if (dof === pivotDof) continue;
      const dependency = expressions.get(dof);
      if (dependency === undefined) {
        throw new XFrameError(
          "CONSTRAINT_RANK_DEFICIENT",
          "Constraint elimination retained an unresolved pivot dependency.",
          {
            kind: "analysis",
            stage: "constraint-compilation",
            detail: `pivot=${pivotDof}, dependency=${dof}`,
            equation: pivotDof,
          },
        );
      }
      const multiplier = finiteNumber(
        -coefficient,
        `constraint-compilation.multiplier[${reducedRow.sourceId}][${dof}]`,
      );
      if (dependency.offset !== 0) {
        offset.add(
          finiteNumber(
            multiplier * dependency.offset,
            `constraint-compilation.offsetContribution[${reducedRow.sourceId}][${dof}]`,
          ),
        );
      }
      for (const [reducedDof, depCoefficient] of dependency.terms) {
        const contribution = finiteNumber(
          multiplier * depCoefficient,
          `constraint-compilation.termContribution[${reducedRow.sourceId}][${dof}][${reducedDof}]`,
        );
        if (contribution === 0) continue;
        let accumulator = accumulators.get(reducedDof);
        if (accumulator === undefined) {
          accumulator = new WorkingScalar(0);
          accumulators.set(reducedDof, accumulator);
        }
        accumulator.add(contribution);
      }
    }
    const orderedTerms: Array<[number, number]> = [];
    for (const [reducedDof, scalar] of accumulators) {
      const coefficient = scalar.total(
        `constraint-compilation.expression[${reducedRow.sourceId}][${pivotDof}]`,
      );
      if (coefficient !== 0) orderedTerms.push([reducedDof, coefficient]);
    }
    orderedTerms.sort(([left], [right]) => left - right);
    if (transformNonzeroCount + orderedTerms.length > maximum) {
      throw memoryLimitExceeded(transformNonzeroCount + orderedTerms.length, maximum, fullDofCount);
    }
    transformNonzeroCount += orderedTerms.length;
    expressions.set(pivotDof, {
      offset: offset.total(`constraint-compilation.offset[${reducedRow.sourceId}][${pivotDof}]`),
      terms: new Map(orderedTerms),
    });
  }
  const rows: SparseAffineTransformRow[] = Array.from({ length: fullDofCount });
  for (let full = 0; full < fullDofCount; full += 1) {
    const expression = expressions.get(full);
    if (expression === undefined) {
      throw new XFrameError(
        "CONSTRAINT_RANK_DEFICIENT",
        "Constraint elimination retained an unresolved pivot dependency.",
        {
          kind: "analysis",
          stage: "constraint-compilation",
          detail: `missing expression for dof ${full}`,
          equation: full,
        },
      );
    }
    rows[full] = Object.freeze({
      offset: expression.offset,
      terms: Object.freeze(
        [...expression.terms.entries()].map(([reducedDof, coefficient]) =>
          Object.freeze({ reducedDof, coefficient }),
        ),
      ),
    });
  }
  const frozenRows = Object.freeze(rows);
  const semanticViolation = findSemanticTransformViolation(equationsInput, rows);
  if (semanticViolation !== undefined) {
    const context: {
      kind: "analysis";
      stage: string;
      detail: string;
      entityId: string;
      violation: "constant" | "transform-column";
      normalizedResidual: number;
      tolerance: number;
      dof?: number;
    } = {
      kind: "analysis",
      stage: "constraint-semantic-validation",
      detail:
        "compiled affine transform violates an original constraint equation; the semantic problem would change",
      entityId: semanticViolation.sourceId,
      violation: semanticViolation.kind,
      normalizedResidual: semanticViolation.normalizedResidual,
      tolerance: semanticViolation.tolerance,
    };
    if (semanticViolation.reducedDof !== undefined) {
      context.dof = semanticViolation.reducedDof;
    }
    throw new XFrameError(
      "CONSTRAINT_SEMANTIC_VIOLATION",
      "Compiled affine constraint transform does not satisfy an original constraint equation.",
      context,
    );
  }
  return Object.freeze({
    fullDofCount,
    reducedDofCount: freeDofs.length,
    rows: frozenRows,
    freeDofs: Object.freeze(freeDofs),
    pivotDofs: Object.freeze(pivotDofs),
    equations: Object.freeze(analysis.rows.map((row) => canonicalById.get(row.sourceId)!)),
    redundantSourceIds: analysis.redundantSourceIds,
    transformNonzeroCount,
    recover(reducedDisplacements: ArrayLike<number>): Float64Array {
      if (reducedDisplacements.length !== freeDofs.length) {
        throw new XFrameError(
          "INPUT_INVALID",
          "Reduced displacement length does not match compiled constraints.",
          {
            kind: "input",
            path: "reducedDisplacements",
            expected: `array-like of length ${freeDofs.length}`,
            actual: `length ${reducedDisplacements.length}`,
          },
        );
      }
      const result = new Float64Array(fullDofCount);
      for (let full = 0; full < fullDofCount; full += 1) {
        const row = frozenRows[full]!;
        const value = new WorkingScalar(row.offset);
        for (const term of row.terms) {
          value.add(
            term.coefficient *
              finiteNumber(
                reducedDisplacements[term.reducedDof],
                `reducedDisplacements[${term.reducedDof}]`,
              ),
          );
        }
        result[full] = value.total(`fullDisplacements[${full}]`);
      }
      return result;
    },
  });
}

export function compileModelConstraints(
  records: readonly ConstraintRecord[],
  physicalDofs: PhysicalDofTable,
  options?: CompileConstraintOptions,
): CompiledConstraints {
  return compileConstraints(
    physicalDofs.size,
    records.map((record) => ({
      sourceId: record.id,
      terms: record.terms.map((term) => ({
        dof: physicalDofs.get(createDofKey(term.nodeId, term.dof))!.physicalIndex,
        coefficient: term.coefficient,
      })),
      rightHandSide: record.rightHandSide,
    })),
    options,
  );
}
