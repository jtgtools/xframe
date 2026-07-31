# Part 01: Requirements and Assurance Foundation — Implementation Plan

> Execute this part locally using npm and Vitest. Do not use another package manager or test framework. Do not begin the next part until this plan is complete.

## Goal

Convert the specification into machine-checkable requirements, risk controls, conventions, evidence ownership, and completion rules before numerical code begins.

## Prerequisites

Parts 00 through 00 are complete and `npm run check` passes.

## Required reading

- `../../implementation-prompt.md`
- `../../technical-specification.md`
- `../../code-architecture.md`
- `../../project-roadmap.md`
- Assurance and architecture decisions created by earlier parts.

## Files owned by this part

- `docs/assurance/requirements.md`
- `docs/assurance/traceability.json`
- `docs/assurance/risk-register.md`
- `docs/assurance/feature-matrix.md`
- `docs/assurance/definition-of-done.md`
- `docs/theory/numerical-conventions.md`
- `scripts/check-traceability.mjs`
- `test/unit/traceability-script.test.ts`

## Interface contracts

- Traceability JSON entries contain `id`, `statement`, `implementation`, `tests`, `evidence`, and `status`.
- Requirement status is one of `planned`, `implemented`, `verified`, `blocked`.

## Mandatory execution discipline

- [x] Read this entire plan before changing files.
- [x] Mark this part `in-progress` in `docs/roadmap/progress.md`.
- [x] Add/update requirement and traceability records before implementation.
- [x] For each behavior, write a failing Vitest test and run it to prove the intended failure.
- [x] Implement the minimum mathematically correct behavior.
- [x] Run the narrow test, affected suite, then complete checks.
- [x] Never weaken a tolerance or expected result without written mathematical justification.
- [x] Never use `.skip`, `.only`, or `.todo`.
- [x] Never introduce silent restraints, arbitrary stiffness, swallowed errors, or unsupported implied behavior.
- [x] Record evidence before marking the part complete.

## Tasks

### Task 1: Create requirement registry

- [x] **1.1** Copy every FR/NFR identifier from the technical specification.
- [x] **1.2** Add owner module, intended tests, evidence type, status, and review note.
- [x] **1.3** Reject duplicate or unknown IDs in a Vitest-tested script.

### Task 2: Create support matrix

- [x] **2.1** Classify every feature as supported, planned, or explicitly unsupported.
- [x] **2.2** Add a check preventing public exposure of unsupported features.

### Task 3: Define numerical conventions

- [x] **3.1** Document axes, signs, rotations, unit policy, finite boundaries, residual/pivot scaling, tolerance categories, and negative-zero policy.
- [x] **3.2** Ban one universal epsilon.

### Task 4: Create risk register

- [x] **4.1** Cover silent mechanisms, theory/load mismatch, releases, offsets, constraints, identifiers, JSON, non-finite propagation, memory, reuse, and overclaiming.
- [x] **4.2** Assign severity, likelihood, prevention, detection, and required evidence.

### Task 5: Enforce assurance completion

- [x] **5.1** Implement `check-traceability.mjs`.
- [x] **5.2** Add it to `npm run check`.
- [x] **5.3** Test missing evidence, duplicate IDs, invalid statuses, and unsupported exposed features.

## Required command sequence

During development, run the narrowest relevant Vitest file, for example:

```bash
npx vitest run path/to/test-file.test.ts
```

Before completion, run:

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run coverage
npm run verify
npm run build
npm run check
```

Run `npm run benchmark` when this part introduces or changes numerical performance.

## Review checklist

- [x] Every public behavior has a requirement ID. (Gate scripts tested under NFR-DOC-001, NFR-COR-002.)
- [x] Every touched requirement has tests and evidence references. (NFR-DOC-001 now `implemented` with `test/unit/traceability-script.test.ts` and evidence file references.)
- [x] Errors use stable structured codes and contexts. (N/A: no public API in this part; gate scripts use stable messages and exit 0/1.)
- [x] Inputs and intermediate numerical boundaries reject non-finite values. (N/A: no numerical code in this part.)
- [x] Untrusted identifiers are never stored in ordinary object prototypes. (Validators use `Set`/arrays only.)
- [x] Caller-owned mutable arrays/objects are not retained. (N/A: this part owns no API state.)
- [x] No dense global numerical allocation was introduced. (N/A: this part adds no numerical code.)
- [x] Browser-safe runtime boundaries remain intact. (Runtime `src/` untouched; new logic lives in Node-only scripts.)
- [x] Documentation describes only implemented behavior. (definition-of-done.md describes the existing gate.)
- [x] All required commands pass. (Full `npm run check` exit 0, evidence E-7.)

## Required evidence

`docs/assurance/requirements-baseline-evidence.md` records the requirement count, risk count, and traceability-check output.

Every evidence record must include exact command, environment versions, input/model identifier, expected basis, tolerance, actual result, pass/fail, and investigation notes for failures.

## Stop conditions

Stop and repair this part before proceeding if:

- a governing equation is not independently justified;
- a test passes only after unjustified tolerance expansion;
- model physics is silently changed for numerical convenience;
- an unsupported feature is exposed;
- traceability is incomplete;
- formatting, linting, typing, tests, verification, build, or checks fail;
- this part contradicts an earlier accepted requirement without a documented decision.

## Completion acceptance

Every requirement and risk has a unique ID, owner, planned test, evidence class, and machine-validated record.

## Completion checklist

- [x] Every task and review item is checked.
- [x] The acceptance statement is demonstrated by stored evidence. (`docs/assurance/requirements-baseline-evidence.md` records E-1..E-7.)
- [x] `npm run check` passes. (E-7, exit 0.)
- [x] Required benchmark/verification evidence is stored. (N/A: no numerical behavior in this part; no benchmark needed.)
- [x] `docs/roadmap/progress.md` marks this part `complete`.
- [x] The next part's prerequisites are satisfied. (Part 02 domain model and validation can start; plan prerequisites met.)
