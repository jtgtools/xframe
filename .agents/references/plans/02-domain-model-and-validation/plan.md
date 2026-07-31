# Part 02: Domain Model and Validation — Implementation Plan

> Execute this part locally using npm and Vitest. Do not use another package manager or test framework. Do not begin the next part until this plan is complete.

## Goal

Implement stable structured errors, safe identifiers, transactional registries, immutable records, and the public model-builder skeleton.

## Prerequisites

Parts 00 through 01 are complete and `npm run lint`, `npm run typecheck`, `npm run test`, `npm run verify`, and `npm run build` passes.

## Required reading

- `../../implementation-prompt.md`
- `../../technical-specification.md`
- `../../code-architecture.md`
- `../../project-roadmap.md`
- Assurance and architecture decisions created by earlier parts.

## Files owned by this part

- `src/errors/error-code.ts`
- `src/errors/xframe-error.ts`
- `src/errors/error-context.ts`
- `src/model/identifier.ts`
- `src/model/registry.ts`
- `src/model/model-builder.ts`
- `src/model/domain-records.ts`
- `test/unit/errors.test.ts`
- `test/unit/identifier.test.ts`
- `test/unit/registry.test.ts`
- `test/unit/model-builder.test.ts`

## Interface contracts

- `parseIdentifier(value: unknown, path: string): EntityId`.
- `createModelBuilder(): ModelBuilder`.
- All add methods return the same builder and commit atomically.

## Mandatory execution discipline

- [x] Read this entire plan before changing files.
- [x] Mark this part `in-progress` in `docs/roadmap/progress.md`.
- [x] For each behavior, write a failing Vitest test and run it to prove the intended failure.
- [x] Implement the minimum mathematically correct behavior.
- [x] Per edit, run only what it touches (narrow test file, typecheck/lint/format on touched files); run `npm run check` once at part acceptance.
- [x] Never weaken a tolerance or expected result without written mathematical justification.
- [x] Never use `.skip`, `.only`, or `.todo`.
- [x] Never introduce silent restraints, arbitrary stiffness, swallowed errors, or unsupported implied behavior.

## Tasks

### Task 1: Implement structured errors

- [x] **1.1** Define stable error codes and a typed context union.
- [x] **1.2** Preserve optional cause without exposing unsafe objects.
- [x] **1.3** Test code/context stability and JSON-safe summaries.

### Task 2: Implement branded identifiers

- [x] **2.1** Define length, whitespace, Unicode normalization, and control-character rules.
- [x] **2.2** Test empty, whitespace, `__proto__`, `constructor`, `prototype`, `toString`, Unicode variants, formula-like prefixes, and excessive length.
- [x] **2.3** Use `Map`, never ordinary object dictionaries.

### Task 3: Implement deterministic registries

- [x] **3.1** Preserve insertion order and deterministic iteration.
- [x] **3.2** Detect duplicates with structured errors.
- [x] **3.3** Provide staged commit or snapshot rollback.

### Task 4: Define immutable records

- [x] **4.1** Create readonly node and placeholder domain contracts for later entity types.
- [x] **4.2** Copy caller arrays and objects.
- [x] **4.3** Test mutation attempts do not affect stored state.

### Task 5: Implement builder skeleton

- [x] **5.1** Add typed add methods and local shape validation.
- [x] **5.2** Defer cross-reference resolution to finalization.
- [x] **5.3** Test failed bulk/convenience operations leave identical prior state.

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

- [x] Every public behavior has a requirement ID.
- [x] Every touched requirement has tests.
- [x] Errors use stable structured codes and contexts.
- [x] Inputs and intermediate numerical boundaries reject non-finite values.
- [x] Untrusted identifiers are never stored in ordinary object prototypes.
- [x] Caller-owned mutable arrays/objects are not retained.
- [x] No dense global numerical allocation was introduced.
- [x] Browser-safe runtime boundaries remain intact.
- [x] Documentation describes only implemented behavior.
- [x] All required commands pass.

## Required evidence

Record public type snapshots and rollback-state comparisons in `docs/verification/domain-model-evidence.md`.

## Stop conditions

Stop and repair this part before proceeding if:

- a governing equation is not independently justified;
- a test passes only after unjustified tolerance expansion;
- model physics is silently changed for numerical convenience;
- an unsupported feature is exposed;

- formatting, linting, typing, tests, verification, build, or checks fail;
- this part contradicts an earlier accepted requirement without a documented decision.

## Completion acceptance

Identifiers are safe, errors are machine-readable, builder operations are transactional, registries deterministic, and caller-owned data cannot mutate stored records.

## Completion checklist

- [x] Every task and review item is checked.
- [x] The acceptance statement is demonstrated by stored evidence.
- [x] `npm run lint`, `npm run typecheck`, `npm run test`, `npm run verify`, and `npm run build` passes.
- [x] Required benchmark/verification evidence is stored.
- [x] `docs/roadmap/progress.md` marks this part `complete`.
- [x] The next part's prerequisites are satisfied.
