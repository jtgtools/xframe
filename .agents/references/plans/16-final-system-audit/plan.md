# Part 16: Final System Audit — Implementation Plan

> Execute this part locally using npm and Vitest. Do not use another package manager or test framework. Do not begin the next part until this plan is complete.

## Goal

Run a clean completion audit across installation, quality, numerical red-team cases, benchmarks, repository content, and factual reporting.

## Prerequisites

Parts 00 through 15 are complete and `npm run lint`, `npm run typecheck`, `npm run test`, `npm run verify`, and `npm run build` passes.

## Required reading

- `../../implementation-prompt.md`
- `../../technical-specification.md`
- `../../code-architecture.md`
- `../../project-roadmap.md`
- Architecture decisions created by earlier parts.

## Files owned by this part

- `docs/verification/final-audit.md`
- `docs/roadmap/progress.md`
- `docs/verification/verification-report.md`
- `docs/verification/benchmark-report.md`

## Interface contracts

- No new feature interfaces are introduced. This part audits and repairs the complete system.

## Mandatory execution discipline

- [ ] Read this entire plan before changing files.
- [ ] Mark this part `in-progress` in `docs/roadmap/progress.md`.
- [ ] For each behavior, write a failing Vitest test and run it to prove the intended failure.
- [ ] Implement the minimum mathematically correct behavior.
- [ ] Per edit, run only what it touches (narrow test file, typecheck/lint/format on touched files); run `npm run check` once at part acceptance.
- [ ] Never weaken a tolerance or expected result without written mathematical justification.
- [ ] Never use `.skip`, `.only`, or `.todo`.
- [ ] Never introduce silent restraints, arbitrary stiffness, swallowed errors, or unsupported implied behavior.

## Tasks

### Task 1: Clean installation

- [ ] **1.1** Remove `node_modules` and build output using documented platform-appropriate commands.
- [ ] **1.2** Run `npm ci`.
- [ ] **1.3** Confirm lockfile unchanged.
- [ ] **1.4** Run `npm run lint`, `npm run typecheck`, `npm run test`, `npm run verify`, and `npm run build`.

### Task 2: Benchmark audit

- [ ] **2.1** Run `npm run benchmark` twice.
- [ ] **2.2** Confirm deterministic equation/storage/model counts.
- [ ] **2.3** Investigate unexplained timing or memory changes.

### Task 3: Repository content audit

- [ ] **3.1** Scan TODO/FIXME/stubs, skipped/focused/todo tests, prohibited package managers, CSV input, predecessor names, scratch paths, caches, generated junk, and Node-only runtime imports.

### Task 4: Numerical red-team audit

- [ ] **4.1** Re-run mechanisms, near-singular pivots, extreme/mixed scales, 4,096 release masks, malformed JSON, hostile IDs, constraint contradictions, missing density, and Timoshenko member loads.
- [ ] **4.2** Perturb selected cases and confirm diagnostics respond.

### Task 5: Limitation closure

- [ ] **5.1** Require every limitation to be public.
- [ ] **5.2** Reject unsupported complete statuses.

### Task 6: Factual final report

- [ ] **6.1** Record exact versions, commands, tests, coverage, verification counts, release count, benchmark sizes/results, supported scope, exclusions, limitations, and failures.
- [ ] **6.2** Do not create an archive or claim formal certification.

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
npm run verify
npm run build
npm run coverage
npm run check
```

Run `npm run benchmark` when this part introduces or changes numerical performance.

## Review checklist

- [ ] Every public behavior has a requirement ID.
- [ ] Every touched requirement has tests.
- [ ] Errors use stable structured codes and contexts.
- [ ] Inputs and intermediate numerical boundaries reject non-finite values.
- [ ] Untrusted identifiers are never stored in ordinary object prototypes.
- [ ] Caller-owned mutable arrays/objects are not retained.
- [ ] No dense global numerical allocation was introduced.
- [ ] Browser-safe runtime boundaries remain intact.
- [ ] Documentation describes only implemented behavior.
- [ ] All required commands pass.

## Required evidence

`docs/verification/final-audit.md` contains command output references, defect log, repairs, and the final factual status.

## Stop conditions

Stop and repair this part before proceeding if:

- a governing equation is not independently justified;
- a test passes only after unjustified tolerance expansion;
- model physics is silently changed for numerical convenience;
- an unsupported feature is exposed;

- formatting, linting, typing, tests, verification, build, or checks fail;
- this part contradicts an earlier accepted requirement without a documented decision.

## Completion acceptance

Clean npm installation, complete checks, benchmarks, and red-team cases pass; remaining limitations are explicit; the repository is left clean and working.

## Completion checklist

- [ ] Every task and review item is checked.
- [ ] The acceptance statement is demonstrated by stored evidence.
- [ ] `npm run lint`, `npm run typecheck`, `npm run test`, `npm run verify`, and `npm run build` passes.
- [ ] Required benchmark/verification evidence is stored.
- [ ] `docs/roadmap/progress.md` marks this part `complete`.
- [ ] The next part's prerequisites are satisfied.
