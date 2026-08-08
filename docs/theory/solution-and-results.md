# Constraints, Sparse Solution, and Results

## Affine constraints

General linear constraints are compiled into:

**XF-EQ-011**: `u = Tq + u0`.

Duplicate terms are combined and zero coefficients removed. Contradictions, directed equality cycles, missing DOFs, and rank deficiency fail explicitly. Principal-plane rigid diaphragms are expanded transactionally into ordinary affine equations.

The reduced system is:

**XF-EQ-012**: `Kr = T^T K T`.

**XF-EQ-013**: `Fr = T^T (F - K u0)`.

The compiler and assembler operate on sparse row/coordinate structures; no dense global `T` is allocated.

## Assembly and factorization

Element contributions are accumulated in a deterministic lower-triangular coordinate matrix. Reverse Cuthill-McKee reorders reduced equations, then skyline Cholesky computes:

**XF-EQ-014**: `P Kr P^T = L L^T`.

A non-positive or scale-small pivot raises a structured mechanism/factorization error. The engine does not insert restraints or epsilon stiffness. One prepared analysis reuses assembly and factorization for every compatible load case.

## Reactions and element recovery

After solving reduced coordinates, full displacement is recovered with XF-EQ-011. The full residual is:

**XF-EQ-015**: `r = K u - F`.

Constraint reactions are recovered from this residual and traced to source equations. Frame end forces include equivalent member loads and release recovery. Truss results include extension, strain, axial force, `globalEndForces` (six elastic-end force components), and `globalReferenceEndForces` (twelve reference-node force/moment components). Spring results contain global end forces.

## Exact frame internal-force diagrams

Each frame carries `internalForceSegments` with model-wide load boundaries. Every segment has the fixed six-component order `[axial, shearY, shearZ, torsion, bendingY, bendingZ]`; each component uses a fixed cubic `[c0, c1, c2, c3]` evaluated at local `xi = x - start` as `c0 + c1 xi + c2 xi^2 + c3 xi^3`. The public station list is derived from segment boundaries, both `left` and `right` endpoint limits when a point action produces a jump, and analytical derivative roots strictly inside every segment. At `x = 0`, `right` is the member-interior limit; at `x = L`, `left` is the member-interior limit.

## Diagnostics

The result reports raw and normalized residuals, force and moment equilibrium, strain energy, external work, relative energy error, minimum normalized pivot, equation/nonzero counts, skyline storage/bandwidth, and reuse flags.

For a linear elastic load case without unaccounted work:

**XF-EQ-016**: `U = 1/2 u^T K u`.

Prescribed-displacement external work includes recovered reaction work. Diagnostic status is computed from named, scale-aware tolerances; no universal epsilon is used.

## Combinations and envelopes

Compatible results combine by linear superposition:

**XF-EQ-017**: `Rc = Σ γi Ri`.

Compatibility requires the same model fingerprint, units, conventions, entity order, vector shapes, segment boundaries, and coefficient layout. `combineResults` combines segment coefficients before deriving stations, so the derived stations include extrema introduced only by the combination.

`createEnvelopeCompatibility(result, components)` creates strict compatibility metadata from a structural result and ordered components. `streamEnvelope(records, components)` requires that metadata on every record and compares the model fingerprint, complete unit system, result conventions, and exact ordered component layout before reading values. Bare legacy records or any mismatch fail with `RESULT_INCOMPATIBLE`. Streaming envelopes retain all tied governing result IDs, kinds, components, entities, locations, and extrema without retaining the input corpus.

Implementation evidence is summarized in [the verification report](../verification/verification-report.md).
