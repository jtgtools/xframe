import { XFrameError } from "../errors/xframe-error.js";
import { finiteNumber } from "../geometry/finite.js";
import { compareIdentifiers } from "../model/identifier.js";
import type { ConstraintRecord } from "../model/domain-records.js";
import { createDofKey } from "../model/dof-key.js";
import type { PhysicalDofTable } from "../model/dof-topology.js";
import type { AffineConstraintEquation, CanonicalAffineConstraint } from "./affine-equation.js";
import { canonicalizeConstraint } from "./canonicalize-constraint.js";
import { analyzeConstraintRank } from "./constraint-rank.js";

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
  const analysis = analyzeConstraintRank(canonical);
  const pivotDofs = analysis.rows.map(({ pivotDof }) => pivotDof);
  const pivotSet = new Set(pivotDofs);
  const freeDofs = Array.from({ length: fullDofCount }, (_, index) => index).filter(
    (index) => !pivotSet.has(index),
  );
  const reducedByFull = new Map(freeDofs.map((full, reduced) => [full, reduced]));
  const rowByPivot = new Map(analysis.rows.map((row) => [row.pivotDof, row]));
  const rows: SparseAffineTransformRow[] = [];
  let transformNonzeroCount = 0;
  for (let full = 0; full < fullDofCount; full += 1) {
    const reduced = reducedByFull.get(full);
    if (reduced !== undefined) {
      rows.push(
        Object.freeze({
          offset: 0,
          terms: Object.freeze([Object.freeze({ reducedDof: reduced, coefficient: 1 })]),
        }),
      );
      transformNonzeroCount += 1;
      continue;
    }
    const reducedRow = rowByPivot.get(full)!;
    const terms: SparseTransformTerm[] = [];
    for (const [dof, coefficient] of reducedRow.coefficients) {
      if (dof === full) continue;
      const reducedDof = reducedByFull.get(dof);
      if (reducedDof === undefined) {
        throw new XFrameError(
          "CONSTRAINT_RANK_DEFICIENT",
          "Constraint elimination retained an unresolved pivot dependency.",
          {
            kind: "analysis",
            stage: "constraint-compilation",
            detail: `pivot=${full}, dependency=${dof}`,
            equation: full,
          },
        );
      }
      const value = -coefficient;
      if (value !== 0) terms.push(Object.freeze({ reducedDof, coefficient: value }));
    }
    const orderedTerms = terms.toSorted((left, right) => left.reducedDof - right.reducedDof);
    transformNonzeroCount += orderedTerms.length;
    rows.push(
      Object.freeze({ offset: reducedRow.rightHandSide, terms: Object.freeze(orderedTerms) }),
    );
  }
  const maximum = options.maximumTransformNonzeros ?? 10_000_000;
  if (!Number.isSafeInteger(maximum) || maximum < 0 || transformNonzeroCount > maximum) {
    throw new XFrameError(
      "MEMORY_LIMIT_EXCEEDED",
      "Sparse constraint transform exceeds the configured storage limit.",
      {
        kind: "memory",
        operation: "constraint-transform",
        estimatedBytes: transformNonzeroCount * 16 + fullDofCount * 24,
        limitBytes: Math.max(0, maximum) * 16 + fullDofCount * 24,
      },
    );
  }
  const frozenRows = Object.freeze(rows);
  return Object.freeze({
    fullDofCount,
    reducedDofCount: freeDofs.length,
    rows: frozenRows,
    freeDofs: Object.freeze(freeDofs),
    pivotDofs: Object.freeze(pivotDofs),
    equations: Object.freeze(
      analysis.rows.map((row) => canonical.find(({ sourceId }) => sourceId === row.sourceId)!),
    ),
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
        let value = row.offset;
        for (const term of row.terms)
          value +=
            term.coefficient *
            finiteNumber(
              reducedDisplacements[term.reducedDof],
              `reducedDisplacements[${term.reducedDof}]`,
            );
        result[full] = finiteNumber(value, `fullDisplacements[${full}]`);
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
