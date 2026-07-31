# Part 10: Trusses, Springs, and Rigid Offsets — Implementation Plan

> Execute this part locally using npm and Vitest. Do not use another package manager or test framework. Do not begin the next part until this plan is complete.

## Goal

Implement truss and spring kernels plus rigid-offset transformations and verify kinematics, equilibrium, energy, and invariance.

## Prerequisites

Parts 00 through 09 are complete and `npm run lint`, `npm run typecheck`, `npm run test`, `npm run verify`, and `npm run build` passes.

## Required reading

- `../../implementation-prompt.md`
- `../../technical-specification.md`
- `../../code-architecture.md`
- `../../project-roadmap.md`
- Assurance and architecture decisions created by earlier parts.

## Files owned by this part

- `src/elements/truss/local-stiffness.ts`
- `src/elements/truss/result-recovery.ts`
- `src/elements/spring/ground-spring.ts`
- `src/elements/spring/two-node-spring.ts`
- `src/elements/frame/rigid-offset-transform.ts`
- `test/unit/truss-kernel.test.ts`
- `test/unit/spring-kernel.test.ts`
- `test/unit/rigid-offset-transform.test.ts`
- `verification/analytical/truss-spring-cases.test.ts`
- `test/regression/truss-mechanism-topology.test.ts`

## Interface contracts

- Truss kernel returns global stiffness plus direction metadata.
- Spring kernels return equal/opposite force contributions as applicable.
- Rigid-offset transform maps nodal to deformable-end displacements and back-transforms forces.

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

### Task 1: Implement truss kernel

- [ ] **1.1** Compute axial stiffness in arbitrary 3D orientation.
- [ ] **1.2** Recover extension, strain, force, and global end forces.
- [ ] **1.3** Verify closed forms and scale/rotation behavior.

### Task 2: Prove topology behavior

- [ ] **2.1** Assert truss-only rotations do not exist.
- [ ] **2.2** Keep free translations active for under-restrained trusses.
- [ ] **2.3** Search production code for zero-row auto-restraint patterns.

### Task 3: Implement ground springs

- [ ] **3.1** Support explicit translational/rotational components.
- [ ] **3.2** Reject negative stiffness; define zero policy.
- [ ] **3.3** Verify one-DOF closed forms.

### Task 4: Implement two-node springs

- [ ] **4.1** Use explicit basis and relative components.
- [ ] **4.2** Verify equal/opposite forces, rigid-body invariance, and energy.

### Task 5: Implement rigid-offset transforms

- [ ] **5.1** Map displacements to deformable ends and forces to nodes with moment arms.
- [ ] **5.2** Transform stiffness and load vectors.
- [ ] **5.3** Verify virtual work and equilibrium.

### Task 6: Run mixed-element checks

- [ ] **6.1** Combine frames, trusses, and springs in small models.
- [ ] **6.2** Verify DOF requests, reversed connectivity, and scale invariance.

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

Create `docs/verification/truss-spring-offset-report.md` with closed-form, virtual-work, equilibrium, and topology evidence.

## Stop conditions

Stop and repair this part before proceeding if:

- a governing equation is not independently justified;
- a test passes only after unjustified tolerance expansion;
- model physics is silently changed for numerical convenience;
- an unsupported feature is exposed;

- formatting, linting, typing, tests, verification, build, or checks fail;
- this part contradicts an earlier accepted requirement without a documented decision.

## Completion acceptance

Trusses, springs, and offsets pass analytical and invariance checks without silent DOF suppression or loss of equilibrium.

## Completion checklist

- [ ] Every task and review item is checked.
- [ ] The acceptance statement is demonstrated by stored evidence.
- [ ] `npm run lint`, `npm run typecheck`, `npm run test`, `npm run verify`, and `npm run build` passes.
- [ ] Required benchmark/verification evidence is stored.
- [ ] `docs/roadmap/progress.md` marks this part `complete`.
- [ ] The next part's prerequisites are satisfied.
