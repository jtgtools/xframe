# Units and Geometry Verification Report

Date: 2026-07-31
Part: 03
Requirements: FR-UNT-001, FR-UNT-002, FR-GEO-001 through FR-GEO-006

## Unit-system boundary

Version one accepts exactly these own enumerable keys and no others:

```text
version, length, force, moment, modulus, distributedForce, density, rotation
```

`version` must equal `"1"`; every descriptive unit label must be a non-empty string; `rotation` must equal `"rad"`. The parser performs no conversion. The copied result is frozen. `ModelBuilder.setUnitSystem` and `ModelBatchInput.unitSystem` attach the parsed metadata atomically; finalization will require its presence in Part 05.

## Finite and scale-aware boundaries

`finiteNumber` and `finiteFloat64Array` reject NaN and both infinities, including overflow products that have become infinite. Finite subnormal values remain valid. Negative zero is normalized to positive zero.

The geometry comparison uses

```text
absolute_error <= 0 + (64 * Number.EPSILON) * reference_scale
```

The zero absolute term is intentional because version one accepts arbitrary coherent user units. The independent reference scale is derived from physical coordinate or vector magnitudes. Consequently, a `1e-15` span at a `1e-15` coordinate scale remains valid, while a `1e-7` difference at a `1e9` coordinate scale is treated as unresolved cancellation.

Explicit orientation projection uses a relative boundary of `sqrt(Number.EPSILON)`. Below that angular separation, projection loses approximately half of double-precision significant digits, so the input is rejected rather than silently replaced by the fallback.

## Deterministic property tests

All pseudo-random tests use the 32-bit linear-congruential generator

```text
state = (1664525 * state + 1013904223) mod 2^32
```

The seeds and retained measurements are:

|  Seed | Cases | Property                                 |   Maximum observed error |
| ----: | ----: | ---------------------------------------- | -----------------------: |
| 24301 |   200 | local-axis unit norm                     |  `4.440892098500626e-16` |
| 24301 |   200 | local-axis orthogonality                 | `1.6653345369377348e-16` |
| 24301 |   200 | determinant distance from `+1`           |  `4.440892098500626e-16` |
| 24302 |   100 | global/local/global component round-trip | `2.1316282072803006e-14` |
| 24303 |   100 | rigid-offset virtual-work absolute error | `1.7763568394002505e-15` |
| 24303 |   100 | rigid-offset virtual-work relative error |  `7.125622406101314e-16` |

The local-axis fallback selects the global basis vector least aligned with local x, with X then Y then Z as deterministic tie order. The projected vector becomes local y, and local z is `x × y`. Recomputing `y = z × x` limits orthogonality drift and preserves a determinant near `+1`.

## Rigid-offset equations

For nodal translation `u`, nodal rotation `theta`, and global offset vector `r`, the deformable endpoint displacement is

```text
u_endpoint = u + theta × r
```

For endpoint force `F` and endpoint moment `M`, transfer to the node is

```text
F_node = F
M_node = M + r × F
```

The relation satisfies virtual work exactly up to roundoff:

```text
[F, M] · [u + theta × r, theta] = [F, M + r × F] · [u, theta]
```

`resolveElasticGeometry` computes `nodeI + offsetI` and `nodeJ + offsetJ`, rejects unresolved zero spans, and rejects elastic endpoint order whose projection on the reference connectivity is nonpositive or scale-zero.

## Runtime boundary

All implementation modules use browser-standard JavaScript and typed arrays only. They import no Node runtime modules. Inputs are copied; no caller-owned array is retained. Returned typed arrays own their storage and are never shared with mutable internal model state.

## Environment note

Repository scripts passed in the current sandbox through the ignored compatibility harness described in `docs/verification/domain-model-evidence.md`. Native pinned Vitest/Oxfmt/Oxlint revalidation remains a Part 16 requirement because the sandbox package mirror cannot supply their tarballs.
