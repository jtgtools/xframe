# Affine Constraint Verification

The compiler canonicalizes `Σ aᵢuᵢ=b`, performs deterministic sparse row elimination, and stores each physical displacement as a sparse affine row over reduced equations. It never allocates a dense global transformation.

## Hand systems

- Prescribed displacement: `u0=2` produces row `u0=2`.
- Equal DOF with offset: `u2-u1=3` is reduced deterministically to `u1=u2-3`.
- Three equations `u0-u1=0`, `u1-u2=0`, `u0-u2=0` have rank two; the third is classified as redundant by rank analysis. The explicit equal-DOF cycle form is rejected by the public compiler with `CONSTRAINT_CYCLE`.
- Dependent equations with inconsistent right-hand sides fail with `CONSTRAINT_CONTRADICTION`.

## Recovery

For `u0=0` and full residual `[-10,0]`, equilibrium `r+Aᵀλ=0` gives `λ=10`. The reported source force is `+10` at DOF 0 and the physical residual/reaction remains `-10` under the engine's residual convention.

## Storage

The transform stores only nonzero reduced coefficients plus one offset per physical row. A configurable nonzero ceiling is checked before accepting the compiled map.
