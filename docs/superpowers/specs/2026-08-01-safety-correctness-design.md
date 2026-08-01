# Safety-Correctness Remediation Design

**Date:** 2026-08-01  
**Status:** Approved direction — phased exact fixes  
**Scope:** XF-001, XF-002, XF-003, XF-004, XF-007, XF-010, XF-013, and XF-014

## Goal

Remove the selected silent correctness and integrity failures without hidden restraints, approximate mechanics, locale-dependent identity, or unstructured large-input crashes. Preserve browser-safe standards-compliant ESM and the dependency-free runtime.

## Non-goals

- npm packing, publication, schema subpath exports, or release automation;
- findings outside the eight IDs listed above;
- nonlinear analysis, second-order effects, dynamics, or design-code checks;
- arbitrary numerical sampling as a substitute for analytical internal-force extrema;
- hidden stiffness, automatic restraints, or epsilon regularization;
- retaining unsafe legacy behavior behind an opt-in compatibility flag.

## Requirements

### FR-SAFE-001 — Collision-resistant model identity

1. Finalized models and structural results shall use `sha256:<64 lowercase hexadecimal digits>` as their model fingerprint.
2. The digest input shall be the existing canonical structural model representation encoded as UTF-8.
3. The implementation shall remain synchronous, browser-safe, and free of Node-only imports and runtime dependencies.
4. SHA-256 shall be verified against published test vectors and cross-checked against Web Crypto in tests.
5. `combineResults` shall continue to reject differing fingerprints before combining values.

### FR-SAFE-002 — Complete truss rigid-offset mechanics

1. Nonzero truss rigid offsets shall remain supported.
2. For elastic-end translations,
   `u_e = u_node + theta × r`.
3. Truss axial extension shall be
   `delta = n · (u_e,end - u_e,start)`.
4. The local contribution shall be assembled from the compatibility vector `B` as
   `K = (EA/L) B^T B`.
5. Force recovery shall use the same work-conjugate mapping. Reference-node forces shall include moments `r × F`.
6. Any reference endpoint with a nonzero offset shall expose all three rotational DOFs. Unsupported free rotations shall remain physical mechanisms and shall not be silently restrained.
7. Truss self-weight equivalent endpoint forces shall be transferred through each rigid arm, including reference-node moments.
8. Existing six-component elastic-end truss forces shall remain available. Results shall additionally expose twelve reference-node force/moment components in start-then-end order.
9. A corrected two-spring eccentric-truss case shall produce `thetaA = 2/3`, `thetaB = 1/3`, and axial-force magnitude `1000/3` for `EA/L = 1000`, two `k_r = 1000` springs, and `M_A = 1000`.
10. The formulation shall be independently compared with an OpenSees 3.8.0 model using rigid links and a truss between elastic-end nodes.

The earlier audit reproduction with a free end-B rotation is not an oracle: its exact compatible solution is `thetaA = thetaB = 1`, `N = 0`. It shall not be encoded as a failing expectation.

### FR-SAFE-003 — Scale-invariant affine constraints

1. Multiplying every coefficient and the right-hand side of a constraint by any finite nonzero scalar shall not change compiled topology or recovered kinematics.
2. Duplicate coefficients shall be summed before normalization.
3. Near-cancellation shall be judged relative to the magnitude of the original coefficient terms, never an absolute floor of `1` and never the right-hand-side magnitude.
4. A zero-term equation with an exactly nonzero right-hand side shall fail as `CONSTRAINT_CONTRADICTION`.
5. Rank elimination shall operate on normalized rows with explicit scale-relative pruning.
6. Tests shall cover positive and negative scales from `1e-300` through `1e300` where intermediate arithmetic remains finite.

### FR-SAFE-004 — Exact frame internal-force extrema

1. Frame internal-force diagrams shall be represented internally and in result JSON as exact piecewise polynomial segments.
2. Segment boundaries shall be the model-wide union of member-load starts, ends, and point-action coordinates, preserving compatibility between cases from the same model.
3. Segment coefficients shall use local distance from the segment start and shall represent axial force, both shears, torsion, and both bending moments.
4. Case-result stations shall include segment boundaries, both sides of point discontinuities, and all analytical derivative roots strictly inside each segment.
5. `combineResults` shall combine compatible segment coefficients first, then regenerate stations. This shall capture extrema unique to arbitrary linear combinations.
6. No fixed station spacing or interpolation shall be used as an extrema oracle.
7. For a simply supported 10 m beam under `q = 1000`, stations shall include `x = 5` with `|M| = 12,500`.

### FR-SAFE-007 — Endpoint-sided force limits

1. Point forces and point moments at `x = 0` or `x = L` shall produce both `left` and `right` records.
2. At `x = 0`, `right` is the member-interior limit; at `x = L`, `left` is the member-interior limit.
3. Existing point-action inclusion and sign conventions shall remain unchanged.
4. A cantilever end force shall expose the nonzero `x = L, side = left` shear and moment and the post-load `side = right` values.

### FR-SAFE-010 — Host-independent ordering

1. Structural identity, model ordering, DOF ordering, reference diagnostics, and constraint ordering shall not call locale-sensitive comparison.
2. One shared comparator shall order normalized identifiers by ECMAScript string code units using `<` and `>`.
3. The same Unicode-ID model shall have identical ordering and SHA-256 fingerprint when the default collation is English, Swedish, or monkey-patched.

### FR-SAFE-013 — Bounded reductions for large arrays

1. Production code shall not pass model-sized arrays or iterables as variadic arguments.
2. Maximum, minimum, and pivot selection over untrusted/model-sized collections shall use bounded loops.
3. Inputs with at least 250,000 constraint terms and skyline rows shall not throw native call-stack `RangeError` solely because of collection size.
4. Expected failures shall remain structured `XFrameError` instances.

### FR-SAFE-014 — Envelope compatibility identity

1. Every `EnvelopeInputRecord` shall carry compatibility metadata containing:
   - model fingerprint;
   - complete unit system;
   - result conventions;
   - exact ordered component layout.
2. `streamEnvelope` shall compare every record with the first record and with the supplied component layout before reading values.
3. Any mismatch shall fail with `RESULT_INCOMPATIBLE` and a stable reason.
4. A public helper shall create compatibility metadata from a `StructuralResult` and component list to avoid hand-copying metadata.
5. Bare legacy records shall fail closed; there shall be no compatibility bypass.

## Architecture

### Phase 1 — Identity, deterministic ordering, and envelopes

`canonicalJson` remains the single canonical representation. A small browser-safe synchronous SHA-256 module hashes its UTF-8 bytes. `computeModelFingerprint` changes only its algorithm and prefix; callers retain a synchronous string API.

`src/model/identifier.ts` exports the shared comparator. All structural `localeCompare` call sites use it, while numerical sorts remain unchanged.

Envelope records gain one immutable compatibility object. Compatibility comparison uses exact field/layout equality, not another short hash. `streamEnvelope` validates metadata before accumulating extrema.

### Phase 2 — Constraint normalization and bounded reductions

Constraint canonicalization records the largest original coefficient magnitude while accumulating duplicate terms. Sums smaller than the documented relative tolerance are removed relative to that coefficient scale. Remaining terms are normalized before rank analysis. The right-hand side is scaled by the same divisor but does not determine whether a coefficient exists.

Variadic reductions in preparation, constraint canonicalization, constraint rank analysis, diagnostics, and release condensation are replaced only where their input can grow with model size. Fixed-size local arrays do not require unrelated refactoring.

### Phase 3 — Truss rigid-offset transformation

A truss kinematics helper produces:

- the active reference-node equation map;
- the compatibility vector `B`;
- elastic-end force recovery;
- reference-node force/moment recovery.

For an endpoint with offset `r` and truss direction `n`, the rotational compatibility coefficients are based on `r × n`. Assembly forms the local outer product and scatters it through the sparse coordinate builder; no dense global matrix is introduced. Zero-offset trusses retain their current six-translation path and topology.

Load assembly uses the same rigid-arm work transformation for truss equivalent nodal forces. Result recovery returns both elastic-end forces and reference-node forces. Result serialization moves to schema version 2 because the result shape changes.

### Phase 4 — Polynomial frame-force diagrams

Each frame result carries ordered polynomial segments sharing model-wide boundaries. Coefficients are generated directly from the recovered start action and resolved member loads. Point actions create jumps at boundaries; distributed loads define continuous polynomial evolution inside segments.

Stations become a derived view:

1. evaluate left/right limits at discontinuities;
2. include ordinary segment boundaries once;
3. solve each component derivative for real roots inside the segment;
4. evaluate all components at the union of those coordinates;
5. order stations deterministically.

Combination results add segment coefficients using their factors and derive a fresh station list. Compatibility checks compare segment boundaries and coefficient layouts rather than requiring case station lists to be identical.

## Data and schema changes

- Model fingerprints change from `fnv1a32:*` to `sha256:*`.
- `EnvelopeInputRecord` becomes strict and requires compatibility metadata.
- `FrameResult` gains polynomial diagram segments.
- `TrussElementResult` gains twelve reference-node force/moment values while retaining six elastic-end forces.
- Result JSON schema version increases from `1` to `2`; version 1 result artifacts fail with `SCHEMA_UNSUPPORTED` rather than being reinterpreted.
- Model JSON schema remains version 1 because truss rigid-offset input already exists and its syntax is unchanged.

## Error behavior

- Compatibility mismatches: `RESULT_INCOMPATIBLE`.
- Non-finite public values: existing finite-value errors.
- Genuine unconstrained rotations introduced by eccentric rigid arms: `GLOBAL_MECHANISM` through the existing factorization path.
- Invalid or contradictory constraints: existing structured constraint codes.
- No new swallowed errors, fallbacks, stabilization stiffness, or approximation modes.

## Verification

Every behavior change follows RED/GREEN TDD with requirement IDs in test titles.

### Focused Vitest evidence

- SHA-256 published vectors, Unicode canonicalization, and collision regression.
- Locale-independent ordering under patched collators.
- Envelope rejection for model, unit, convention, and layout mismatches.
- Constraint scalar-multiple tests and 250,000-term large-input tests.
- Truss offset stiffness, displacement, axial force, nodal moment, self-weight, and mechanism tests.
- Polynomial coefficient, discontinuity, exact-extremum, and combination-specific-extremum tests.
- Result schema v2 round trips and v1 rejection.

### External oracle evidence

External executables are not committed. Verification commands accept paths through environment variables:

- `FRAME3DD_BIN=D:/DEV/tools/Frame3DD/windows/frame3dd.exe`
- `OPENSEES_BIN=D:/DEV/tools/OpenSees3.8.0/bin/OpenSees.exe`

Observed local oracle identities at design time:

- Frame3DD `20140514+`, SHA-256 `ad7056c210ad413c37d3627b8e9868fdc40ce09d76f167f2d5f98077d3aad626`;
- OpenSees `3.8.0` commit `6e55293513192aa05c7e1205e66a5a1a1ed088c4`, SHA-256 `5aa4e9c80c410c510ca62ac3b2f1d64a8e50679f0238e140b5bebcd6d5ddbe6d`.

OpenSees validates the eccentric-truss rigid-link case. Frame3DD and closed forms validate applicable ordinary frame/truss responses; known Frame3DD point-load discrepancies are not used as expected values.

## Execution and review

Work proceeds directly on `master`, as explicitly requested. Tasks are sequential and commits are made as each reviewed task passes.

- Implementer: `openai-codex/gpt-5.6-luna:max`.
- Task and final reviewer: `openai-codex/gpt-5.6-sol:max`.
- One implementer writes at a time.
- Every task receives independent specification and quality review.
- Fixes found by review return to the same implementer, followed by scoped re-review.
- `npm run check` runs once at final acceptance after focused checks throughout implementation.

## Acceptance

The work is accepted only when:

1. every listed requirement has a passing RED/GREEN regression;
2. OpenSees and applicable Frame3DD comparisons pass with recorded executable identity;
3. result schema v2 round trips and incompatible inputs fail closed;
4. no selected audit reproduction remains silently wrong;
5. `npm run check` exits zero;
6. the final `gpt-5.6-sol:max` review has no unresolved blocking finding;
7. the working tree is clean and commits are present on `master`.
