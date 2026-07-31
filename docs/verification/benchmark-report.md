# Sparse Benchmark Report

## Purpose

The benchmark checks sparse storage growth, deterministic model/equation counts, reusable factorization, numerical residuals, and the absence of dense global allocation. It is not a cross-machine speed ranking.

Raw output is stored in `docs/verification/benchmark-results.json`. The deterministic model is a one-DOF spring chain with one grounded spring, `N-1` two-node springs, and two proportional load cases.

```bash
XFRAME_BENCH_10000=1 npm run benchmark
```

## Recorded environment

- Node.js: `v22.16.0`
- Platform: `linux x64`
- Recorded: 2026-07-31

## Determinism audit

The benchmark was run twice through 10,000 equations. After removing the intentionally environment-sensitive timing fields, the two JSON records were byte-identical. Equation counts, coordinate nonzeros, skyline storage, estimated bytes, factorization reuse, displacements, load-scaling ratio, residuals, and normalized pivots were unchanged.

## Results

| Equations | Coordinate nonzeros | Skyline coefficients | Estimated sparse working bytes | Normalized residual | Load scaling | Minimum normalized pivot |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 500 | 999 | 999 | 51,968 | `1.705e-13` | 2 | `0.4997501` |
| 2,000 | 3,999 | 3,999 | 207,968 | `6.821e-13` | 2 | `0.4997501` |
| 5,000 | 9,999 | 9,999 | 519,968 | `2.728e-12` | 2 | `0.4997501` |
| 10,000 | 19,999 | 19,999 | 1,039,968 | `7.276e-12` | 2 | `0.4997501` |

For this tridiagonal chain, coordinate and skyline storage are exactly `2N-1`. Assembly and factorization counters remain one while the solve counter becomes two.

## Recorded 10,000-equation timing

The retained second-run timings are environment-specific evidence only:

- topology: 109.096 ms
- assembly: 148.289 ms
- RCM ordering: 9.528 ms
- skyline profile: 1.962 ms
- factorization: 1.587 ms
- direct solve: 0.717 ms
- direct recovery: 1.808 ms
- preparation: 138.641 ms
- first complete case: 2743.468 ms
- reused second case: 2689.706 ms

Timing variation between the two runs was expected and was not used as a pass/fail signal.

## Dense-allocation guard

`scripts/check-no-dense-global.mjs` and `test/regression/no-dense-global-allocation.test.ts` reject obvious dense global allocations. The final audit result was:

```text
Dense global allocation guard: pass
```

Skyline allocation is preflighted against `skylineMemoryLimitBytes` with overflow-safe arithmetic and a structured `MEMORY_LIMIT_EXCEEDED` error.
