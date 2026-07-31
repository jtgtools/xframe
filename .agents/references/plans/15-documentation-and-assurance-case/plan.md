# Part 15: Documentation and Assurance Case — Implementation Plan

> Execute this part locally using npm and Vitest. Do not use another package manager or test framework. Do not begin the next part until this plan is complete.

## Goal

Complete professional user, API, theory, verification, limitation, security, and traceability documentation without overstating certification.

## Prerequisites

Parts 00 through 14 are complete and `npm run lint`, `npm run typecheck`, `npm run test`, `npm run verify`, and `npm run build` passes.

## Required reading

- `../../implementation-prompt.md`
- `../../technical-specification.md`
- `../../code-architecture.md`
- `../../project-roadmap.md`
- Assurance and architecture decisions created by earlier parts.

## Files owned by this part

- `README.md`
- `docs/api/public-api.md`
- `docs/api/json-input.md`
- `docs/theory/*.md`
- `docs/architecture/system-architecture.md`
- `docs/engineering-use.md`
- `docs/security-reporting.md`
- `docs/verification/verification-report.md`
- `docs/verification/benchmark-report.md`
- `examples/*.ts`

## Interface contracts

- Every documented code example executes as a Vitest test or example-check script.

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

### Task 1: Write user documentation

- [ ] **1.1** Complete installation, typed model construction, solving, results, JSON input, errors, and limitations.
- [ ] **1.2** State that CSV input is unsupported.

### Task 2: Write theory documentation

- [ ] **2.1** Document coordinates/signs, frames, trusses, springs, offsets, releases, constraints, loads, assembly, factorization, diagnostics, and internal forces.
- [ ] **2.2** Use equation IDs linked to code/tests.

### Task 3: Write API/schema documentation

- [ ] **3.1** Document every public contract, unit/schema version, errors, compatibility, and canonical serialization.
- [ ] **3.2** Keep examples executable.

### Task 4: Populate verification reports

- [ ] **4.1** Populate verification/benchmark reports from actual output.

### Task 5: Document engineering/legal limits

- [ ] **5.1** Analysis-only scope, explicit unsupported analyses, need for professional review, and absence of formal certification.
- [ ] **5.2** Add security reporting.

### Task 6: Audit documentation

- [ ] **6.1** Run link/example checks and scans for placeholders, contradictions, predecessor names, unsupported claims, and unexecuted features.

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

Example execution and documentation scans are recorded in `docs/verification/documentation-audit.md`.

## Stop conditions

Stop and repair this part before proceeding if:

- a governing equation is not independently justified;
- a test passes only after unjustified tolerance expansion;
- model physics is silently changed for numerical convenience;
- an unsupported feature is exposed;

- formatting, linting, typing, tests, verification, build, or checks fail;
- this part contradicts an earlier accepted requirement without a documented decision.

## Completion acceptance

Documentation matches actual behavior, examples execute, limitations are explicit, and no formal-certification claim appears.

## Completion checklist

- [ ] Every task and review item is checked.
- [ ] The acceptance statement is demonstrated by stored evidence.
- [ ] `npm run lint`, `npm run typecheck`, `npm run test`, `npm run verify`, and `npm run build` passes.
- [ ] Required benchmark/verification evidence is stored.
- [ ] `docs/roadmap/progress.md` marks this part `complete`.
- [ ] The next part's prerequisites are satisfied.
