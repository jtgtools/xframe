import { finiteNumber } from "../geometry/finite.js";

/**
 * Deterministic Neumaier compensated sum over a multiset of finite values.
 * Ordering is ascending |value| with numeric tie-break, so every permutation
 * of the same multiset takes the identical numerical path and duplicate-DOF
 * aggregation is independent of user term order.
 */
export function compensatedCoefficientSum(values: readonly number[], path: string): number {
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
  return finiteNumber(sum + compensation, path);
}
