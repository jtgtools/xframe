# Verification Report

## Status

This report records the independent numerical evidence executed for xframe on 2026-07-31. It is an engineering verification record, not a formal certification.

The final verification corpus contains:

- 137 independent verification tests;
- 99 requested validation cases across all 12 categories in the supplied validation matrix;
- 565 reported requested-case numerical comparisons, all passing their declared tolerances;
- 6,552 direct Frame3DD stiffness-matrix entry comparisons;
- exhaustive classification of all 4,096 frame-end release masks without artificial stiffness regularization;
- analytical, metamorphic, seeded-property, sparse-solver, JSON, adversarial-identifier, and package-boundary tests.

The complete requested-case report is `requested-validation-report.md`; machine-readable results are in `requested-validation-results.json`.

## Frame3DD oracle

The independent external oracle is Frame3DD version `20140514+`, supplied separately from this MIT-licensed repository.

- Linux executable SHA-256: `53b1dc6628424b156e491e3205f13d58a0e325e33e4746d225b456ab85ac5275`
- Geometric stiffness: disabled
- Shear deformation: tested both disabled and enabled
- Reproducible datasets: Euler cantilever, Timoshenko cantilever, two-member chain, triangular truss, single-bay portal, and two-story two-bay frame
- Raw inputs, text outputs, CSV outputs, element matrices, assembled matrices, hashes, parsed results, commands, units, and tolerances: `verification/reference-data/frame3dd/`
- Non-destructive reproduction command:

```bash
FRAME3DD_BIN=/absolute/path/to/frame3dd npm run verify:frame3dd
```

The command regenerates all six datasets in a temporary directory, rejects an executable with a different SHA-256 hash, canonicalizes the parsed records, compares them with the committed references, and leaves the repository unchanged.

### Direct stiffness comparison

Direct element and assembled-global comparisons cover:

| Dataset                 | Element matrices |  Global matrix | Matrix entries compared |
| ----------------------- | ---------------: | -------------: | ----------------------: |
| Euler cantilever        |        1 × 12×12 |          12×12 |                     288 |
| Timoshenko cantilever   |        1 × 12×12 |          12×12 |                     288 |
| Two-member chain        |        2 × 12×12 |          18×18 |                     612 |
| Single-bay portal       |        3 × 12×12 |          24×24 |                   1,008 |
| Two-story two-bay frame |       10 × 12×12 |          54×54 |                   4,356 |
| **Total**               |  **17 matrices** | **5 matrices** |               **6,552** |

Matrix comparisons use relative tolerance `2e-7` and absolute tolerance `1e-8`. Frame3DD stores relevant input fields in single precision before writing twelve-digit debug matrices, so a double-roundoff tolerance would not reflect the oracle data path.

### Direct result comparison

The oracle also compares nodal displacements, reactions, local frame-end forces, truss axial forces, uniform and varying member loads, point actions, self-weight, multiple members, multi-story assembly, and prescribed-displacement overlap. Printed Frame3DD results use relative tolerance `2e-5` and absolute tolerance `2e-7`, reflecting the approximately six significant digits in its text output.

Portal and multi-story vertical members require a documented 180-degree local-axis roll mapping for local force signs. Global stiffness, displacement, reaction, and force magnitudes agree; this is recorded as a convention difference, not a numerical defect.

### Frame3DD discrepancies not copied into xframe

Two reproducible discrepancies in the supplied Frame3DD executable are retained as defect evidence rather than adopted as expected behavior:

1. An interior axial point force uses the opposite end distances for the two axial fixed-end actions.
2. Timoshenko transverse point-force response uses the opposite bending-plane shear parameters.

Affected displacement components are checked against independent closed forms. Unaffected reactions and end forces remain compared directly with Frame3DD.

## Requested validation matrix

All 12 categories are represented by executable cases:

| Category | Cases | Failures | Maximum reported error |
| -------: | ----: | -------: | ---------------------: |
|        1 |    17 |        0 |         `7.31725e-14%` |
|        2 |     6 |        0 |         `1.10915e-13%` |
|        3 |    24 |        0 |         `1.89045e-13%` |
|        4 |     6 |        0 |         `1.08379e-13%` |
|        5 |     7 |        0 |         `6.96988e-11%` |
|        6 |     3 |        0 |          `6.0633e-14%` |
|        7 |     5 |        0 |               `3e-08%` |
|        8 |     7 |        0 |         `6.46752e-14%` |
|        9 |     8 |        0 |         `7.84463e-12%` |
|       10 |     6 |        0 |         `0.000452115%` |
|       11 |     7 |        0 |         `6.00371e-09%` |
|       12 |     3 |        0 |         `1.58074e-14%` |

The suite uses the requested per-case schema: test ID, description, model, supports/releases/springs/offsets, loads, reference method, reference values, library output, numerical error, tolerance rationale, and pass/fail. Direct Frame3DD applicability is classified per case. Features Frame3DD does not define—general affine constraints, native springs, streaming envelopes, JSON artifacts, and identifier safety—use analytical, equivalent-model, algebraic, or adversarial references rather than fabricated Frame3DD equivalence.

## Product defect found by the expanded suite

The arbitrary 3D support tests exposed a genuine xframe defect in sparse affine reduction. When a symmetric off-diagonal full-stiffness term mapped both source DOFs to the same reduced DOF, the reduced diagonal received one contribution instead of both symmetric contributions. The reproducing oblique-truss case had a 33.33% effective-stiffness error and a spurious reaction.

The shared reduction operation was repaired, and `FR-CON-003/NFR-COR-001` now verifies exact `EA/L` stiffness, axial displacement, and member force for two independent oblique restraints.

## Other independent evidence

- Classical Euler-Bernoulli cantilever, simply supported, fixed-fixed, propped, overhang, two-span, and three-span solutions
- Timoshenko deep-beam, pure-moment, slenderness, shear-area, simply-supported UDL, and infinite-shear-rigidity limits
- 24 isolated end-DOF compliance checks across Euler-Bernoulli and Timoshenko formulations
- Rigid offsets, eccentric offsets, release ordering, and equivalent clear-span models
- Arbitrary 3D orientation, roll angles, biaxial bending, and rotational covariance
- Fixed, pinned, roller, partial, affine, and deliberately unstable restraints
- Translational/rotational springs, series/parallel response, and stiffness limits
- Exact release condensation and all 4,096 release masks
- Nodal, point, point-moment, uniform, partial trapezoidal, global-direction, self-weight, and superposed loads
- Portal, L-frame, tetrahedral truss, grid, multi-story, symmetric, and antisymmetric systems
- Equilibrium, matrix symmetry, Maxwell-Betti reciprocity, subdivision invariance, SI/imperial equivalence, and extreme stiffness ratios
- Traceable Kassimali, Cowper, and Monforton-Wu reference cases

## Scope boundary

Verification supports the implemented linear-elastic static analysis scope. It does not establish geometric or material nonlinearity, P-Delta, buckling, dynamics, temperature loading, moving loads, design-code checking, or certification-grade fitness for a particular project. Independent engineering review remains required.

## Safety-correctness extension (2026-08-08)

The numerical counts above are retained as the 2026-07-31 historical execution record. Current safety-correctness evidence adds a pinned OpenSees 3.8.0 eccentric-truss rigid-link oracle and current result-schema, envelope, polynomial, and endpoint-limit contracts. The executable identity, hashes, tolerances, and observed output are recorded in [`safety-correctness-report.md`](safety-correctness-report.md).
