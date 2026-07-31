# Analysis Integration Verification

## Scope

Part 11 integrates physical DOF topology, element stiffness, sparse affine constraints, RCM ordering, skyline Cholesky factorization, load-case assembly, repeated solves, and equilibrium reactions.

## Hand checks

| Case | Governing value | xframe result |
| --- | ---: | ---: |
| 2 m axial truss, E=1000, A=3 | EA/L = 1500 | reduced stiffness = 1500 |
| 15 N axial load | u = PL/(EA) = 0.01 | 0.01 |
| Ground spring k=500, P=25 | u = P/k = 0.05 | 0.05 |
| Euler cantilever, tip force | u = PL^3/(3EI) | matched within test tolerance |

The axial-truss support residual is -15 N, equal and opposite to the applied load. Free-equation normalized residuals are below 1e-12 in the hand cases.

## Reuse

Two compatible spring load cases share one stiffness assembly and one skyline factorization. Runtime statistics report assemblyCount=1, factorizationCount=1, solveCount=2.

## Mechanism diagnostic

An unconstrained two-node truss fails during reduced skyline factorization and is mapped to `GLOBAL_MECHANISM` with `context.kind="analysis"`. No restraint or artificial stiffness is inserted.

## Sparse storage

The restrained axial truss retains six physical equations, one reduced equation, and one skyline coefficient. The public prepared object exposes coordinate and skyline storage statistics and no dense global matrix.
