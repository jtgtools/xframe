# Material, Section, and Element Contract Report

Date: 2026-07-31
Part: 04
Requirements: FR-MAT-001, FR-MAT-002, FR-SEC-001 through FR-SEC-003, FR-ELE-001 through FR-ELE-004

## Isotropic material relation

Version one accepts either:

```text
E + G
E + nu
E + G + nu, when mutually consistent
```

The governing relation is

```text
G = E / (2 * (1 + nu))
```

with `E > 0`, `G > 0`, and `-1 < nu < 0.5`. The missing property is derived once during construction. A supplied complete triple is compared using zero absolute tolerance and relative tolerance `1e-9`, scaled by the larger of supplied and derived `G`. The tolerance allows decimal serialization roundoff but rejects materially different elastic constants. Optional density, when supplied, must be positive and finite. Absence remains explicit so self-weight validation can aggregate missing-density diagnostics in Part 06.

Representative derivations tested:

| Input                   | Derived value              |
| ----------------------- | -------------------------- |
| `E = 210e9`, `nu = 0.3` | `G = 80.76923076923077e9`  |
| `E = 70e9`, `G = 26e9`  | `nu = 0.34615384615384626` |

The model builder delegates material insertion to the same constructor; invalid material data cannot enter builder storage.

## Section contracts and axes

Frame sections contain exactly:

```text
A, J, Iy, Iz, optional Asy, optional Asz
```

All consumed properties are positive finite values. `Iy` and `Iz` are second moments about the local principal y and z axes. `Asy` is the effective shear area for local-y shear; `Asz` is the effective shear area for local-z shear. Euler-Bernoulli frames do not consume shear areas. Timoshenko frames require both positive effective shear areas when a section is resolved during finalization.

Truss sections contain only axial area `A`. Runtime construction rejects frame-only properties rather than silently discarding them.

## Element-definition contracts

- Frame theory is the closed discriminated union `euler-bernoulli | timoshenko`.
- Frame and truss endpoint identifiers must differ before geometric reference resolution.
- Frame orientation is copied, finite, and nonzero. Parallelism is checked after endpoints and rigid offsets are resolved.
- Frame releases use deterministic component order `tx, ty, tz, rx, ry, rz`; duplicate components fail.
- Rigid-offset vectors are copied and frozen.
- Ground springs omit `endNodeId`; two-node springs require distinct endpoint identifiers.
- Spring component order is `tx, ty, tz, rx, ry, rz`. Components are finite and nonnegative, and at least one component must be positive. Version-one spring records are diagonal component springs; coupled spring matrices are not implied.

## Numerical specifications staged for later kernels

`test/specification/element-kernel-cases.ts` records independent axial-bar, Euler-Bernoulli cantilever, and Timoshenko cantilever closed-form values. Parts 09 and 10 must consume these fixtures when stiffness and recovery kernels become executable; no numerical kernel is falsely exposed in Part 04.

## Environment note

The 16 new Part 04 contract tests and the full repository command sequence passed through the sandbox-only compatibility harness. Native pinned-tool revalidation remains a Part 16 gate because the configured package mirror cannot supply the locked tarballs.
