# Engineering Use and Limitations

xframe is a linear-static 3D analysis engine. It is not formally certified and does not establish that a structure, member, connection, or foundation complies with any code or is safe. Every engineering application requires independent model review, load review, result interpretation, and professional review by a qualified structural engineer.

## Required user checks

Before relying on a result:

1. Use one internally consistent force-length unit system. xframe records labels but performs no unit conversion.
2. Check node coordinates, connectivity, local axes, material/section values, rigid offsets, releases, load coordinate systems, and load directions.
3. Confirm restraints and affine constraints represent the physical structure. The solver does not infer missing supports.
4. Review diagnostics, reactions, equilibrium, energy, deformed shape, member actions, and sensitivity to plausible modeling changes.
5. Independently verify critical cases with hand calculations or another qualified implementation.
6. Preserve the exact model/result artifacts, package version, schema version, and verification records used for a decision.

## Supported scope

Supported behavior is limited to small-displacement, linear-elastic static response of 3D Euler-Bernoulli or Timoshenko frames, axial trusses, and discrete springs under the documented static loads and affine constraints.

## Unsupported scope

The engine does not implement geometric stiffness, P-Delta, large displacement, buckling, eigenvalue, modal, response-spectrum, time-history, impact, fatigue, creep, shrinkage, temperature, prestress, plasticity, nonlinear material, contact, cable/tension-only behavior, gap/compression-only springs, staged construction, moving loads, influence lines, soil continuum, mass, damping, section-property calculation, load generation beyond self-weight, code combinations, design checks, detailing, optimization, reliability analysis, or certification.

Frame end releases are linear and exact only for a valid retained stiffness block. Springs are linear and bilateral. Rigid offsets are kinematic vectors, not finite rigid bodies with mass. Timoshenko shear areas must be supplied by the user. CSV input is not supported.

## Numerical limits

The skyline solver is appropriate when deterministic sparse direct solution fits the configured memory preflight. Very large, poorly ordered, highly ill-conditioned, or near-mechanism systems may exceed memory or fail factorization. A passed factorization does not prove a physically correct model. JavaScript arithmetic is IEEE-754 double precision; bit-for-bit agreement across different JavaScript engines is not promised for operations involving implementation-defined transcendental functions.

## External verification

The repository compares overlapping behavior with Frame3DD outputs, including element and assembled stiffness matrices. This is verification evidence, not certification, endorsement, or a guarantee of correctness. Frame3DD does not define every xframe feature; those features have independent analytical/property tests instead.
