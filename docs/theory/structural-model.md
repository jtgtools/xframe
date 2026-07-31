# Structural Model and Element Theory

Equation identifiers below are stable documentation references. Tests carry the corresponding requirement IDs.

## Coordinates and units

The global system is right-handed Cartesian. An element local `x` axis runs from its deformable start to deformable end. A supplied orientation is projected normal to `x`; otherwise the least-aligned global basis vector is selected deterministically. The resulting orthonormal basis satisfies:

**XF-EQ-001**: `R R^T = I`, `det(R) = +1`.

Implementation: `src/geometry/local-axes.ts`. Evidence: `test/unit/local-axes.test.ts`, `test/property/geometry-properties.test.ts`.

Every model declares one consistent unit system. Unit labels are descriptive and no unit conversion is performed. Rotations use radians.

## Isotropic material

For elastic modulus `E`, shear modulus `G`, and Poisson ratio `ν`:

**XF-EQ-002**: `G = E / (2(1 + ν))`.

Any two values determine the third; three supplied values must satisfy the relation within the documented material tolerance. Density is optional except when self-weight consumes it.

## Frame element

The local frame DOF order is `[u,v,w,rx,ry,rz]` at the start followed by the same order at the end. Axial and Saint-Venant torsional terms are:

**XF-EQ-003**: `ka = EA/L`, `kt = GJ/L`.

Euler-Bernoulli bending uses cubic Hermite interpolation. Timoshenko bending uses:

**XF-EQ-004**: `φy = 12 E Iz / (G Asy L²)`, `φz = 12 E Iy / (G Asz L²)`.

Each plane uses `12EI/(L³(1+φ))`, `6EI/(L²(1+φ))`, `(4+φ)EI/(L(1+φ))`, and `(2-φ)EI/(L(1+φ))`. Local `y` bending consumes `Iz`; local `z` bending consumes `Iy`.

Implementation: `src/elements/frame-stiffness.ts`. Evidence: `test/unit/frame-stiffness.test.ts` and direct Frame3DD matrix comparisons in `verification/external/`.

## Truss and spring elements

For a truss with direction vector `n`:

**XF-EQ-005**: `k = (EA/L) [[nn^T,-nn^T],[-nn^T,nn^T]]`.

Only translations are active; rotational equations are not manufactured. Axial force is `N = EA Δ/L`.

A grounded spring contributes its explicit six component stiffnesses to one node. A two-node spring contributes equal/opposite diagonal component blocks after optional basis rotation. Zero components remain absent rather than stabilized.

Implementation: `src/elements/truss-element.ts`, `src/elements/spring-element.ts`. Evidence: analytical and Frame3DD truss cases plus exact spring closed forms.

## Rigid offsets

For an offset vector `r`, deformable-end translation is:

**XF-EQ-006**: `ud = un + θ × r`.

The force transform is the transpose of the displacement transform, preserving virtual work:

**XF-EQ-007**: `fn^T un = fd^T ud`.

Offsets alter elastic length and the physical coordinates of member loads.

## Releases

Partition local stiffness and equivalent load into retained `r` and released `q` DOFs. Exact condensation is:

**XF-EQ-008**: `Kc = Krr - Krq Kqq^-1 Kqr`.

**XF-EQ-009**: `pc = pr - Krq Kqq^-1 pq`.

A singular/non-positive released block is an element-local mechanism. No artificial stiffness is added. All 4,096 end-release masks have regression coverage.

## Loads

Equivalent frame member loads satisfy virtual work:

**XF-EQ-010**: `pe = ∫ N(x)^T w(x) dx`.

Axial/torsional fields use linear interpolation; Euler transverse fields use cubic Hermite interpolation; Timoshenko fields use the same shear parameters as stiffness. Point forces and moments are evaluated at the specified deformable-member coordinate. Partial linearly varying distributed loads use fixed Gauss-Legendre integration exact for the exposed polynomial products. Self-weight is material density times area and the declared gravity vector.

Detailed notes: [frame element](frame-element.md), [member loads](member-loads.md), and [releases](releases.md).
