# Truss, Spring, and Rigid-Offset Verification Report

## Scope

This report records Part 10 evidence for the 3D truss kernel, six-component ground and two-node springs, physical DOF topology, and frame rigid-offset transformations.

## Truss evidence

For the zero-offset Part 10 truss cases, the global truss matrix is formed from `EA/L` and the outer product of the normalized global direction vector. The kernel is tested for arbitrary 3D orientation, symmetry, rigid-translation invariance, and recovery of extension, strain, axial force, and equal/opposite global end forces.

The analytical axial-bar case uses `u = PL/(EA)` and recovers `N = EA u/L = P`. In the zero-offset historical cases, truss-only model finalization creates only `ux`, `uy`, and `uz` at each connected node. It creates no rotational DOFs and no restraints.

## Spring evidence

A ground spring forms independent translational and rotational 3×3 blocks from six nonnegative component stiffnesses. An explicit orthonormal right-handed basis rotates those blocks into global coordinates. Zero components remain exact zeros; negative or non-finite components are rejected.

A two-node spring uses the block form `[[K,-K],[-K,K]]`. Tests demonstrate equal/opposite end forces, rigid-body invariance, and `U = 1/2 k delta^2` for a one-component relative displacement. The one-DOF ground-spring case independently verifies `u = P/k` and `U = P^2/(2k)`.

## Rigid-offset evidence

For each frame end, deformable-end translations are obtained from nodal translation plus the rotational moment arm, followed by the global-to-local rotation. Force recovery uses the exact transpose mapping and stiffness uses `T^T k T`.

Independent tests demonstrate:

- the expected translation induced by a nodal rotation and offset vector;
- symmetry preservation of transformed stiffness;
- equality of local and global virtual work to 13 decimal digits;
- preservation of nodal force and moment-arm contributions.

## Numerical and architecture checks

All arrays are finite-checked at public numerical boundaries. Element matrices are fixed-size local arrays only; no dense global allocation was introduced. A production-code search found no zero-row auto-restraint or arbitrary-stiffness insertion pattern.

## Acceptance

The stored unit, analytical, and regression tests establish closed-form agreement, equilibrium, energy consistency, rigid-motion invariance, correct topology, and virtual-work preservation for the Part 10 kernels.

## Safety-correctness supersession (2026-08-08)

This report retains the original Part 10 execution evidence and counts. Current eccentric-truss behavior uses the compatibility vector `B`, activates reference-node rotations at each nonzero rigid offset, transfers self-weight through the same rigid arms, and exposes both six elastic-end and twelve reference-node truss action arrays. Unsupported rotations remain physical mechanisms. The OpenSees oracle evidence is recorded in [`safety-correctness-report.md`](safety-correctness-report.md).
