# XFrame Clean-Room Rewrite Implementation Directive

## 1. Mission

Create, in the current blank local directory, a complete professional structural-analysis engine for three-dimensional linear-elastic static analysis. This is an implementation assignment. Do not stop at planning, scaffolding, review, pseudocode, or another prompt.

The project is an architectural refactor and clean-room reimplementation. Reference material may guide requirements, mathematics, verification cases, and failure lessons, but do not name or copy any previous implementation. Do not mention predecessor projects in source files, documentation, comments, metadata, examples, tests, or reports.

Leave a complete, working repository in the current directory. Do not create or require a ZIP, tarball, installer, or other final artifact.

## 2. Non-negotiable project decisions

- Use npm exclusively for dependency installation and command orchestration.
- Do not use Bun, pnpm, Yarn, or alternative package managers.
- Use Vitest for unit, integration, regression, property, verification, and coverage tests.
- Do not use Jest or Node's built-in test runner.
- Use TypeScript and standards-compliant ESM.
- Support Node.js and modern standards-compliant browsers at runtime.
- Use lowercase kebab-case filenames.
- Start from a blank directory without assuming Git.
- Input is through the typed JavaScript/TypeScript API or fully validated JSON.
- CSV structural-model input is prohibited. Do not create CSV importers, CSV parsers, or CSV model-loading APIs.
- Do not create separate downstream installation projects or packaging ceremonies. Verify source, build output, exports, declarations, and browser-safe runtime boundaries inside the repository.
- Use the Ponytail skill at full scale when available. Preserve it under `.agents/skills/ponytail` and create `AGENTS.md` instructions for future agents.

## 3. Assurance target

The engine is intended for professional structural engineers performing structural analysis calculations. Develop it using certification-oriented assurance practices:

- explicit requirements;
- documented governing equations;
- deterministic algorithms and ordering;
- independent numerical verification;
- fail-closed validation and instability handling;
- structured diagnostics;
- reproducible npm installation and builds;
- explicit unsupported-feature rejection.

Do not claim formal certification, regulator approval, or that the engine replaces professional engineering judgment. Describe it only as developed using certification-oriented practices unless an actual external certification has occurred.

Engineering correctness outranks compatibility, speed, convenience, and feature count. A feature that cannot be derived, implemented consistently, and independently verified must remain unsupported.

## 4. Required execution method

The repository contains numbered plans under `.agents/references/plans/`. Execute them in order. Each part has its own `plan.md` and is an acceptance gate.

For every behavior:

1. Read the relevant part plan and prerequisite documents.
2. Write a failing Vitest test first.
3. Run the narrow test and confirm it fails for the intended reason.
4. Implement the smallest mathematically correct behavior.
5. Run the narrow test until it passes.
6. Run only the suites the edit touches: the narrow test file, `npm run typecheck` when types changed, `npm run lint`/`npm run format:check` on touched files.
7. Run `npm run check` once at part acceptance.
8. Record required numerical evidence and benchmark output.
9. Complete every checklist item before moving to the next part.

Never make a test pass by broadening tolerance without mathematical justification, skipping tests, inserting arbitrary stiffness, silently adding restraints, swallowing exceptions, or weakening validation.

## 5. Supported analytical scope

Version one is a complete linear-static 3D engine for the following defined scope.

### Structural entities

- Nodes in three-dimensional Cartesian space.
- Three-dimensional Euler-Bernoulli frame elements.
- Three-dimensional Timoshenko frame elements.
- Three-dimensional truss elements.
- Ground springs.
- Two-node springs.
- Translational and rotational restraints.
- Prescribed displacements.
- Member-end rigid offsets.
- Member-end releases.
- Rigid diaphragms in the three principal planes.
- General linear affine constraints.

### Loads

- Nodal forces and moments.
- Member point forces.
- Member point moments only after theory-consistent independent verification.
- Full-span uniform distributed loads.
- Full-span linearly varying loads.
- Partial-span uniform distributed loads.
- Partial-span linearly varying loads.
- Self-weight using explicit density and gravity.
- Multiple load cases.
- Linear load combinations.
- Positive and negative envelopes.

### Results

- Nodal displacements and active rotations.
- Support, prescribed-displacement, spring, and constraint reactions.
- Frame local and global end displacements.
- Frame local and global end forces.
- Truss axial extension, strain, force, and global end forces.
- Local-axis and deformable-end geometry.
- Internal frame-force sampling with explicit discontinuities.
- Complete case, combination, and envelope provenance.
- Residual, equilibrium, energy, pivot, equation-count, storage, and reuse diagnostics.

## 6. Explicit exclusions

Do not implement or imply support for geometric nonlinearity, material nonlinearity, second-order analysis, buckling, modal analysis, response spectra, time history, staged construction, plastic hinges, tension-only behavior, contact, moving loads, warping torsion, nonlinear soil behavior, structural design, reinforcement design, steel capacity checks, connection design, code-generated loading, or CSV model input.

Unsupported inputs must produce a stable `UNSUPPORTED_FEATURE` error.

## 7. Required repository structure

Create focused modules broadly following this layout:

```text
AGENTS.md
.agents/skills/ponytail/
.agents/references/
docs/api/
docs/architecture/
docs/roadmap/
docs/theory/
docs/verification/
examples/
schemas/
src/analysis/
src/constraints/
src/elements/
src/errors/
src/geometry/
src/linalg/
src/loads/
src/materials/
src/model/
src/results/
src/sections/
src/serialization/
src/units/
test/unit/
test/integration/
test/property/
test/regression/
verification/analytical/
verification/external/
verification/metamorphic/
verification/reference-data/
package.json
package-lock.json
tsconfig.json
tsconfig.build.json
vitest.config.ts
oxfmt.json
oxlint.json
README.md
```

Do not combine domain modeling, global assembly, factorization, and result recovery in one large module.

## 8. npm and quality toolchain

Use exact dependency versions, not caret or tilde ranges.

Configure strict TypeScript, Oxfmt, and Oxlint.

Required script behavior:

```json
{
  "format": "oxfmt --write .",
  "format:check": "oxfmt --check .",
  "lint": "oxlint .",
  "typecheck": "tsc -p tsconfig.json --noEmit",
  "build": "tsc -p tsconfig.build.json",
  "test": "vitest run",
  "test:watch": "vitest",
  "coverage": "vitest run --coverage",
  "verify": "vitest run verification",
  "benchmark": "node dist/scripts/run-benchmarks.js",
  "check": "npm run format:check && npm run lint && npm run typecheck && npm run test && npm run coverage && npm run verify && npm run build"
}
```

Adapt paths only when necessary; retain equivalent behavior.

## 9. TypeScript rules

Enable `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, `useUnknownInCatchVariables`, `noImplicitReturns`, `noPropertyAccessFromIndexSignature`, `verbatimModuleSyntax`, and `isolatedModules`.

Type-check production source, tests, verification code, examples, and scripts where practical. Avoid `any`. Never cast unvalidated JSON directly into trusted domain types.

## 10. Domain and identity rules

Separate mutable construction, immutable finalized models, prepared numerical systems, solved cases, combinations, envelopes, and serialized forms.

Use one global uniqueness domain for result-producing case and combination IDs. Validate identifiers and use `Map` or arrays, never ordinary object dictionaries for untrusted keys. Test `__proto__`, `constructor`, `prototype`, `toString`, whitespace, Unicode normalization, formula-like prefixes, and excessive length.

All multi-entity builder operations must be transactional. Failed convenience operations must leave the builder unchanged.

## 11. Units and conventions

Every model carries exact versioned unit metadata with required keys for length, force, moment, stress/modulus, distributed force, density, and rotation. Validate exact keys and reject missing, additional, or misspelled keys.

The initial engine may require one consistent user-supplied unit system and need not perform conversion. Rotations are radians. Coordinate and force signs must be documented.

## 12. Geometry and axes

Use deterministic right-handed orthonormal local systems. Validate finite coordinates, positive elastic length, axis norms, orthogonality, determinant near +1, orientation-vector degeneracy, fallback orientation, and connectivity reversal.

Rigid offsets define deformable endpoints. Member-load coordinates refer to the deformable member, not the node-to-node reference line.

## 13. Materials and sections

Support isotropic material input as `E + G`, `E + nu`, or consistent `E + G + nu`, checking `G = E / (2 * (1 + nu))` with combined absolute and relative tolerances.

Use separate frame-section and truss-section contracts. Truss sections require axial area only. Frame sections include area, torsional constant, two second moments, and theory-dependent effective shear areas. Do not require shear areas when they are not consumed.

Density is optional only when no density-dependent load is requested. Self-weight without density must fail and identify every affected entity.

## 14. Elements and theories

Frame theory is an explicit discriminated union: Euler-Bernoulli or Timoshenko. The selected theory must be applied consistently to stiffness, interpolation, equivalent nodal loads, fixed-end forces, point actions, uniform and linearly varying distributed loads, partial-span loads, end-force recovery, and internal-force recovery.

Never use Euler-Bernoulli member-load formulas with Timoshenko stiffness. Apply effective shear area exactly once.

Truss nodes use translational kinematics. Do not create rotational degrees of freedom merely to auto-restrain them.

Implement releases through exact condensation or an equally justified formulation. Enumerate and deterministically classify all 4,096 frame release masks. Do not add epsilon stiffness.

## 15. DOF topology and mechanisms

Derive active physical DOFs from element kinematics. Never scan zero stiffness rows and automatically restrain them. Never infer supports from absence of load, small stiffness, or numerical convenience.

Physical mechanisms must remain in the system and fail with structured diagnostics identifying node, DOF, equation, pivot, scale, related entities, and probable mechanism class.

## 16. Affine constraints

Support equations `sum(a_i * d_i) = b`, including restraints, prescribed displacements, equal-DOF relations, master-slave relations, rigid diaphragms, offsets, and general multipoint constraints.

Canonicalize terms, combine duplicates, remove scaled zeros, detect cycles, contradictions, redundancy, and rank deficiency. Compile sparsely using substitution or a sparse null-space method. Do not form a dense global transformation matrix. Recover full displacements and constraint reactions with source traceability.

## 17. Loads and combinations

Use explicit point-action fields such as `distanceFromElasticStart` and, separately, `positionRatio`. Do not use an ambiguous `position` property.

Support full-span and partial-span uniform and linearly varying member loads. Validate intervals after rigid offsets and elastic geometry are resolved.

Self-weight uses explicit density and gravity. Combination factors must be finite. Detect missing references, duplicate factors, nested cycles, and result-ID collisions. Prototype-like IDs must never disappear.

## 18. Sparse numerical architecture

Do not allocate dense global stiffness matrices or dense global constraint transforms.

Implement deterministic sparse assembly, reverse Cuthill-McKee ordering initially, skyline/profile Cholesky or another justified sparse symmetric direct solver, symbolic-analysis reuse, stiffness/factorization reuse, multiple RHS solves, and deterministic recovery.

Hide ordering and factorization behind internal interfaces. Estimate equation count, profile storage, bytes, and browser memory risk before allocation. Reject unsafe sizes with `MEMORY_LIMIT_EXCEEDED`. Use typed arrays in numerical kernels.

## 19. Diagnostics

For every solved case calculate normalized residual, maximum residual, force-equilibrium error, moment-equilibrium error, strain energy, external work, energy-balance error, minimum normalized pivot, active equation count, storage count, profile/bandwidth, and assembly/factorization reuse flags.

Finite output alone is not success. Reject non-finite values at public input, finalization, assembly, factorization, solve, recovery, and serialization boundaries.

## 20. Results, combinations, and envelopes

Use distinct frame, truss, spring, case, combination, and envelope result contracts. Keep constructors internal. Local and global typed arrays must not alias.

Envelope provenance includes result ID, result kind, component, entity, extremum sign/type, and member location when relevant. Large envelopes must stream without retaining all source results.

## 21. JSON input and serialization

The only external text input is validated JSON. CSV model input must not exist.

Create versioned complete JSON schemas for model input and results. Validate every required property, exact tuple lengths, discriminated unions, exact unit keys, identifiers, cross-references, finite values, unknown-property policy, local axes, deformable endpoints, theory, releases, diagnostics, and provenance.

Schema version controls compatibility, not exact package version. Canonical serialization uses deterministic key/entity ordering and a defined negative-zero policy. Use SHA-256 only when cryptographic identity is required; label fast in-memory fingerprints honestly.

## 22. Public errors

All public failures use stable codes and structured contexts. At minimum include codes for invalid input, duplicate IDs, missing references, units, geometry, material, section, loads, constraints, local mechanisms, global mechanisms, factorization, non-finite values, memory limits, unsupported schemas, invalid schemas, incompatible results, and unsupported features.

Users must not need to parse prose messages.

## 23. Verification requirements

Use independent evidence: closed forms, hand matrices, external reference data, split-member equivalence, energy and equilibrium identities, Maxwell-Betti reciprocity, metamorphic tests, and independent high-precision calculations where useful.

Provide at least twelve independent structural verification cases and at least one hundred finite scalar comparisons. Cover every supported element, load, constraint, offset, release, theory, combination, result, and serialization boundary.

Every tolerance must state its mathematical/numerical basis.

## 24. Mandatory regressions

Prove at minimum:

- an under-restrained truss fails;
- free translations are never auto-restrained;
- truss rotations are absent by topology;
- missing density plus self-weight fails;
- prototype-like IDs are safe;
- cases and combinations cannot collide;
- Timoshenko member loads are Timoshenko-consistent;
- point moments are verified before exposure;
- partial-span loads pass independent checks;
- all 4,096 release masks are classified;
- rigid offsets use deformable endpoints;
- effective shear area is applied once;
- incomplete JSON fails;
- wrong unit keys fail;
- non-finite inputs/outputs fail;
- invalid member-load coordinates fail at finalization;
- contradictory/cyclic constraints fail;
- builder transactions roll back;
- local/global result arrays are independent;
- a 150,000-record envelope remains streaming and bounded.

## 25. Coverage and benchmark gates

Vitest thresholds: 95% statements, 95% lines, 95% functions, and 90% branches. Coverage does not replace analytical verification.

Create deterministic benchmark families near 500, 2,000, 5,000, and conditionally 10,000 equations. Measure topology, assembly, ordering, factorization, solve, recovery, memory estimate, reuse, and multi-case throughput. Add checks that prevent accidental dense global allocation. Record environment and raw results without making universal timing claims.

## 26. Documentation

Produce README, architecture, API reference, supported scope, explicit exclusions, theory derivations, units and signs, constraints, loads, solver architecture, diagnostics, JSON schemas, verification report, benchmark report, engineering limitations, security-reporting policy, and roadmap.

Do not mention predecessor implementations or claim formal certification.

## 27. Required completion commands

From a clean installation:

```bash
rm -rf node_modules
npm ci
npm run check
npm run benchmark
```

Also document equivalent Windows cleanup commands. `package-lock.json` must remain unchanged after `npm ci` and checks.

## 28. Completion report

Do not create a final archive or separate downstream project. Leave the working repository in the current directory.

Report only executed facts: Node/npm/dependency versions, test count, independent verification count, finite comparison count, 4,096-release status, benchmark models/results, supported scope, exclusions, unresolved limitations, commands executed, and failures.

Do not conceal incomplete work and do not claim formal certification.
