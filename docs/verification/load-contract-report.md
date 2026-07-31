# Load, Case, and Combination Contract Verification

## Coordinate contracts

Point actions use exactly one of `distanceFromElasticStart` or `positionRatio`. The ambiguous property `position` is rejected. Distributed actions use either an omitted full span, a complete physical-distance pair, or a complete ratio pair; mixed coordinate modes are rejected.

Rigid offsets are resolved before load coordinates. For a 10 m node-to-node frame with 1 m rigid offsets at both ends, the elastic length is 8 m. Verification converts point ratio `0.25` to 2 m and distributed ratios `0.25..0.75` to 2..6 m. Coordinates beyond 8 m fail finalization.

## Nodal and distributed actions

Nodal actions have explicit three-component force and moment vectors. An all-zero or omitted action is rejected rather than silently retained. Distributed start/end intensities are explicit, making uniform loads the equal-end special case and linearly varying loads the general case. Finalized partial spans retain both discontinuity coordinates.

## Self-weight

Self-weight requires a finite nonzero gravity vector. With no target lists it applies to all frames and trusses. When either list is provided, only explicitly listed categories are selected. Every affected material must provide density; failures aggregate sorted material and element identifiers.

## Result identity and graph

Load cases and combinations share one Map-backed result-ID domain. Duplicate case/combination IDs, missing references, duplicate factors, zero/non-finite factors, empty combinations, and nested cycles fail with structured result contexts. Prototype-like IDs such as `__proto__` and `constructor` remain ordinary keys.

For `A -> B -> L`, the deterministic combination evaluation order is `[B, A]`.

## Provenance and reuse

Each finalized load contribution stores load-case ID, source index, load kind, and target IDs. Each case carries a stiffness compatibility key computed from the structural model with load cases and combinations excluded, enabling later assembly/factorization reuse without conflating load identity with stiffness identity.

## Point moments

Part 06 defines an explicit point-moment contract. Numerical exposure remains contingent on Part 09's theory-consistent equivalent-load implementation and independent split-member/equilibrium verification.
