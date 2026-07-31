# Numerical Conventions

Status: governing conventions for XFrame version one. This document defines the implemented and tested numerical behavior of xframe version one. Sources: `.agents/references/technical-specification.md` section 4 (authoritative),
`.agents/references/implementation-prompt.md` sections 11-12, 19, 21, and `.agents/references/plans/execution-handbook.md`
sections 3-4.

Assumptions:

- Every numeric value is an IEEE-754 double precision value, carried through `number`
  and `Float64Array`.
- Rotations are expressed in radians.
- Version one uses one user-supplied unit system per model; no unit conversion exists.

## 1. No universal epsilon

- A single global epsilon constant is banned. Error magnitude is not intrinsic to a
  value class: it depends on the physical quantity, its unit scale, and the conditioning
  of the system. A universal epsilon is therefore wrong at both ends of any realistic
  scale range.
- Every tolerance is per-category (section 6), scale-aware, and combined
  absolute-plus-relative (section 5). No numerical check uses a bare literal or a shared
  epsilon, in kernels or in tests.
- Changing any tolerance requires written mathematical justification recorded in the
  verification report; a tolerance increase without a note fails the verification gate
  (execution-handbook sections 3-4, AGENTS.md).
- No arbitrary stiffness additions: releases are condensed exactly or by an equally
  justified formulation, never with epsilon stiffness (implementation-prompt section 14).
- No silent restraint insertion: zero-stiffness rows are never scanned and auto-restrained
  (implementation-prompt section 15). Physical mechanisms remain in the system and fail
  closed with structured diagnostics (FR-DOF-003). Truss-only rotations are absent by
  topology, never created to be auto-restrained (FR-DOF-002).

## 2. Axes, signs, and rotations

- The global coordinate system is right-handed Cartesian, with axes X, Y, Z ordered so
  that X x Y = Z. All global quantities are expressed in this frame.
- Local coordinate systems: every element has a deterministic right-handed orthonormal
  local system whose local x-axis runs from the element's deformable elastic start to its
  elastic end (implementation-prompt section 12, FR-GEO-003). Local y and z follow from a
  fixed projection rule applied to an orientation vector, with a deterministic fallback
  when the orientation vector is degenerate (parallel to the member axis). Construction is
  validated for finite inputs, positive elastic length, unit norms, orthogonality, and
  determinant near +1 (FR-GEO-004). Connectivity reversal produces the mirror system and
  preserves equivalent global behavior (FR-GEO-006).
- Sign conventions: displacements and forces are positive in the positive direction of the
  axis system they are expressed in; rotations and moments follow the right-hand rule about
  the positive axis (positive rotation is counterclockwise when viewed along the axis
  toward the origin). Nodal loads and reactions are positive when acting in the positive
  global directions; nodal displacements are positive in the positive global directions;
  member end actions are expressed in the element's local axes, positive in the positive
  local directions.
- The nodal-equivalent-load versus fixed-end-force sense is fixed per feature in the
  element theory documents; execution-handbook section 4 requires verifying that
  convention before any tolerance change.

## 3. Units

- Every model carries exact versioned unit metadata with exactly these keys: length,
  force, moment, modulus, distributed force, density, rotation
  (implementation-prompt section 11, FR-UNT-001). Missing, additional, or misspelled keys
  fail validation (FR-UNT-002).
- Unit values are descriptive labels (for example "N", "mm", "MPa"). Version one performs
  no unit conversion: a model is interpreted entirely in its declared unit system, and
  consistency between labels is the modeler's responsibility.
- The rotation key must designate radians, the only supported rotation unit.
- Unit metadata is versioned with the model schema (FR-JSON-005).

## 4. Numeric representation and finite boundaries

- IEEE-754 double precision through `number` and `Float64Array`; numerical kernels use
  typed arrays.
- Non-finite values (NaN and +/-Infinity) are rejected at every public and numerical
  boundary: public API input, JSON validation (FR-JSON-004), finalization, assembly,
  factorization, solve, recovery, and serialization (implementation-prompt section 19).
  Rejection is a structured error, never a silent approximation.
- Zero and effectively-zero element lengths fail (FR-GEO-002); "effectively zero" is
  judged with the geometry tolerance category (section 6).

## 5. Scale-aware checks

- Every quantitative check uses the combined form:

  `absolute_error <= absolute_tolerance + relative_tolerance * reference_scale`

- `reference_scale` must come from a physically meaningful quantity independent of the
  value under test, so it cannot hide failure (execution-handbook section 4):
  - residual and equilibrium checks: magnitude of the applied load;
  - pivot checks: magnitude of the local diagonal stiffness scale;
  - material consistency identities: the reference modulus (for example E in
    G = E / (2 * (1 + nu)), implementation-prompt section 13);
  - serialization round-trips: magnitude of the value being serialized.
- Both tolerances are recorded with units and justification for every check that uses them.

## 6. Tolerance categories

All tolerances are centralized and named, per code-architecture section 5; no ad-hoc
literals exist in kernels or tests. Categories and their basis:

| Category      | Basis                                                                                                                                                                            |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| geometry      | dimensionless deviations of local-frame construction: norm error, orthogonality (cosine error), determinant distance from +1; relative length error for effectively-zero lengths |
| material      | consistency identities among material properties, scaled by the reference modulus                                                                                                |
| stiffness     | symmetry and consistency of stiffness terms, scaled by the typical diagonal magnitude                                                                                            |
| residual      | equilibrium residual in force and moment units, scaled by the applied-load magnitude                                                                                             |
| pivot         | pivot magnitude relative to its row/column diagonal scale                                                                                                                        |
| reaction      | reaction equilibrium checks, scaled by the applied-load magnitude                                                                                                                |
| serialization | round-trip value equality, scaled by the magnitude of the serialized value                                                                                                       |

Every tolerance value in code and tests states its mathematical basis and units; raising
a tolerance requires a verification-report note (execution-handbook section 4, AGENTS.md).

Implemented geometry constants:

- `GEOMETRY_COMPARISON_TOLERANCE`: absolute `0`, relative `64 * Number.EPSILON`.
  This covers bounded fixed-size vector/matrix accumulation without imposing an absolute
  length in an arbitrary user unit system.
- `GEOMETRY_ORIENTATION_TOLERANCE`: absolute `0`, relative
  `sqrt(Number.EPSILON)`. Projection below this sine-angle boundary loses roughly half
  the significant digits and is rejected as an explicit near-parallel orientation.
- `MATERIAL_RELATION_TOLERANCE`: absolute `0`, relative `1e-9`, scaled by the
  reference shear modulus in `G = E / (2 * (1 + nu))`. This admits decimal serialization
  roundoff while rejecting materially inconsistent isotropic triples.

## 7. Negative zero

- IEEE-754 comparisons treat -0 and 0 as equal, so all numeric comparisons and tolerance
  checks already treat -0 as zero. Input -0 is finite and valid; it is treated as 0.
- At the serialization boundary, -0 is normalized to 0 in all output, so serialized
  output contains no -0 (specification section 4, FR-JSON-006). All other serialization
  ordering is fixed by the canonical rules (deterministic key and entity ordering,
  implementation-prompt section 21).

## 8. Determinism

- Identical finalized input produces deterministic ordering and repeatable results within
  documented limits (NFR-DET-001).
- Ordering is fixed everywhere: deterministic identifier ordering, fixed sparse assembly
  order, a deterministic reordering (reverse Cuthill-McKee), and no iteration over object
  key or hash order.
- Rounding: addition, subtraction, multiplication, division, and square root are exactly
  rounded per IEEE-754 and are therefore bit-deterministic. Transcendental functions
  (sin, cos, exp, and similar) are not specified by IEEE-754; identical results are
  guaranteed within one engine/runtime version, but bit-for-bit equality across different
  JS engines or compiler versions is not claimed.

## Not covered

- Rounding-mode selection: JavaScript exposes only the IEEE default (round to nearest,
  ties to even); see the determinism limits in section 8.
- Unit conversion: out of scope in version one (section 3).
- Per-feature sign details beyond the general rules of section 2 (for example the
  equivalent-load versus fixed-end-force sense) are fixed in the element theory
  documents.
