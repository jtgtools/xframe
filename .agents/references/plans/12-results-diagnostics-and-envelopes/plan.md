# Part 12: Results, Diagnostics, Combinations, and Envelopes — Implementation Plan

> Execute this part locally using npm and Vitest. Do not use another package manager or test framework. Do not begin the next part until this plan is complete.

## Goal

Implement immutable typed results, case diagnostics, frame internal forces, compatible combinations, and bounded streaming envelopes.

## Prerequisites

Parts 00 through 11 are complete and `npm run lint`, `npm run typecheck`, `npm run test`, `npm run verify`, and `npm run build` passes.

## Required reading

- `../../implementation-prompt.md`
- `../../technical-specification.md`
- `../../code-architecture.md`
- `../../project-roadmap.md`
- Assurance and architecture decisions created by earlier parts.

## Files owned by this part

- `src/results/result-types.ts`
- `src/results/result-factory.ts`
- `src/results/case-diagnostics.ts`
- `src/results/frame-internal-forces.ts`
- `src/results/combine-results.ts`
- `src/results/stream-envelope.ts`
- `test/unit/result-immutability.test.ts`
- `test/unit/diagnostics.test.ts`
- `test/integration/internal-forces.test.ts`
- `test/integration/combinations.test.ts`
- `test/integration/stream-envelope.test.ts`

## Interface contracts

- Solved-result constructors are internal.
- Combination compatibility checks model identity, units, conventions, entities, ordering, and kind.
- Envelope accepts iterable sources and stores only extrema/provenance.

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

### Task 1: Define result contracts

- [ ] **1.1** Separate node/frame/truss/spring/case/combination/envelope types.
- [ ] **1.2** Own/copy all arrays and include units, conventions, model identity, and provenance.

### Task 2: Implement diagnostics

- [ ] **2.1** Compute normalized/max residual, force/moment equilibrium, strain energy, external work, energy error, minimum pivot, equations, storage/profile, and reuse.
- [ ] **2.2** Define pass/warn/fail thresholds without hiding raw values.

### Task 3: Implement internal forces

- [ ] **3.1** Sample axial, two shear, torsion, and two bending components.
- [ ] **3.2** Insert coordinates on both sides of point discontinuities.
- [ ] **3.3** Handle distributed loads, partial spans, releases, and offsets.

### Task 4: Implement combinations

- [ ] **4.1** Reject incompatible results.
- [ ] **4.2** Combine arrays without aliasing.
- [ ] **4.3** Preserve factor provenance.

### Task 5: Implement streaming envelopes

- [ ] **5.1** Track positive/negative extrema and complete governing provenance.
- [ ] **5.2** Use deterministic tie-breaking.
- [ ] **5.3** Process at least 150,000 records without retaining all inputs.

### Task 6: Adversarial result tests

- [ ] **6.1** Reject fabricated identities and duplicate result IDs.
- [ ] **6.2** Test local/global independence, equal extrema, negative zero, and invalid non-finite results.

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

Create `docs/verification/result-diagnostics-report.md` including equilibrium/energy tables and memory observations for the 150,000-record envelope.

## Stop conditions

Stop and repair this part before proceeding if:

- a governing equation is not independently justified;
- a test passes only after unjustified tolerance expansion;
- model physics is silently changed for numerical convenience;
- an unsupported feature is exposed;

- formatting, linting, typing, tests, verification, build, or checks fail;
- this part contradicts an earlier accepted requirement without a documented decision.

## Completion acceptance

Results are immutable and compatible by construction, diagnostics are complete, internal-force diagrams balance, and envelopes remain streaming/bounded.

## Completion checklist

- [ ] Every task and review item is checked.
- [ ] The acceptance statement is demonstrated by stored evidence.
- [ ] `npm run lint`, `npm run typecheck`, `npm run test`, `npm run verify`, and `npm run build` passes.
- [ ] Required benchmark/verification evidence is stored.
- [ ] `docs/roadmap/progress.md` marks this part `complete`.
- [ ] The next part's prerequisites are satisfied.
