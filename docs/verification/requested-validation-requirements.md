# Task Prompt: Validation Test Suite for a 3D Frame Analysis Library

You are validating a custom 3D frame analysis library. Your job is to construct each test case below, run it through the library, obtain an independent reference solution using the method specified, compare the two, and report a pass/fail result with the numeric error. Do not skip a category. Do not silently "fix" a mismatch by adjusting the reference — a mismatch is a defect report, not a rounding issue, unless proven otherwise.

## Library scope (test only this)

**Implemented:**
- Linear elastic static analysis
- Euler-Bernoulli beam theory
- Timoshenko beam theory (shear deformation)
- End releases (per-DOF, per-end)
- Springs (translational and rotational, nodal)
- Rigid end offsets

**Not implemented — do not write tests for these:**
- Nonlinear material, P-Delta, buckling/stability
- Prescribed support settlement
- Temperature loads

## Required schema for every test case

Report each test using this structure:

```
Test ID:
Description:
Model: geometry, section (A, Iyy, Izz, J, shear area if Timoshenko), material (E, G), beam theory used
Supports / releases / springs / offsets:
Loads:
Reference method: [closed-form hand calc | published benchmark table | commercial software | self-consistency check | equivalent-model cross-check]
Reference value(s):
Library output:
Error (%): 
Tolerance used and why:
Pass/Fail:
```

Use tight tolerances (≤0.1–0.5%) against closed-form/hand-calc references, and looser tolerances (≤1–2%) only where the reference itself is a numerical commercial-software run.

---

## 1. Single-member closed-form benchmarks (Euler-Bernoulli baseline)

- Cantilever, tip point load — strong axis, weak axis, axial — vs δ = PL³/3EI and δ = PL/EA
- Cantilever, tip torque — vs θ = TL/GJ
- Cantilever, tip moment — strong axis and weak axis tested separately (catches Iyy/Izz swap bugs)
- Cantilever, uniform distributed load (UDL) — vs δ = wL⁴/8EI
- Simply supported beam — point load at midspan, UDL, unequal end moments
- Fixed-fixed beam — point load and UDL vs standard fixed-end-moment tables (PL/8, wL²/12)
- Propped cantilever (fixed-pinned) — point load and UDL vs moment-distribution/three-moment hand solution
- Beam with an overhang, load applied on the overhang
- 2-span and 3-span continuous beam vs classical continuous-beam coefficient tables

## 2. Timoshenko / shear-deformation-specific benchmarks

- Deep/short cantilever, tip point load — vs δ = PL³/3EI + PL/(kAG), confirming the shear correction term is present and correctly scaled by the shear area/factor
- Deep/short cantilever, tip moment only — shear force is zero along the whole span, so Timoshenko result must match Euler-Bernoulli exactly (no shear contribution to isolate); any discrepancy here is a formulation bug, not a modeling difference
- Slenderness sweep: same member re-run at increasing L/d (e.g., 2, 5, 10, 20, 50) — Timoshenko deflection should converge toward the Euler-Bernoulli result as L/d grows; plot/verify the convergence trend rather than a single point
- Same shear-area input compared across different cross-section shapes (rectangular, circular, wide-flange) if the library accepts/derives shear area, vs published shear correction factor values (e.g., 5/6 for rectangular)
- Simply supported deep beam, UDL — vs a published Timoshenko closed-form deflection formula (not just EB with a shear correction bolted on informally — use an actual Timoshenko reference solution)
- Toggle test: identical model run once as Euler-Bernoulli and once as Timoshenko with shear area artificially set enormous (shear rigidity → ∞) — the two should converge to the same answer, confirming Timoshenko degenerates correctly to EB in the limit

## 3. Stiffness-matrix unit-load checks

- For an isolated member, apply a unit load/moment in each of the 6 local DOFs independently at each end (12 cases total) and check the resulting displacement/rotation against the corresponding closed-form term of the 12×12 local stiffness matrix
- Repeat the same 12-case sweep for both Euler-Bernoulli and Timoshenko formulations, since the matrices differ
- This isolates a single bad matrix entry instead of only catching it when combined behavior happens to look "close enough"

## 4. Rigid end offset benchmarks

- Cantilever with a rigid offset at the fixed end only — deflection should decrease relative to the no-offset case because the flexible (elastic) length is shorter; verify against a hand calc using the reduced clear span
- Rigid offset at both ends of a beam-column (simulating column-depth/panel-zone geometry) — compare moments/deflections at the clear-span ends against a hand calc using clear length, with end rotations transferred rigidly through the offsets
- Very stiff/large offset — confirm the offset zone contributes zero elastic deformation (pure rigid-body kinematics), not additional flexibility
- Zero-length offset (degenerate case) — must recover the baseline non-offset member result exactly
- Offset + end release combined on the same end — confirm the release is applied at the flexible end of the member (past the offset), not at the joint node, and that offset transformation and release condensation are combined in the correct order
- Offset with lateral eccentricity (offset vector not collinear with the member axis) — creates axial-bending coupling; compare against a hand-calculated eccentric connection
- Equivalent-model cross-check (no commercial software needed): build the same geometry two ways — (a) using the library's built-in rigid offset feature, and (b) manually, as an explicit extra "member" with artificially enormous stiffness standing in for the offset zone, connected to a normal flexible member. Results from (a) and (b) should match closely; this validates the offset feature using the library's own primitives
- Portal frame with symmetric offsets at both ends of the beam (panel-zone-style) — compare against a simplified centerline model with reduced clear span, confirming the expected reduction in design moment

## 5. 3D geometry / member orientation

- Member arbitrarily oriented in space (not aligned to any global axis) — verify local-to-global transformation
- Non-zero roll/reference angle about the member's own axis (test at least 0°, 45°, 90°, 180°) — common location for local axis-2/axis-3 mix-ups
- Diagonal bracing at an arbitrary, non-45° angle
- Inclined point load causing biaxial bending — checks correct vector decomposition into local y/z components

## 6. Support conditions

- Fixed, pinned, roller
- Partial restraint per DOF (e.g., only Ux and Uz fixed, all else free) — run every physically meaningful combination
- Multiple supports creating a statically indeterminate system — cross-check with the force method by hand
- Skewed/inclined support (if supported) — compare against a manually rotated equivalent model

## 7. Springs

- Single translational spring at a cantilever tip — total deflection = beam deflection + P/k
- Rotational spring at a member end simulating a semi-rigid connection — compare against slope-deflection with a known fixity factor
- Two springs of different stiffness supporting one beam — indeterminate reaction split, verify via the force method
- Limiting behavior: k → 0 must converge to a released DOF; k → very large (e.g., 10⁸–10¹²× member stiffness) must converge to a rigid support without numerical blow-up
- Spring on one DOF at a node that is hard-restrained on a different DOF at the same node

## 8. End releases

- Single-axis moment release at one end (Mz only), and separately (My only) — do not assume symmetric behavior between the two axes in the implementation
- Release at both ends, one axis only, while the other axis/axial/torsion remain continuous
- Torsional release
- Multiple simultaneous releases approaching a true pin; and both ends released in bending + torsion (pure two-force axial member inside a larger frame) — confirm correct force redistribution in the rest of the structure
- Release combined with a distributed load on the same member — this exercises whether fixed-end forces are correctly adjusted/condensed before assembly (a classic bug location)
- A release pattern that creates a local mechanism — confirm the library detects the singular/ill-conditioned system rather than returning silently wrong numbers

## 9. Load types

- Nodal loads/moments in all 6 global DOFs
- Member point load at various positions (not only midspan) — check against 1/4-point and 1/3-point beam formulas
- Interior point moment (not applied at a node) — moment diagram must show a jump at that location
- Full-length UDL applied in local axes, and separately as a global-direction load on an inclined member — a common location for self-weight bugs
- Partial-length and trapezoidal loads vs standard fixed-end-force tables
- Self-weight, on both horizontal and inclined members
- Combination load case = exact superposition of the individual load cases run separately — must hold exactly for a linear solver; treat any deviation as a bug

## 10. Multi-member systems

- Single-bay portal frame under lateral load — vs hand calc and vs commercial software
- L-shaped or Z-shaped frame with out-of-plane loads — stresses transformation consistency across differently oriented members meeting at a shared joint
- 3D space truss (tower/tetrahedral form), all members pinned — compare against the method of joints
- Grid/floor framing (orthogonal beams, rigid joints, pinned verticals) — classic grillage benchmark, stresses torsion-bending coupling
- Full multi-story/multi-bay frame under combined gravity + lateral load — compare displacements, reactions, and member end forces against an independently built commercial-software model
- Symmetric structure + symmetric load → result must be symmetric; symmetric structure + antisymmetric load → result must be antisymmetric (useful sanity check even before any "true" reference exists)

## 11. Self-consistency checks (no external reference needed)

- Global equilibrium: sum of reactions (F and M) must equal sum of applied loads, on every single test case above, without exception
- Stiffness matrix symmetry: K = Kᵀ
- Maxwell-Betti reciprocity: deflection at B from a unit load at A equals deflection at A from a unit load at B
- Mesh invariance: subdividing one prismatic member into 2, 4, and 8 elements must not change nodal results
- Rigid-body/mechanism detection on a deliberately under-restrained model
- Unit consistency: same model built in SI vs imperial units must agree after conversion
- Numerical conditioning: extreme stiffness ratios (e.g., a very stiff member adjacent to a very soft spring) should not degrade accuracy silently

## 12. Literature / published benchmarks

- Cross-check against worked examples from Hibbeler, McCormac, or Kassimali (structural analysis texts)
- Cross-check closed-form cases against Roark's Formulas for Stress and Strain
- If semi-rigid connections via rotational springs are a real intended use case, cross-check against a published semi-rigid connection benchmark problem, not just an internally hand-derived one

---

## Reporting

After running all cases, produce a summary table: Test ID, category, pass/fail, max error observed. Flag any category with more than one failure for prioritized investigation, and flag any case where the "error" turned out to be a convention mismatch (sign convention, axis labeling, self-weight direction, or units) rather than a genuine numerical defect — these should be logged separately from true bugs.
