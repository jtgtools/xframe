# OpenSees Reference Data

This directory contains the OpenSees-only external oracle: native Tcl inputs plus committed reference JSON. The OpenSees executable and source are intentionally not distributed with xframe.

## Provenance

- Oracle: OpenSees 3.8.0, commit `6e55293513192aa05c7e1205e66a5a1a1ed088c4`.
- Expected executable SHA-256: `5aa4e9c80c410c510ca62ac3b2f1d64a8e50679f0238e140b5bebcd6d5ddbe6d`.

Regenerate the building references (Node-generated Tcl inputs allowed) with:

```bash
npm run build && npm run regenerate:opensees
```

Verify non-destructively with:

```bash
OPENSEES_BIN=/absolute/path/to/OpenSees npm run verify:opensees
```

The verifier checks each committed input SHA-256, pins the binary hash, runs every Tcl input in a temporary directory, and numerically compares every dataset output against the committed measured references (displacements, reactions, member forces, truss axials; strict `1e-12` comparison for the eccentric-truss oracle). It leaves the repository unchanged.

Axis convention: `geomTransf` vectors use `0 0 1` so in-plane bending uses `Iz` in both codes, matching the xframe orientations. Vertical-member local frames differ by an exact 180-degree roll about local x; those end forces compare through `[Fx,-Fy,-Fz,Mx,-My,-Mz]` per end block (see `verification/external/opensees-building-frames.test.ts`). Tcl `reactions` output requires the `reactions` command after `analyze`; omitting it silently prints zeros.

## Cases

- `eccentric-truss`: rigid-link truss with rotational springs; rotations and axial force.
- `cantilever-euler`: 3 m Euler-Bernoulli cantilever under tip force + moment.
- `portal-frame`: single-bay 5 m × 3 m portal under lateral + gravity nodal load.
- `two-story-two-bay`: 4 m bays, 3 m stories, roof-level lateral loads.
- `triangular-truss`: three axial trusses with 1 mm support settlement.

## Oracle limits

The reference is used for independent comparison, not as implementation source. OpenSees does not define xframe springs, exact vector rigid offsets, general affine constraints, rigid-diaphragm expansion, result combinations, streaming envelopes, JSON artifacts, identifier policy, or truss-only active-DOF topology. Those features are verified by closed forms, algebraic identities, and adversarial tests.
