# System Architecture

xframe uses one directional pipeline:

1. `ModelBuilder` validates local shape and owns copied records.
2. Finalization resolves references, units, element geometry, physical DOFs, loads, and result dependencies into an immutable `FinalizedModel`.
3. Element kernels produce local stiffness and equivalent-load vectors for frames, trusses, and springs.
4. Sparse coordinate assembly builds the full symmetric stiffness matrix.
5. The affine constraint compiler creates a sparse mapping `u = Tq + u0` and reduces `K` and each load without constructing a dense global transform.
6. Deterministic reverse Cuthill-McKee ordering and skyline Cholesky factorization prepare the reusable system.
7. Case solves recover full displacements, reactions, element actions, exact internal-force polynomial segments, derived stations, and diagnostics.
8. Result functions combine compatible cases or stream envelopes.
9. Serialization converts finalized models and results to strict versioned artifacts.

Runtime dependencies point inward from public orchestration to pure domain and numerical kernels. Node-only filesystem/process code is restricted to tests, benchmarks, and reference-generation scripts. The runtime package uses only standard JavaScript and Web Crypto.

The sparse matrix convention is lower-triangular coordinate storage. Ordering uses `permutation[newIndex] = oldIndex`; public solution vectors are restored to original physical-equation order. Skyline memory is preflighted before allocation. There is no dense global stiffness, mass, or constraint matrix.

Element implementations remain separate because their active DOFs and physics differ. Frames have twelve deformable-end DOFs. A zero-offset truss uses translational axial behavior; a truss endpoint with a nonzero rigid offset activates all six reference-node DOFs, including physical rotations. Its sparse local stiffness is assembled from the compatibility vector `B` as `(EA/L) B^T B`, and self-weight uses the matching rigid-arm force transform. Unsupported free rotations remain physical global mechanisms rather than hidden restraints. Springs activate only explicitly nonzero components. Shared geometry and rigid-offset transformations are reused rather than hidden behind a generic one-implementation abstraction.

Envelope streaming is a strict boundary: every record supplies model fingerprint, complete units, result conventions, and exact ordered component layout before any envelope value is read. Result serialization retains model schema version `1` and publishes result schema version `2`.

See [structural model theory](../theory/structural-model.md), [solution and results](../theory/solution-and-results.md), and the [verification report](../verification/verification-report.md).
