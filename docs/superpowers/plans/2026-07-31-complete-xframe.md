# Complete XFrame Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Parts 02–16 of XFrame as a complete deterministic TypeScript linear-static 3D frame, truss, and spring analysis engine, with independent analytical verification and reproducible Frame3DD comparisons.

**Architecture:** Follow `.agents/references/code-architecture.md` strictly: validated mutable construction produces an immutable finalized model; deterministic physical DOF topology and sparse affine reduction feed coordinate assembly, RCM ordering, skyline Cholesky factorization, multi-case solves, result recovery, combinations, envelopes, serialization, and diagnostics. Runtime code remains browser-safe; Node-only code is restricted to scripts and test/verification harnesses. Frame3DD is an external oracle only and is never imported, copied, linked, or used as implementation source.

**Tech Stack:** TypeScript 5.9 ESM, Node.js 22+, npm 11, Vitest 4, Oxfmt, Oxlint, browser-safe runtime modules, external Frame3DD 20140514+ executable for optional verification.

## Global Constraints

- npm only; never Bun, pnpm, Yarn, Jest, or the Node built-in test runner.
- Strict TDD: each behavior begins with a failing Vitest test whose title contains its requirement ID.
- No dense global stiffness, constraint, transformation, or mass-like matrix.
- No hidden restraints, arbitrary stiffness, epsilon stabilization, swallowed errors, or silent approximations.
- Public inputs and numerical boundaries reject non-finite values with stable structured error codes.
- Untrusted identifiers and JSON never use ordinary object prototypes as registries.
- Runtime modules contain no Node-only imports and work in Node and modern browsers.
- Coverage gates remain 95% statements, lines, and functions; 90% branches.
- Every numerical tolerance is named, scale-aware, and justified in verification documentation.
- Filenames are lowercase kebab-case except the repository-approved exceptions in `AGENTS.md`.
- Frame3DD remains external. The repository stores only xframe-authored cases, parsers, comparison records, hashes, and reports.

## File Structure

The detailed owned-file maps and interfaces are authoritative in `.agents/references/plans/02-*` through `.agents/references/plans/16-*`. The implementation must preserve these responsibility boundaries:

- `src/errors`, `src/units`, `src/geometry`, `src/materials`, `src/sections`: validated domain primitives.
- `src/model`, `src/loads`, `src/constraints`: model construction, finalization, load graph, and sparse affine equations.
- `src/elements`: frame, truss, spring, releases, member-load, and rigid-offset kernels.
- `src/linalg`: coordinate assembly, adjacency, RCM, skyline/profile storage, Cholesky, residuals, and memory guards.
- `src/analysis`: preparation, assembly, factorization reuse, solving, reactions, and element recovery.
- `src/results`: immutable results, diagnostics, internal-force reconstruction, combinations, and streaming envelopes.
- `src/serialization`: complete versioned JSON parsing, canonical serialization, and artifact hashing.
- `verification`, `scripts`, and `docs/verification`: independent oracles, Frame3DD harness, benchmark raw data, and factual reports.

---

### Task 1: Preserve and verify the baseline

**Files:**

- Modify: `docs/roadmap/progress.md`
- Create: `docs/superpowers/plans/2026-07-31-complete-xframe.md`

**Interfaces:**

- Consumes: committed Parts 00–01 repository foundation.
- Produces: clean dependency installation and passing baseline quality commands.

- [ ] Run `npm ci` (blocked in this container: the internal mirror lacks pinned Vitest tarballs and public npm DNS is unavailable).
- [x] Run `npm run lint`, `npm run typecheck`, `npm run test`, `npm run verify`, and `npm run build` through an ignored sandbox-only compatibility harness; retain native-tool revalidation for Part 16.
- [x] Record actual runtime versions, package-mirror limitation, and fallback verification status.
- [x] Commit the orchestration plan before production changes.

### Task 2: Part 02 — domain model and validation

**Plan:** `.agents/references/plans/02-domain-model-and-validation/plan.md`

- [x] Execute every TDD task, review item, evidence item, and completion gate in the part plan.
- [x] Run the part acceptance command sequence.
- [x] Mark Part 02 complete and commit.

### Task 3: Part 03 — units, geometry, and coordinate systems

**Plan:** `.agents/references/plans/03-units-geometry-and-coordinate-systems/plan.md`

- [x] Execute every TDD task, including deterministic local axes, scale-aware tolerance utilities, rigid-offset virtual-work checks, and geometry evidence.
- [x] Run the part acceptance command sequence.
- [x] Mark Part 03 complete and commit.

### Task 4: Parts 04–06 — physical records, topology, loads, and combinations

**Plans:**

- `.agents/references/plans/04-materials-sections-and-elements/plan.md`
- `.agents/references/plans/05-dof-topology-and-model-finalization/plan.md`
- `.agents/references/plans/06-loads-cases-and-combinations/plan.md`

- [x] Complete Part 04 and its acceptance gate; commit.
- [x] Complete Part 05 and its mechanism/topology regressions; commit.
- [x] Complete Part 06 and its result-ID, self-weight, provenance, and cycle checks; commit.

### Task 5: Parts 07–08 — sparse algebra and affine constraints

**Plans:**

- `.agents/references/plans/07-sparse-linear-algebra/plan.md`
- `.agents/references/plans/08-affine-constraint-compiler/plan.md`

- [ ] Implement deterministic coordinate assembly, RCM, skyline storage, Cholesky, residuals, memory guards, and reusable multiple-RHS solves.
- [ ] Implement sparse affine canonicalization, block/rank diagnostics, reduction, full-state recovery, and constraint reactions.
- [ ] Complete both part gates and commit each part independently.

### Task 6: Parts 09–10 — element formulations

**Plans:**

- `.agents/references/plans/09-frame-formulations-loads-and-releases/plan.md`
- `.agents/references/plans/10-trusses-springs-and-rigid-offsets/plan.md`

- [ ] Write governing theory documents before frame and rigid-offset code.
- [ ] Implement Euler-Bernoulli and Timoshenko 3D frame stiffness and theory-consistent point/uniform/linear/partial member loads.
- [ ] Implement exact release condensation and classify all 4,096 release masks.
- [ ] Implement truss, ground spring, two-node spring, and rigid-offset kernels with energy/equilibrium checks.
- [ ] Complete both part gates and commit each part independently.

### Task 7: Part 11 — integrated preparation, assembly, factorization, and solves

**Plan:** `.agents/references/plans/11-assembly-factorization-and-solves/plan.md`

- [ ] Integrate topology, constraints, element kernels, sparse assembly, ordering, factorization, load-case solve, reaction recovery, cache keys, and reuse.
- [ ] Verify mechanisms fail closed with physical pivot/equation context.
- [ ] Complete the part gate and commit.

### Task 8: Part 12 — results, diagnostics, combinations, and envelopes

**Plan:** `.agents/references/plans/12-results-diagnostics-and-envelopes/plan.md`

- [ ] Implement immutable typed case results and diagnostics.
- [ ] Implement frame internal-force sampling with explicit discontinuities.
- [ ] Implement compatible superposition and bounded streaming envelopes with complete provenance.
- [ ] Complete the part gate and commit.

### Task 9: Part 13 — JSON and public API

**Plan:** `.agents/references/plans/13-json-serialization-and-public-api/plan.md`

- [ ] Freeze intentional public exports.
- [ ] Implement complete model/result JSON validation, canonical serialization, schema compatibility, artifact hashing, and runtime-import guard.
- [ ] Confirm CSV model input does not exist.
- [ ] Complete the part gate and commit.

### Task 10: Frame3DD oracle harness

**Files:**

- Create: `scripts/frame3dd/run-frame3dd.ts`
- Create: `scripts/frame3dd/parse-frame3dd-output.ts`
- Create: `scripts/frame3dd/write-frame3dd-case.ts`
- Create: `scripts/frame3dd/compare-frame3dd.ts`
- Create: `verification/external/frame3dd-reference.test.ts`
- Create: `verification/reference-data/frame3dd/*.json`
- Create: `docs/verification/frame3dd-comparison.md`
- Modify: `package.json`
- Modify: `.gitignore`

**Interfaces:**

- Consumes: `FRAME3DD_BIN`, xframe-authored benchmark models, xframe finalized models/results.
- Produces: deterministic `.3dd` inputs, raw Frame3DD outputs outside tracked source, parsed reference JSON, scalar comparison records, and timing summaries.

- [ ] Write failing parser tests against small hand-authored Frame3DD output fragments.
- [ ] Implement a strict parser for version, joint displacements, reactions, and local member end forces.
- [ ] Write failing `.3dd` writer tests for deterministic ordering and supported overlapping scope.
- [ ] Implement a writer limited to Frame3DD-compatible xframe cases; reject unsupported xframe features explicitly.
- [ ] Implement process execution using `FRAME3DD_BIN`, a temporary output directory, timeout, exit-code capture, stdout/stderr capture, SHA-256 hashing, and no shell interpolation.
- [ ] Implement comparisons with separate force, moment, translation, rotation, and relative tolerances; record both computed values and normalized errors.
- [ ] Add at least axial truss, 2D cantilever, simply supported beam, 2D portal, 3D space frame, nodal moment, uniform load, trapezoidal load, support settlement, and mixed-load cases.
- [ ] Retain raw inputs/outputs as generated artifacts, not committed third-party files; commit parsed xframe-authored reference records and provenance.
- [ ] Add `npm run verify:frame3dd` that skips with an explicit message only when `FRAME3DD_BIN` is absent, while the final audit sets the variable and requires all cases to pass.
- [ ] Document Frame3DD version `20140514+`, executable SHA-256, runtime details, case mapping, sign/axis conversions, exclusions, and tolerances.

### Task 11: Part 14 — independent verification, property tests, and sparse benchmarks

**Plan:** `.agents/references/plans/14-verification-property-tests-and-benchmarks/plan.md`

- [ ] Build at least twelve independent named cases and at least one hundred finite scalar comparisons.
- [ ] Add deterministic metamorphic and adversarial tests.
- [ ] Run Frame3DD comparisons using the supplied binary and include them in the verification report.
- [ ] Benchmark approximately 500, 2,000, 5,000, and conditionally 10,000 reduced equations.
- [ ] Record topology, assembly, ordering, factorization, solve, recovery, storage, memory estimate, RHS count, and reuse data.
- [ ] Separate numerical agreement from timing; timing noise cannot hide a numerical failure.
- [ ] Run the dense-global guard and close meaningful coverage gaps.
- [ ] Complete the part gate and commit.

### Task 12: Part 15 — documentation and assurance

**Plan:** `.agents/references/plans/15-documentation-and-assurance-case/plan.md`

- [ ] Replace guidance-package README content with implemented-engine usage, supported scope, examples, and limitations.
- [ ] Complete API, JSON, theory, architecture, engineering-use, security, verification, and benchmark documentation.
- [ ] State that the engine is not formally certified and requires professional validation for engineering use.
- [ ] Complete the part gate and commit.

### Task 13: Part 16 — final system audit

**Plan:** `.agents/references/plans/16-final-system-audit/plan.md`

- [ ] Perform a clean `npm ci` audit.
- [ ] Run formatting, linting, type checking, unit/integration/property/verification tests, coverage, build, runtime-import guard, dense-global guard, sparse benchmarks, and Frame3DD verification.
- [ ] Run repository placeholder, disabled-test, forbidden-content, and documentation-link scans.
- [ ] Red-team mechanisms, releases, constraints, offsets, mixed scales, malformed JSON, and memory guards.
- [ ] Record exact factual results in `docs/verification/final-audit.md` and mark all parts complete only when supported by raw evidence.
- [ ] Commit the final audit.

### Task 14: Deliverable preparation

**Files:**

- Create outside repository: `/mnt/data/xframe-complete.zip`

- [ ] Confirm `git status --short` is clean.
- [ ] Confirm the archive excludes `.git`, `node_modules`, `dist`, `coverage`, temporary Frame3DD outputs, and local benchmark caches.
- [ ] Create the source archive and verify its contents and SHA-256 hash.
- [ ] Provide the archive plus concise verification and benchmark results.
