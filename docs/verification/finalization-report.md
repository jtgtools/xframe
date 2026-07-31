# Model Finalization Verification

## Scope

Part 05 resolves references, structural geometry, local axes, and physical kinematic requests before any numerical assembly. Finalization does not solve or infer supports.

## Deterministic mixed-model topology

The representative mixed model contains truss `t` on `n1-n2`, frame `f` on `n2-n3`, and a ground spring `s` acting only on `n1.rz`.

| Physical index | DOF |
| ---: | --- |
| 0 | `n1.tx` |
| 1 | `n1.ty` |
| 2 | `n1.tz` |
| 3 | `n1.rz` |
| 4 | `n2.tx` |
| 5 | `n2.ty` |
| 6 | `n2.tz` |
| 7 | `n2.rx` |
| 8 | `n2.ry` |
| 9 | `n2.rz` |
| 10 | `n3.tx` |
| 11 | `n3.ty` |
| 12 | `n3.tz` |
| 13 | `n3.rx` |
| 14 | `n3.ry` |
| 15 | `n3.rz` |

The truss-only endpoint requests translations only. The rotational spring requests exactly `n1.rz`. Request provenance is retained per physical DOF.

## Reference and geometry checks

Independent missing references are collected and sorted by entity type, entity ID, then field path. Frame and truss rigid offsets are applied to node coordinates before elastic length and direction are evaluated. The frame local basis is built from the deformable endpoints, not the reference node line.

For a 10 m reference frame with offsets `start=[1,0,0]` and `end=[-2,0,0]`, finalization records:

- elastic start: `[1,0,0]`
- elastic end: `[8,0,0]`
- elastic length: `7`

## No-auto-restraint regression

A free two-node truss finalizes with six translational physical DOFs, no rotational DOFs, and an empty constraint list. This intentionally preserves the later global mechanism; Part 11 must diagnose it during factorization rather than silently modify topology.

## Fingerprint contract

The model fingerprint uses canonical key/entity ordering and FNV-1a 32-bit hashing, labeled `fnv1a32:<hex>`. It is an in-memory deterministic change detector and is explicitly not cryptographic identity.

## Member-load coordinates

Part 05 establishes resolved elastic geometry. No member-load contract is public before Part 06; Part 06 attaches distance/ratio validation to this finalized geometry when those load types become supported.
