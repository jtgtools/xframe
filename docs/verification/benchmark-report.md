# Sparse Benchmark Report

## Purpose

The benchmark checks sparse storage growth, deterministic model/equation counts, reusable factorization, numerical residuals, and the absence of dense global allocation on real building structures. It is not a cross-machine speed ranking. The old one-DOF spring chain was retired as an absurd proxy: it exercised only tridiagonal bandwidth 2 and proved nothing about coupled 6-DOF frames.

Raw output is stored in `docs/verification/benchmark-results.json`. The deterministic suite is real buildings with 6-DOF steel moment frames (2/5/10/15 stories) plus a concrete tower-grid floor on soil springs with a rigid diaphragm, each with two proportional lateral load cases.

```bash
npm run benchmark
```

## Recorded environment

- Node.js: `v24.20.0`
- Platform: `linux x64`
- Recorded: 2026-09-18

## Determinism audit

The benchmark was run twice over the building suite. After removing the intentionally environment-sensitive timing fields, the two JSON records were byte-identical. Equation counts, coordinate nonzeros, skyline storage, estimated bytes, factorization reuse, displacements, load-scaling ratio, and residuals were unchanged.

## Results

| Scenario       | Stories | Bays | Equations | Coordinate nonzeros | Skyline coefficients | Estimated sparse working bytes | Normalized residual | Load scaling |
| -------------- | ------: | ---: | --------: | ------------------: | -------------------: | -----------------------------: | ------------------: | -----------: |
| 2-story-2-bay  |       2 |    2 |        54 |                 174 |                  204 |                          7,968 |         `2.970e-13` |            2 |
| 5-story-3-bay  |       5 |    3 |       144 |                 530 |                1,370 |                         29,440 |         `1.054e-12` |            2 |
| 10-story-4-bay |      10 |    4 |       330 |               1,290 |                4,458 |                         79,824 |         `1.469e-11` |            2 |
| 15-story-4-bay |      15 |    4 |       480 |               1,910 |                6,958 |                        120,704 |         `2.626e-11` |            2 |
| tower-grid     |       1 |    2 |        72 |                 230 |                  255 |                         10,440 |         `9.769e-13` |            2 |

For coupled 6-DOF frames, coordinate nonzeros exceed `2N` and skyline bandwidth reaches 9–20 (tower-grid 13), unlike the retired `2N-1` chain. Assembly and factorization counters remain one while the solve counter becomes two. Minimum normalized pivots remain covered by `test/unit/skyline-cholesky.test.ts` and `test/unit/diagnostics.test.ts`.

## Recorded 15-story timing

The retained second-run timings are environment-specific evidence only.
The benchmark exercises only the public package entry, so per-stage
assembly, ordering, profile, factorization, solve, and recovery timings
are no longer recorded separately:

- topology: 7.216 ms
- preparation: 18.673 ms
- first complete case: 12.623 ms
- reused second case: 16.026 ms

Timing variation between the two runs was expected and was not used as a pass/fail signal.

## Dense-allocation guard

`test/regression/no-dense-global-allocation.test.ts` rejects obvious dense global allocations. The final audit result was:

```text
Dense global allocation guard: pass
```

Skyline allocation is preflighted against `skylineMemoryLimitBytes` with overflow-safe arithmetic and a structured `MEMORY_LIMIT_EXCEEDED` error.
