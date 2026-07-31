# Technical Specification

## 1. Product definition

A professional TypeScript engine for deterministic three-dimensional linear-elastic static structural analysis. “Full structural analysis engine” means complete implementation of the defined linear-static 3D scope, not nonlinear, dynamic, buckling, or structural-design functionality.

## 2. Functional requirements

### Model and identity

- **FR-MOD-001:** Construct models from nodes, materials, sections, elements, restraints, springs, constraints, load cases, and combinations.
- **FR-MOD-002:** Finalized models are immutable.
- **FR-MOD-003:** Identifiers are validated, deterministically ordered, and safely stored.
- **FR-MOD-004:** Cases and combinations share one result-ID collision domain.
- **FR-MOD-005:** Multi-entity mutations are atomic.
- **FR-MOD-006:** Empty, unresolved, or analysis-incomplete models fail finalization.

### Units and geometry

- **FR-UNT-001:** Every model has exact versioned unit metadata.
- **FR-UNT-002:** Missing, additional, or incorrect unit keys fail.
- **FR-GEO-001:** Coordinates and geometric inputs are finite.
- **FR-GEO-002:** Zero/effectively-zero element lengths fail.
- **FR-GEO-003:** Frame local axes are right-handed and orthonormal.
- **FR-GEO-004:** Degenerate orientation vectors fail deterministically.
- **FR-GEO-005:** Rigid offsets define deformable endpoints and elastic length.
- **FR-GEO-006:** Connectivity reversal preserves equivalent global behavior.

### Materials and sections

- **FR-MAT-001:** Isotropic material input supports `E+G`, `E+nu`, or consistent `E+G+nu`.
- **FR-MAT-002:** Self-weight requires density.
- **FR-SEC-001:** Frame and truss sections are distinct contracts.
- **FR-SEC-002:** Timoshenko shear areas are required only when consumed.
- **FR-SEC-003:** Consumed properties are finite and physically valid.

### Elements and DOFs

- **FR-ELE-001:** Support 3D Euler-Bernoulli frames.
- **FR-ELE-002:** Support 3D Timoshenko frames.
- **FR-ELE-003:** Support 3D trusses.
- **FR-ELE-004:** Support ground and two-node springs.
- **FR-ELE-005:** Support exact frame-end release condensation.
- **FR-ELE-006:** Classify all 4,096 frame release masks.
- **FR-DOF-001:** Derive active DOFs from physical kinematics.
- **FR-DOF-002:** Truss-only rotations are absent, not auto-restrained.
- **FR-DOF-003:** Mechanisms fail closed with physical diagnostics.

### Constraints

- **FR-CON-001:** Support general affine equations `sum(a_i d_i)=b`.
- **FR-CON-002:** Detect cycles, contradictions, redundancy, and rank deficiency.
- **FR-CON-003:** Compile constraints without a dense global transform.
- **FR-CON-004:** Recover full displacements and constraint reactions.

### Loads

- **FR-LOD-001:** Support nodal forces and moments.
- **FR-LOD-002:** Use unambiguous physical member coordinates or explicitly named ratios.
- **FR-LOD-003:** Support member point moments only after independent theory-consistent verification.
- **FR-LOD-004:** Support full- and partial-span uniform loads.
- **FR-LOD-005:** Support full- and partial-span linearly varying loads.
- **FR-LOD-006:** Support self-weight using explicit density and gravity.
- **FR-LOD-007:** Equivalent nodal loads are consistent with the selected frame theory.

### Solver

- **FR-SOL-001:** Global assembly is sparse and deterministic.
- **FR-SOL-002:** Provide reverse Cuthill-McKee ordering initially.
- **FR-SOL-003:** Provide a justified sparse symmetric direct factorization initially.
- **FR-SOL-004:** Reuse symbolic work, stiffness assembly, and factorization for compatible cases.
- **FR-SOL-005:** Reject unsafe memory requirements before allocation.
- **FR-SOL-006:** Dense global stiffness and dense constraint transforms are prohibited.
- **FR-SOL-007:** Singular/near-singular pivots produce structured diagnostics.

### Results and diagnostics

- **FR-RES-001:** Return nodal displacements, rotations where active, and reactions.
- **FR-RES-002:** Return frame local/global end displacements and forces.
- **FR-RES-003:** Return truss extension, strain, force, and global end forces.
- **FR-RES-004:** Return internal frame-force samples with explicit discontinuities.
- **FR-RES-005:** Local and global result arrays do not alias.
- **FR-RES-006:** Combinations/envelopes retain complete provenance.
- **FR-RES-007:** Large envelope processing is streaming.
- **FR-DIA-001:** Report residual, equilibrium, energy, pivot, equation, storage, profile, and reuse diagnostics.

### JSON and public boundaries

- **FR-JSON-001:** Programmatic API and validated JSON are the only model-input mechanisms.
- **FR-JSON-002:** CSV model input does not exist.
- **FR-JSON-003:** JSON validation covers every required field and cross-reference.
- **FR-JSON-004:** Non-finite values fail.
- **FR-JSON-005:** Schema version controls compatibility.
- **FR-JSON-006:** Canonical serialization is deterministic.
- **FR-ERR-001:** Public errors use stable codes and typed contexts.

## 3. Nonfunctional requirements

- **NFR-COR-001:** Every numerical feature has independent verification.
- **NFR-COR-002:** Unsupported behavior is rejected, never silently approximated.
- **NFR-DET-001:** Identical finalized input produces deterministic ordering and repeatable floating-point results within documented limits.
- **NFR-PER-001:** Global numerical storage is sparse.
- **NFR-PER-002:** Benchmarks cover approximately 500, 2,000, 5,000, and conditionally 10,000 equations.
- **NFR-SEC-001:** Untrusted IDs/JSON cannot cause prototype pollution.
- **NFR-SEC-002:** Allocation arithmetic is overflow-safe and limited.
- **NFR-QUA-001:** Vitest coverage meets 95% statements, lines, and functions; 90% branches.
- **NFR-API-001:** Public APIs are typed, documented, immutable where appropriate, and domain-specific.
- **NFR-PLT-001:** Runtime modules work in Node and modern browsers without Node-only imports.
- **NFR-ASS-001:** Documentation does not claim formal certification.

## 4. Numerical conventions

- IEEE-754 double precision through `number` and `Float64Array`.
- Right-handed axes and rotations in radians.
- One internally consistent unit system per model.
- Combined relative and absolute tolerances.
- Scale-aware residual and pivot tests.
- Canonical negative-zero policy for serialization.
- Non-finite values rejected at every public and numerical boundary.

## 5. Verification minimums

| Area                    | Required independent evidence                     |
| ----------------------- | ------------------------------------------------- |
| Axial/truss             | Closed-form extension, reactions, and energy      |
| Euler-Bernoulli frame   | Cantilever and simply-supported closed forms      |
| Timoshenko frame        | Independent shear-flexible reference              |
| Point force             | Closed form or split-member equivalence           |
| Point moment            | Split-member and equilibrium                      |
| Uniform load            | Closed form                                       |
| Linearly varying load   | Closed form/reference data                        |
| Partial-span load       | Piecewise closed form/reference data              |
| Rigid offsets           | Equilibrium and virtual-work/reference check      |
| Releases                | All 4,096 masks plus selected analytical cases    |
| Springs                 | Closed form                                       |
| Prescribed displacement | Closed form and reaction check                    |
| Affine constraints      | Hand matrices and invalid-system cases            |
| Combinations            | Superposition identity                            |
| Envelopes               | Hand-selected governing values                    |
| JSON                    | Complete round-trip and malformed-input rejection |

## 6. Requirement completion rule

A requirement is complete only when it has an implementation location, one or more test IDs, independent evidence where applicable, and no unresolved high-severity audit item.
