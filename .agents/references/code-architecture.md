# Code Architecture

## 1. Dependency direction

```text
public API
  -> input validation and model builder
  -> immutable finalized model
  -> DOF topology and preparation
  -> affine constraint compiler
  -> sparse assembly
  -> ordering and factorization
  -> case solve and recovery
  -> results, diagnostics, combinations, envelopes
```

Lower layers must not import higher layers.

## 2. Module responsibilities

- `src/errors`: stable error codes, typed contexts, constructors, formatting.
- `src/units`: exact versioned unit metadata and consistency assertions; no conversion in version one.
- `src/geometry`: vectors, fixed-size transforms, local axes, tolerances, rigid-offset geometry.
- `src/materials`: immutable isotropic materials and modulus consistency.
- `src/sections`: distinct frame/truss sections.
- `src/elements`: frame, truss, and spring records plus local stiffness/load/recovery kernels.
- `src/loads`: nodal/member/self-weight loads, cases, combinations, discontinuity metadata.
- `src/constraints`: affine equations, canonicalization, rank checks, sparse reduction, recovery.
- `src/model`: transactional builder, registries, cross-references, finalization, immutable model.
- `src/linalg`: sparse assembly, graph ordering, profile/skyline storage, factorization, solves, residuals, memory estimates.
- `src/analysis`: preparation, caching/reuse, load-case orchestration, reaction and element-result recovery.
- `src/results`: immutable results, diagnostics, combinations, streaming envelopes, internal-force diagrams.
- `src/serialization`: complete JSON schemas/validators, canonical JSON, schema compatibility, cryptographic identity.

## 3. Recommended public boundary

```ts
export interface ModelBuilder {
  addNode(input: NodeInput): ModelBuilder;
  addMaterial(input: MaterialInput): ModelBuilder;
  addFrameSection(input: FrameSectionInput): ModelBuilder;
  addTrussSection(input: TrussSectionInput): ModelBuilder;
  addFrame(input: FrameInput): ModelBuilder;
  addTruss(input: TrussInput): ModelBuilder;
  addSpring(input: SpringInput): ModelBuilder;
  addConstraint(input: ConstraintInput): ModelBuilder;
  addLoadCase(input: LoadCaseInput): ModelBuilder;
  addCombination(input: CombinationInput): ModelBuilder;
  finalize(): FinalizedModel;
}

export interface AnalysisEngine {
  prepare(model: FinalizedModel): PreparedAnalysis;
}

export interface PreparedAnalysis {
  solveCase(caseId: ResultId): CaseResult;
  solveCases(caseIds?: readonly ResultId[]): readonly CaseResult[];
  combine(request: CombinationRequest): CombinationResult;
  envelope(request: EnvelopeRequest): EnvelopeResult;
}
```

Public names may be refined in the specification stage. Freeze them after Part 02 unless a documented defect requires change.

## 4. Immutability and ownership

- Builder state is private and transactional.
- Finalized records are readonly and copied from caller-owned input.
- Preparation owns mutable typed arrays that are never exposed.
- Results expose immutable views or copies.
- Local/global arrays are separately allocated.
- Serialization never mutates source objects.

## 5. Numerical-kernel rules

- Fixed-size element operations may use compact dense typed arrays.
- Global numerical operations must be sparse/profile based.
- Each kernel has focused unit tests and at least one mathematical oracle.
- Tolerances are centralized and named.
- No hidden module-level mutable state.
- Randomized tests use fixed seeds and persist failing examples.

## 6. Dependency restrictions

- Foundational modules: `errors`, `units`, `geometry`.
- `materials` and `sections` depend only on foundations.
- `elements` depends on foundations and domain property modules, not global factorization.
- `model` depends on domain definitions, not numerical solvers.
- `constraints` depends on DOF identifiers and linalg primitives, not results.
- `analysis` orchestrates numerical/domain modules.
- `serialization` depends on trusted public domain/result types, not builder internals.
- Tests and examples import public APIs whenever feasible.

Enforce restricted imports with Oxlint rules or a dedicated script.

## 7. Data flow

1. Untrusted API/JSON input enters validators and the builder.
2. Builder performs local checks and staged transactional mutations.
3. Finalization resolves references, units, geometry, offsets, load coordinates, IDs, and completeness.
4. DOF topology derives physical active DOFs.
5. Constraint compiler produces sparse reduced mappings.
6. Element kernels produce local stiffness and equivalent loads.
7. Sparse assembly accumulates global terms.
8. RCM reduces profile.
9. Factorization checks positive definiteness and stores reusable factors.
10. Load cases assemble right-hand sides and reuse factors.
11. Recovery reconstructs full displacement, reactions, element results, internal forces, and diagnostics.
12. Combinations/envelopes operate only on compatible immutable results.
13. Serialization emits or validates canonical JSON.

## 8. Runtime platform boundary

Production runtime modules must not import `node:fs`, `node:path`, `node:crypto`, `node:stream`, or process-only APIs. Scripts may use Node APIs. Browser-capable cryptographic hashing should use Web Crypto through an isolated abstraction.

## 9. Error taxonomy

Suggested stable codes:

`INPUT_INVALID`, `IDENTIFIER_INVALID`, `DUPLICATE_IDENTIFIER`, `REFERENCE_NOT_FOUND`, `UNITS_INVALID`, `GEOMETRY_INVALID`, `MATERIAL_INVALID`, `SECTION_INVALID`, `LOAD_INVALID`, `CONSTRAINT_CONTRADICTION`, `CONSTRAINT_CYCLE`, `CONSTRAINT_RANK_DEFICIENT`, `ELEMENT_LOCAL_MECHANISM`, `GLOBAL_MECHANISM`, `FACTORIZATION_FAILED`, `NON_FINITE_VALUE`, `MEMORY_LIMIT_EXCEEDED`, `SCHEMA_UNSUPPORTED`, `SCHEMA_INVALID`, `RESULT_INCOMPATIBLE`, `UNSUPPORTED_FEATURE`.

Each code has a typed context union.

## 10. Architecture gates

- No circular imports.
- No unexplained oversized source files.
- No dense global matrix type.
- No ordinary object map for untrusted identifiers.
- No public mutable typed arrays.
- No public solved-result constructors.
- No unvalidated JSON cast.
- No numerical feature without requirement/test/evidence ownership.
