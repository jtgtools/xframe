# Model Finalization Verification

## Scope

Part 05 resolves references, structural geometry, local axes, and physical kinematic requests before any numerical assembly. Finalization does not solve or infer supports.

## Deterministic mixed-model topology

The representative mixed model contains truss `t` on `n1-n2`, frame `f` on `n2-n3`, and a ground spring `s` acting only on `n1.rz`.

| Physical index | DOF     |
| -------------: | ------- |
|              0 | `n1.ux` |
|              1 | `n1.uy` |
|              2 | `n1.uz` |
|              3 | `n1.rz` |
|              4 | `n2.ux` |
|              5 | `n2.uy` |
|              6 | `n2.uz` |
|              7 | `n2.rx` |
|              8 | `n2.ry` |
|              9 | `n2.rz` |
|             10 | `n3.ux` |
|             11 | `n3.uy` |
|             12 | `n3.uz` |
|             13 | `n3.rx` |
|             14 | `n3.ry` |
|             15 | `n3.rz` |

For the zero-offset truss in this historical representative model, the truss-only endpoint requests translations only. The rotational spring requests exactly `n1.rz`. Request provenance is retained per physical DOF.

## Reference and geometry checks

Independent missing references are collected and sorted by entity type, entity ID, then field path. Frame and truss rigid offsets are applied to node coordinates before elastic length and direction are evaluated. The frame local basis is built from the deformable endpoints, not the reference node line.

For a 10 m reference frame with offsets `start=[1,0,0]` and `end=[-2,0,0]`, finalization records:

- elastic start: `[1,0,0]`
- elastic end: `[8,0,0]`
- elastic length: `7`

## No-auto-restraint regression

A free zero-offset two-node truss finalizes with six translational physical DOFs, no rotational DOFs, and an empty constraint list. This intentionally preserves the later global mechanism; Part 11 must diagnose it during factorization rather than silently modify topology.

## Fingerprint contract

At the original Part 05 execution, the model fingerprint used canonical key/entity ordering and FNV-1a 32-bit hashing, labeled `fnv1a32:<hex>`. It was an in-memory deterministic change detector and was explicitly not cryptographic identity.

## Safety-correctness supersession (2026-08-08)

This report retains the original Part 05 observations and counts. Current behavior supersedes its fingerprint and zero-offset-only topology scope: finalized models use `sha256:<64 lowercase hexadecimal digits>`, and each nonzero truss rigid-offset endpoint requests all six reference-node DOFs. The current contract is recorded in [`safety-correctness-report.md`](safety-correctness-report.md).

## Member-load coordinates

Part 05 establishes resolved elastic geometry. No member-load contract is public before Part 06; Part 06 attaches distance/ratio validation to this finalized geometry when those load types become supported.
