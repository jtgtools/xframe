# Sparse Linear Algebra Verification Report

Date: 2026-07-31
Part: 07
Requirements: FR-SOL-001 through FR-SOL-007, FR-DIA-001

## Storage and ordering contracts

`SymmetricCoordinateBuilder` accepts zero-based lower- or upper-triangle contributions, normalizes them to the lower triangle, sorts coordinates by row/column, and combines duplicates with deterministic magnitude-ordered compensated summation. Exact zero totals are omitted. Inputs and vector operations reject invalid dimensions, invalid indices, and non-finite values.

`reverseCuthillMcKee` uses the convention `permutation[newIndex] = oldIndex`. Components start at the unvisited minimum-degree node with node index as the stable tie-break. Neighbor expansion uses degree then index. The inverse permutation maps original equations to reordered equations.

The hand matrix

```text
[4 1 0]
[1 3 1]
[0 1 2]
```

has identity-order skyline first columns `[0,0,1]`, row starts `[0,1,3,5]`, and values `[4,1,3,1,2]`.

## Factorization and pivot policy

The solver uses an in-place lower-skyline Cholesky factorization, followed by forward and reverse-row substitutions. Public right-hand sides and returned solutions use original equation order. Multiple right-hand sides reuse the same immutable factor.

A factorization pivot is normalized by the original diagonal coefficient for that reordered equation. A pivot fails with `FACTORIZATION_FAILED` when it is non-finite, non-positive, or its normalized value is at most `128 * Number.EPSILON = 2.842170943040401e-14`. This threshold covers bounded floating-point accumulation while refusing a numerically unresolved pivot; it does not add stiffness or alter the physical system.

The hand-system solution for RHS `[1,2,3]` is `[2/9,1/9,13/9]`. The maximum residual is below `1e-14`, and `x^T K x = 43/9`.

## Deterministic property verification

Seed `24701` generated 40 sparse strictly diagonally dominant symmetric positive-definite systems with 4–12 equations. Every generated exact solution was recovered with maximum component error below `2e-13` and normalized residual below `2e-13`.

## Memory guard

Skyline storage is estimated before `Float64Array` allocation. The estimate includes coefficient storage, first-column indices, and row starts. Unsafe or overflowed estimates fail with `MEMORY_LIMIT_EXCEEDED`. Production source is scanned for obvious `n*n` global allocations; the guard is green.

## Benchmark snapshot

Command: `npm run benchmark`
Runtime: Node.js v22.16.0
Synthetic matrix: sparse tridiagonal SPD; one RHS; RCM + skyline Cholesky.

| Equations | Stored coefficients | Assembly ms | Ordering ms | Profile ms | Factorization ms | Solve ms |
| --------: | ------------------: | ----------: | ----------: | ---------: | ---------------: | -------: |
|       500 |                 999 |       2.329 |       1.034 |      0.586 |            0.486 |    0.342 |
|     2,000 |               3,999 |       4.757 |       5.059 |      0.899 |            0.474 |    0.744 |
|     5,000 |               9,999 |       7.124 |       6.834 |      2.647 |            1.624 |    2.119 |

Timing is a local observation, not a pass/fail criterion. Equation counts, storage counts, pivot diagnostics, residuals, and solution checks are deterministic.

## Environment note

The repository remains pinned to Vitest, Oxfmt, and Oxlint. The execution container's npm mirror lacks the pinned Vitest packages, so tests run through the ignored sandbox compatibility harness established during the baseline. Native pinned-tool revalidation remains mandatory in Part 16.
