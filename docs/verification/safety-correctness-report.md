# Safety-Correctness Remediation Verification Report

Date: 2026-08-08

## Scope and evidence boundary

This report records the approved safety-correctness remediation evidence without changing the execution counts in earlier verification reports. The implementation commits establish SHA-256 structural identity, strict envelope compatibility, eccentric-truss rigid-offset mechanics, endpoint-sided frame actions, exact polynomial frame-force results, result schema version two, and external-oracle verification.

| Area                                             | Commits                                               |
| ------------------------------------------------ | ----------------------------------------------------- |
| SHA-256 model identity                           | `a9dd072`, `e13a86a`, `2075396`                       |
| Strict envelope compatibility                    | `72ea2b6`, `156c738`, `e5696df`, `b05bbcc`, `338562b` |
| Eccentric-truss mechanics                        | `569e7e1`, `83382cf`, `987b3b7`                       |
| Endpoint-sided and polynomial frame forces       | `91fff06`, `5ccc0d7`, `86a4f5f`                       |
| Result schema and coefficient-first combinations | `5143151`, `4679dba`, `4e85036`, `5c56930`            |
| External reference evidence                      | `f3a0d57`, `2a95e9f`, `ab1f81b`                       |

## Current public contract

- Finalized models and structural results use `sha256:<64 lowercase hexadecimal digits>` fingerprints derived synchronously from canonical UTF-8 structural JSON.
- Model JSON remains schema version `1`; result JSON is schema version `2`. `parseResultJson` rejects result schema version `1` with `SCHEMA_UNSUPPORTED`.
- `streamEnvelope(records, components)` requires compatibility metadata on every record. `createEnvelopeCompatibility(result, components)` creates that metadata from a result and the ordered component layout. Missing, mismatched, or bare legacy metadata fails with `RESULT_INCOMPATIBLE`.
- A nonzero truss rigid offset makes reference-node rotations physical DOFs. The truss uses `delta = B q` and `K = (EA/L) B^T B`; reference actions include rigid-arm moments and self-weight uses the same work-conjugate transform. Results retain six `globalEndForces` elastic-end components and add twelve `globalReferenceEndForces` reference-node force/moment components.
- Frame results retain fixed cubic coefficient arrays `[c0, c1, c2, c3]` in local `xi = x - start`, derive stations at analytical derivative roots and endpoint sides, and combine coefficients before deriving combination stations.

## Recorded Task 12 external-oracle evidence

The following commands, identities, tolerances, and outputs were recorded by the completed Task 12 report on 2026-08-08. They are reproduced here as evidence references; no new external-oracle count is claimed by this documentation task.

### OpenSees eccentric-truss oracle

- Oracle: OpenSees 3.8.0, commit `6e55293513192aa05c7e1205e66a5a1a1ed088c4`.
- Executable: `D:\DEV\tools\OpenSees3.8.0\bin\OpenSees.exe`.
- Executable SHA-256: `5aa4e9c80c410c510ca62ac3b2f1d64a8e50679f0238e140b5bebcd6d5ddbe6d`.
- Tcl input SHA-256: `8e05f8d9c20ffe09b738f7fb683ad6d34ecbc73fbd4f66e8e642e532d0cfc3dc`.
- Recorded command: `$env:OPENSEES_BIN = 'D:\DEV\tools\OpenSees3.8.0\bin\OpenSees.exe'; npm run verify:opensees`.
- Comparison tolerance: `1e-12 * (1 + max(abs(actual), abs(expected)))` for each of `thetaA`, `thetaB`, and `axialForceMagnitude`.
- Recorded raw output: `XFRAME thetaA              0.66666666666666662966 thetaB              0.33333333333333331483 axialForceMagnitude 333.3333333333333`.
- Committed expected values: `thetaA = 0.6666666666666666`, `thetaB = 0.3333333333333333`, and `axialForceMagnitude = 333.3333333333333`.
- Recorded verifier output: `OpenSees references verified non-destructively: 5 datasets.`

### OpenSees building-frame oracles (OpenSees-only suite)

- Oracle: OpenSees 3.8.0, commit `6e55293513192aa05c7e1205e66a5a1a1ed088c4`, native Tcl binary via `OPENSEES_BIN` (no openseespy).
- Executable SHA-256: `5aa4e9c80c410c510ca62ac3b2f1d64a8e50679f0238e140b5bebcd6d5ddbe6d`.
- Datasets: `cantilever-euler`, `portal-frame`, `two-story-two-bay`, `triangular-truss` (plus `eccentric-truss` above).
- Tcl inputs: `verification/reference-data/opensees/*.tcl`; references: `verification/reference-data/opensees/*-reference.json`.
- Regeneration: `npm run regenerate:opensees` (Node-generated Tcl inputs allowed; reference results mirror the committed xframe models for the same nodal-load cases).
- Non-destructive verification: `$env:OPENSEES_BIN = 'D:\DEV\tools\OpenSees3.8.0\bin\OpenSees.exe'; npm run verify:opensees`.
- Building tolerances: relative `1e-6`, absolute `1e-9` (reactions `1e-6` absolute noise floor for free-DOF residuals). Committed references are measured OpenSees output; `verify:opensees` numerically re-compares every dataset, and the vitest oracles apply the documented 180-degree roll map only to vertical-member local forces.
- Recorded verifier output: `OpenSees references verified non-destructively: 5 datasets.`
- Linux re-execution through Wine against the official distribution reproduced all five datasets and the eccentric-truss raw line byte-for-byte.

## Documentation-contract command evidence

The Task 13 RED command was:

```text
npx vitest run test/specification/documentation.test.ts test/specification/release-readiness.test.ts
```

The initial sandboxed invocation stopped before Vitest loaded because Vite's dependency externalization reported `spawn EPERM`. After the Windows child-process sandbox was bypassed, the RED run reported `2 test files failed; 2 failed and 9 passed.` The failures were the absent current safety-contract phrases and the absent safety-correctness report. The GREEN rerun reported `2 test files passed; 11 tests passed.`

The scoped Task 13 Markdown check was:

```text
npx oxfmt --check README.md docs/api/json-input.md docs/api/public-api.md docs/architecture/system-architecture.md docs/engineering-use.md docs/roadmap/progress.md docs/theory/numerical-conventions.md docs/theory/solution-and-results.md docs/theory/structural-model.md docs/verification/finalization-report.md docs/verification/json-api-report.md docs/verification/result-diagnostics-report.md docs/verification/safety-correctness-report.md docs/verification/truss-spring-offset-report.md docs/verification/verification-report.md
```

It reported `All matched files use the correct format.` for 15 paths. The required repository-wide command `npx oxfmt --check README.md docs` still reports these eight unchanged baseline files: `docs/superpowers/plans/2026-07-31-complete-xframe.md`, `docs/verification/analysis-integration-report.md`, `docs/verification/benchmark-report.md`, `docs/verification/geometry-report.md`, `docs/verification/linalg-report.md`, `docs/verification/material-section-report.md`, `docs/verification/requested-validation-report.md`, and `docs/verification/requested-validation-requirements.md`. Those pre-existing formatting failures are deferred to the approved Task 14 gate-blocker repair; this Task 13 report does not claim that repository-wide command passed.
