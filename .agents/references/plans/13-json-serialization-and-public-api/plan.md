# Part 13: JSON Serialization and Public API — Implementation Plan

> Execute this part locally using npm and Vitest. Do not use another package manager or test framework. Do not begin the next part until this plan is complete.

## Goal

Freeze intentional public exports and implement complete versioned JSON model/result validation and canonical serialization. CSV model input remains prohibited.

## Prerequisites

Parts 00 through 12 are complete and `npm run lint`, `npm run typecheck`, `npm run test`, `npm run verify`, and `npm run build` passes.

## Required reading

- `../../implementation-prompt.md`
- `../../technical-specification.md`
- `../../code-architecture.md`
- `../../project-roadmap.md`
- Assurance and architecture decisions created by earlier parts.

## Files owned by this part

- `src/index.ts`
- `src/serialization/model-schema.ts`
- `src/serialization/result-schema.ts`
- `src/serialization/parse-model-json.ts`
- `src/serialization/parse-result-json.ts`
- `src/serialization/canonical-json.ts`
- `src/serialization/artifact-hash.ts`
- `schemas/model.schema.json`
- `schemas/result.schema.json`
- `test/unit/public-api-snapshot.test.ts`
- `test/unit/model-json.test.ts`
- `test/unit/result-json.test.ts`
- `test/property/json-roundtrip.test.ts`
- `scripts/check-runtime-imports.mjs`

## Interface contracts

- Parsers accept `unknown` and return trusted domain/result types only after complete validation.
- Schema compatibility follows schema version.
- Canonical serialization is deterministic.

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

### Task 1: Freeze public API

- [ ] **1.1** Export explicit modules only.
- [ ] **1.2** Document every public symbol.
- [ ] **1.3** Add an API snapshot test.

### Task 2: Define complete model schema

- [ ] **2.1** Validate exact units, discriminated unions, IDs, references, tuple lengths, finite values, unknown properties, loads, elements, and constraints.
- [ ] **2.2** Reject CSV-related input properties and ambiguous point `position`.

### Task 3: Define complete result schema

- [ ] **3.1** Require all geometry, axes, releases, diagnostics, assumptions, conventions, and provenance.
- [ ] **3.2** Reject structurally incomplete results.

### Task 4: Implement canonical serialization

- [ ] **4.1** Define key/entity ordering, number formatting constraints, and negative-zero policy.
- [ ] **4.2** Implement browser-safe SHA-256 abstraction when requested.
- [ ] **4.3** Keep fast fingerprint separate.

### Task 5: Implement parser errors

- [ ] **5.1** Return exact field paths and stable codes.
- [ ] **5.2** Test missing/additional/wrong-type fields, hostile IDs, duplicate IDs, invalid tuples, non-finite representations, and unsupported schema versions.

### Task 6: Check platform boundaries

- [ ] **6.1** Build ESM/declarations.
- [ ] **6.2** Reject Node-only imports under `src`.
- [ ] **6.3** Run runtime modules in a browser-like Vitest environment or an in-repository minimal browser check without a separate downstream project.

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

Create `docs/verification/json-api-report.md` with schema coverage, malformed corpus results, deterministic hashes, and export snapshot.

## Stop conditions

Stop and repair this part before proceeding if:

- a governing equation is not independently justified;
- a test passes only after unjustified tolerance expansion;
- model physics is silently changed for numerical convenience;
- an unsupported feature is exposed;

- formatting, linting, typing, tests, verification, build, or checks fail;
- this part contradicts an earlier accepted requirement without a documented decision.

## Completion acceptance

Public exports are intentional, JSON validation is complete/fail-closed, canonical output is deterministic, runtime is browser-safe, and no CSV input path exists.

## Completion checklist

- [ ] Every task and review item is checked.
- [ ] The acceptance statement is demonstrated by stored evidence.
- [ ] `npm run lint`, `npm run typecheck`, `npm run test`, `npm run verify`, and `npm run build` passes.
- [ ] Required benchmark/verification evidence is stored.
- [ ] `docs/roadmap/progress.md` marks this part `complete`.
- [ ] The next part's prerequisites are satisfied.
