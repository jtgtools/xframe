# Execution Handbook for Every Part

This handbook exists to prevent an implementation agent from guessing, skipping evidence, or moving too quickly. Apply it together with the current part's `plan.md`.

## 1. Start-of-part procedure

1. Open the current `plan.md` and read it completely.
2. Open the master implementation prompt, technical specification, architecture, and roadmap.
3. Confirm every prerequisite part is marked `complete`.
4. Run `npm run lint`, `npm run typecheck`, `npm run test`, `npm run verify`, and `npm run build` before editing. If it fails, repair the existing failure first.
5. Mark the current part `in-progress` in `docs/roadmap/progress.md`.
6. List the requirement IDs affected by the part.
7. Create an architecture decision only when the existing architecture cannot satisfy the requirement.
8. Do not begin production code before at least one intended failing test exists.

## 2. Per-behavior TDD loop

Use this exact sequence for every independently testable behavior:

- [ ] Name the behavior and requirement ID in the test title.
- [ ] Construct the smallest input that isolates the behavior.
- [ ] Calculate the expected value independently of production code.
- [ ] State units, sign convention, and tolerance beside the expectation.
- [ ] Run the one test file and confirm failure for the expected reason.
- [ ] If it fails for setup or syntax, correct the test until the intended missing behavior is the reason.
- [ ] Implement only the required behavior.
- [ ] Run the one test file.
- [ ] Run neighboring unit tests.
- [ ] Run relevant integration and verification tests.
- [ ] Run type checking and linting only when the edit touches types or style.

Suggested naming:

```ts
it("FR-LOD-004: converts a partial uniform load into equilibrium-preserving nodal actions", () => {
  // Arrange independently defined model and reference values.
  // Act through the public or designated kernel API.
  // Assert force, moment, energy, and finite-value properties.
});
```

## 3. Independent expected-value rules

Do not obtain expected values by calling the function being tested or a nearby production helper that uses the same equations.

Preferred evidence order:

1. hand-calculated small matrix;
2. published closed-form equation;
3. independent reference dataset with documented provenance;
4. split-member or alternate-model equivalence;
5. energy/equilibrium/reciprocity identity;
6. separate high-precision reference script whose algorithm is materially independent.

Every expected value must record:

- physical meaning;
- unit;
- sign convention;
- reference equation or source;
- numerical substitution;
- exact expected value or independently computed reference;
- absolute tolerance;
- relative tolerance;
- reason for both tolerances.

## 4. Tolerance decision guide

Do not use one global epsilon.

Use a combined check of the form:

```text
absolute_error <= absolute_tolerance + relative_tolerance * reference_scale
```

Choose `reference_scale` from a physically meaningful quantity, not arbitrarily from the computed answer when that could hide failure.

Before changing a tolerance:

- verify units;
- verify local/global axes;
- verify sign convention;
- verify equivalent-load versus fixed-end-force convention;
- verify connectivity direction;
- inspect residual and equilibrium errors;
- compare individual matrix terms;
- run the same case at scaled geometry/load/stiffness;
- determine whether the discrepancy is conditioning, roundoff, or an implementation defect.

A tolerance increase requires a note in the verification report.

## 5. Numerical debugging order

When a structural result is wrong, inspect in this order:

1. validated input and units;
2. node coordinates and deformable endpoints;
3. local axes and transformation determinant;
4. material and section values;
5. physical DOF topology;
6. constraints and reduced mapping;
7. element local stiffness;
8. element equivalent-load vector;
9. release condensation;
10. rigid-offset transform;
11. global equation map;
12. sparse assembled entries;
13. ordering permutation;
14. factorization pivots;
15. reduced RHS;
16. reduced solution;
17. recovered full displacement;
18. reactions;
19. element end forces;
20. internal-force reconstruction;
21. diagnostics and serialization.

Do not alter several layers simultaneously. Add a focused test at the first layer where actual data diverges from independent expectation.

## 6. Structured-error checklist

For every invalid case, verify:

- stable error code;
- relevant entity type and ID;
- exact field path where applicable;
- actual invalid value where safe;
- expected condition;
- node/DOF/equation/pivot for numerical failures;
- related constraints/elements;
- deterministic ordering when several errors are returned;
- no reliance on message-text parsing.

## 7. Matrix and memory review

Before adding any numerical structure, answer:

- Is it fixed-size element data or global model data?
- What is its asymptotic memory cost?
- Can its dimensions overflow safe integer arithmetic?
- Is memory estimated before allocation?
- Can it approach dense behavior?
- Is its ordering deterministic?
- Is it reused safely?
- Does it expose mutable storage?

Permitted dense data: small fixed-size matrices such as 3x3, 6x6, or 12x12 element kernels.

Prohibited dense data: any global `numberOfEquations × numberOfEquations` stiffness, mass-like, constraint, or transformation matrix.

## 8. Benchmark protocol

Each benchmark must define:

- deterministic generator and seed;
- model family;
- node/element/case count;
- physical DOF count;
- reduced equation count;
- sparse/profile storage count;
- estimated bytes;
- topology time;
- assembly time;
- ordering time;
- factorization time;
- solve time;
- recovery time;
- number of RHS/load cases;
- reuse state;
- Node, npm, operating system, CPU, and memory;
- warm-up and repetition count;
- raw measurements and chosen summary statistic.

Benchmarks are regression evidence, not universal performance promises. Fail a benchmark gate based on structural regressions such as dense allocation, extreme storage growth, or loss of reuse—not normal small timing noise.

## 9. Property-test protocol

- Use deterministic seeded generators.
- Bound generated values to meaningful engineering and numerical domains.
- Include small, large, and mixed scales.
- Preserve the seed and minimized failing input.
- Avoid generating mostly invalid models unless testing validation.
- Assert physical identities, not merely finite output.
- Include translation, rotation, reversal, subdivision, scaling, superposition, reciprocity, energy, and equilibrium properties.

## 10. Documentation-before-implementation cases

Write or update the theory document before code when implementing:

- coordinate transforms;
- Timoshenko stiffness or loads;
- release condensation;
- rigid offsets;
- affine reduction;
- factorization and pivot scaling;
- reaction recovery;
- internal-force reconstruction;
- result compatibility;
- canonical serialization.

Each theory document must state symbols, dimensions, units, signs, assumptions, governing equations, edge cases, and verification cases.

## 11. Part review procedure

Before marking a part complete:

1. Inspect every file listed as owned by the part.
2. Search for `TODO`, `FIXME`, placeholder throws, empty catch blocks, disabled tests, broad suppressions, and unvalidated casts.
3. Review all new public exports.
4. Confirm every invalid input has a deliberate outcome.
5. Confirm all arrays have clear ownership.
6. Confirm all numerical outputs are checked for finiteness.
7. Confirm no dense global allocation exists.
8. Run the complete required command sequence.
9. Read stored evidence against raw output.
10. Mark the part complete only after all evidence is present.

## 12. Failure severity

- **Critical:** wrong physical result, silent mechanism stabilization, theory inconsistency, unsafe deserialization, non-finite accepted as valid, dense architecture replacing sparse requirement. Stop immediately.
- **Major:** missing supported feature, incomplete reaction/result recovery, unstable nondeterminism, incorrect public contract, missing cross-reference validation. Stop the part.
- **Moderate:** poor diagnostic context, incomplete documentation, inadequate benchmark evidence, weak edge-case coverage. Repair before completion.
- **Minor:** naming, localized duplication, nonessential documentation polish. Repair before the final audit.

## 13. Forbidden shortcuts

- Do not substitute a library solver without documenting its algorithm, browser/runtime effect, dependency cost, license, deterministic behavior, and verification.
- Do not snapshot large numeric outputs as the sole oracle.
- Do not treat coverage percentage as proof of correctness.
- Do not mark unsupported behavior as “approximately supported.”
- Do not accept malformed JSON and rely on downstream crashes.
- Do not make the solver stable by fixing unloaded or zero rows.
- Do not change a sign convention in one module without updating equations, tests, and documentation.
- Do not proceed while a previous part is blocked.
