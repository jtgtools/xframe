# Verification Report

## Status

This report records the independent numerical evidence executed for xframe on 2026-07-31. It is an engineering verification record, not a formal certification.

The final verification corpus contains:

- independent verification tests including analytical, metamorphic, and OpenSees building oracles;
- 99 requested validation cases across all 12 categories in the supplied validation matrix;
- 565 reported requested-case numerical comparisons, all passing their declared tolerances;
- OpenSees Tcl building-oracle comparisons for cantilever, portal, two-story, truss, and eccentric cases;
- exhaustive classification of all 4,096 frame-end release masks without artificial stiffness regularization;
- analytical, metamorphic, seeded-property, sparse-solver, JSON, adversarial-identifier, and package-boundary tests.

The complete requested-case report is `requested-validation-report.md`; machine-readable results are in `requested-validation-results.json`.

## OpenSees oracle (OpenSees-only suite)

The independent external oracle is OpenSees version `3.8.0` (commit `6e55293513192aa05c7e1205e66a5a1a1ed088c4`), run as the native Tcl binary via `OPENSEES_BIN`, supplied separately from this MIT-licensed repository.

- Executable SHA-256: `5aa4e9c80c410c510ca62ac3b2f1d64a8e50679f0238e140b5bebcd6d5ddbe6d`
- Reproducible datasets: cantilever Euler beam, single-bay portal, two-story two-bay frame, triangular truss with settlement, and eccentric-truss rigid-link case
- Tcl inputs, parsed references, hashes, commands, units, and tolerances: `verification/reference-data/opensees/`
- Regeneration (Node-generated Tcl inputs allowed):

```bash
npm run regenerate:opensees
```

- Non-destructive verification command:

```bash
OPENSEES_BIN=/absolute/path/to/OpenSees npm run verify:opensees
```

The command runs all five Tcl datasets in a temporary directory, rejects an executable with a different SHA-256 hash, checks each input SHA-256 against its committed reference, and numerically compares every dataset output (displacements, reactions, member forces, truss axials) against the committed references before leaving the repository unchanged. Committed references hold measured OpenSees output, not xframe-derived values.

Two alignment facts are recorded. First, `geomTransf` vectors use `0 0 1` so in-plane bending activates the same `Iz` in both codes (an earlier `0 1 0` vector silently compared different bending planes). Second, vertical-member local frames differ by an exact 180-degree roll about local x, so those end forces compare through the exact per-end sign map `[Fx,-Fy,-Fz,Mx,-My,-Mz]`; X-beams, global displacements, reactions, truss axials, and all force magnitudes compare directly. Reactions admit an absolute noise floor of `1e-6` for free-DOF residuals from the two independent factorizations; everything else uses `1e-6` relative with `1e-9` absolute.

The suite was additionally executed on Linux through Wine against the downloaded official `OpenSees3.8.0` distribution (SHA-256 `5aa4e9c8…`, banner commit `6e55293…`): all five datasets ran to status zero and matched the committed references, including the eccentric-truss raw line `thetaA 0.66666666666666662966`.

### Direct result comparison

The oracle compares nodal displacements, reactions, local frame-end forces, truss axial forces, and prescribed-displacement (settlement) response across real building topologies. Building comparisons use relative tolerance `1e-6` and absolute tolerance `1e-9`, reflecting independent double-precision direct solvers on identical nodal-load models. The eccentric-truss oracle keeps its `1e-12 * (1 + max(abs))` comparison for rotations and axial force magnitude.

Portal and multi-story vertical members keep the documented 180-degree local-axis roll mapping for local force signs. Global stiffness, displacement, reaction, and force magnitudes agree; this is recorded as a convention difference, not a numerical defect.

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

The suite uses the requested per-case schema: test ID, description, model, supports/releases/springs/offsets, loads, reference method, reference values, library output, numerical error, tolerance rationale, and pass/fail. Direct OpenSees applicability is classified per case. Features OpenSees does not define—general affine constraints, native springs, streaming envelopes, JSON artifacts, and identifier safety—use analytical, equivalent-model, algebraic, or adversarial references rather than fabricated oracle equivalence.

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

The numerical counts above are retained as the 2026-07-31 historical execution record. Current safety-correctness evidence adds a pinned OpenSees 3.8.0 eccentric-truss rigid-link oracle and current result-schema, envelope, polynomial, and endpoint-limit contracts, now expanded to a five-dataset OpenSees-only building suite (cantilever, portal, two-story, truss, eccentric). The executable identity, hashes, tolerances, and observed output are recorded in [`safety-correctness-report.md`](safety-correctness-report.md).
