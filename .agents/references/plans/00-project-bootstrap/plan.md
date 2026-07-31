# Part 00: Project Bootstrap — Implementation Plan

> Execute this part locally using npm and Vitest. Do not use another package manager or test framework. Do not begin the next part until this plan is complete.

## Goal

Create a reproducible npm/TypeScript/Vitest/Oxfmt/Oxlint project foundation in a blank directory. No structural mathematics is implemented in this part.

## Prerequisites

None. This is the first part.

## Required reading

- `../../implementation-prompt.md`
- `../../technical-specification.md`
- `../../code-architecture.md`
- `../../project-roadmap.md`
- Assurance and architecture decisions created by earlier parts.

## Files owned by this part

- `package.json`
- `package-lock.json`
- `tsconfig.json`
- `tsconfig.build.json`
- `vitest.config.ts`
- `oxfmt.json`
- `oxlint.json`
- `src/index.ts`
- `test/unit/bootstrap.test.ts`
- `scripts/check-test-state.mjs`
- `scripts/check-forbidden-content.mjs`
- `scripts/check-doc-links.mjs`
- `AGENTS.md`
- `docs/assurance/toolchain.md`
- `docs/roadmap/progress.md`

## Interface contracts

- `src/index.ts` exports only a version/build-information constant in this part.
- All quality scripts exit `0` only on success and nonzero on violations.

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

### Task 1: Initialize npm and exact dependencies

- [x] **1.1** Run `npm init -y`.
- [x] **1.2** Set `type: module`, `private: true`, exact `packageManager`, and supported `engines`.
- [x] **1.3** Install exact versions of TypeScript, Vitest, coverage provider, Oxfmt, and Oxlint with `--save-dev --save-exact`.
- [x] **1.4** Record the installed toolchain in `docs/assurance/toolchain.md`. (The zero-runtime-dependencies requirement NFR-API-002 was removed 2026-07-31 by decision; the `dependencies` field stays absent as the natural consequence of a dev-only install.)

### Task 2: Create strict configuration

- [x] **2.1** Create the documented directories.
- [x] **2.2** Enable every required TypeScript strict option.
- [x] **2.3** Configure Vitest coverage thresholds: 95% statements/lines/functions and 90% branches.
- [x] **2.4** Configure Oxfmt and Oxlint without blanket suppressions.

### Task 3: Create executable quality scripts

- [x] **3.1** Add all scripts from the implementation prompt.
- [x] **3.2** Implement the test-state scanner for `.skip`, `.only`, and `.todo`.
- [x] **3.3** Implement forbidden-content and Markdown-link scans.
- [x] **3.4** Create a bootstrap Vitest test and confirm it first fails before creating the export.

### Task 4: Create agent and progress controls

- [x] **4.1** Write `AGENTS.md` with npm-only, Vitest-only, TDD, traceability, and no-silent-physics rules.
- [x] **4.2** Preserve `.agents/skills/ponytail` when supplied.
- [x] **4.3** Create progress rows for Parts 00–16.

### Task 5: Prove clean reproducibility

- [x] **5.1** Delete `node_modules`; run `npm ci`.
- [x] **5.2** Run `npm run check` and `npm run build` twice.
- [x] **5.3** Confirm `package-lock.json` is unchanged.
- [x] **5.4** Record exact tool versions.

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

- [x] Every public behavior has a requirement ID.
- [x] Every touched requirement has tests and evidence references.
- [x] Errors use stable structured codes and contexts.
- [x] Inputs and intermediate numerical boundaries reject non-finite values.
- [x] Untrusted identifiers are never stored in ordinary object prototypes.
- [x] Caller-owned mutable arrays/objects are not retained.
- [x] No dense global numerical allocation was introduced.
- [x] Browser-safe runtime boundaries remain intact.
- [x] Documentation describes only implemented behavior.
- [x] All required commands pass.

## Required evidence

Store command transcripts and version output in `docs/assurance/bootstrap-evidence.md`.

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

Two consecutive clean `npm ci && npm run check && npm run build` executions pass with an unchanged lockfile. (The zero-runtime-dependencies acceptance phrase was removed 2026-07-31 with requirement NFR-API-002; the lockfile stability check E-5.4 remains.)

## Completion checklist

- [x] Every task and review item is checked.
- [x] The acceptance statement is demonstrated by stored evidence.
- [x] `npm run check` passes.
- [x] Required benchmark/verification evidence is stored.
- [x] `docs/roadmap/progress.md` marks this part `complete`.
- [x] The next part's prerequisites are satisfied.

Notes on N/A and deferred items: this tooling-only part owns no spec FR/NFR requirement IDs; the version-constant public export receives its requirement-ID entry when Part 01 Task 1 builds the requirement registry. Review-checklist items on structured errors, non-finite rejection, prototype-safe identifiers, caller-owned storage, and dense allocation are N/A here (no numerical or input-handling code exists in this part) and are enforced from Part 02 onward. No benchmark is required because this part introduces no numerical performance.
