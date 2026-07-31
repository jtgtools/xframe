# Project Roadmap

## Rule

Execute Parts 00–16 sequentially. A later part begins only after the current part's `plan.md` acceptance checklist and `npm run check` pass. Maintain `docs/roadmap/progress.md` with status, tests, coverage, evidence, and blockers.

## Stage A — Foundation and assurance

- **Part 00: Project bootstrap.** npm, TypeScript, Vitest, formatting, linting, scripts, structure, and agent rules.
- **Part 01: Requirements and assurance.** Requirement IDs, conventions, and definition of done.

## Stage B — Trusted domain core

- **Part 02: Domain model and validation.** Structured errors, IDs, transactional builder, immutable records.
- **Part 03: Units, geometry, and coordinates.** Exact units, finite boundaries, vectors/transforms, local axes, rigid-offset geometry.
- **Part 04: Materials, sections, and elements.** Isotropic materials, separate sections, element contracts, theory selection.
- **Part 05: DOF topology and finalization.** Active physical DOFs, reference resolution, elastic geometry, immutable model.
- **Part 06: Loads, cases, and combinations.** Unambiguous loads, self-weight prerequisites, case/combination graph and identity.

## Stage C — Numerical engine

- **Part 07: Sparse linear algebra.** Assembly, memory estimates, RCM, profile storage, factorization, solves, residuals.
- **Part 08: Affine constraints.** Canonical equations, rank/contradiction/cycle checks, sparse reduction and recovery.
- **Part 09: Frame formulations, loads, and releases.** Euler-Bernoulli/Timoshenko kernels, theory-consistent loads, all release masks.
- **Part 10: Trusses, springs, and rigid offsets.** Truss/spring kernels, offset transforms, invariance and equilibrium.
- **Part 11: Assembly, factorization, and case solves.** Full integration, reuse, reaction recovery, mechanism diagnostics.

## Stage D — Results and boundaries

- **Part 12: Results, diagnostics, and envelopes.** Typed results, internal forces, compatibility, combinations, streaming envelopes.
- **Part 13: JSON serialization and public API.** Complete JSON schemas, canonical serialization, public exports, browser-safe checks; no CSV input.

## Stage E — Evidence and closure

- **Part 14: Verification, property tests, and benchmarks.** Independent cases, metamorphic/adversarial tests, sparse benchmarks.
- **Part 15: Documentation and assurance case.** Theory, API, limitations, verification and benchmark evidence.
- **Part 16: Final system audit.** Clean npm installation, full checks, red-team cases, factual report.

## Dependency chain

```text
00 -> 01 -> 02 -> 03 -> 04 -> 05 -> 06
06 -> 07 -> 08 -> 09 -> 10 -> 11
11 -> 12 -> 13 -> 14 -> 15 -> 16
```

## Progress states

`not-started`, `in-progress`, `blocked`, `complete`.

A part may be marked complete only when its plan's tasks, tests, evidence, and acceptance statement are all satisfied.