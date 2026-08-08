# Result, Diagnostics, Combination, and Envelope Verification

Date: 2026-07-31

Requirements: FR-RES-001 through FR-RES-007 and FR-DIA-001.

## Result ownership and recovery

- Case and combination results are recursively frozen and own copied numeric arrays.
- Frame results contain separately allocated local/global end-displacement and local/global end-force arrays.
- At the original Part 12 execution, frame internal-force stations contained axial force, two shears, torsion, and two bending moments.
- At the original Part 12 execution, point forces and point moments created explicit `left` and `right` stations at interior discontinuities.
- At the original Part 12 execution, distributed-load span boundaries were included in the station layout.
- At the original Part 12 execution, truss results contained extension, strain, axial force, and global end forces.
- Spring results contain grounded/two-node identity and global end forces.

## Diagnostic evidence

| Case                                                   |           max residual |    normalized residual | normalized force equilibrium | normalized moment equilibrium |        strain energy |               external work |  relative energy error | min normalized pivot | skyline storage / max width |
| ------------------------------------------------------ | ---------------------: | ---------------------: | ---------------------------: | ----------------------------: | -------------------: | --------------------------: | ---------------------: | -------------------: | --------------------------: |
| 100 N/m grounded spring, 10 N load                     |                      0 |                      0 |                            0 |                             0 |                  0.5 |                         0.5 |                      0 |                    1 |                       1 / 1 |
| 4 m Euler cantilever, 10 N/m uniform load              | 2.3092638912203256e-14 | 1.1546319456101626e-15 |                            0 |         8.881784197001253e-17 | 6.222222222222217e-4 |        6.222222222222216e-4 | 1.7424677772088479e-16 |   0.2500000000000001 |                       8 / 2 |
| 100 N/m grounded spring, prescribed displacement 0.1 m | independently asserted | independently asserted |       independently asserted |        independently asserted |                  0.5 | 0.5 including reaction work |            below 1e-14 |             positive |                       1 / 1 |

Diagnostic status is determined from the worst normalized residual, force-equilibrium, moment-equilibrium, and energy error: pass at or below `1e-9`, warn at or below `1e-6`, otherwise fail. Raw values remain available regardless of status.

## Combination evidence

- Compatible cases superpose all displacement, load, residual, node, frame, truss, spring, and internal-force fields.
- At the original Part 12 execution, result identifiers, model fingerprint, exact unit metadata, conventions, entity IDs/order, active DOF order, spring kind, and frame station layout were checked before arithmetic.
- Duplicate source IDs, output-ID collisions, nonfinite factors, nonfinite arithmetic, and fabricated entity layouts fail with `RESULT_INCOMPATIBLE`.
- Factor provenance retains every direct source result ID and factor.

## Streaming-envelope evidence

A generator produced 150,000 two-component records. The implementation made one pass and retained only component descriptors plus extrema and complete tied-governor provenance.

Observed in this container using Node with `--expose-gc` after a production build:

| records | components |  elapsed | post-GC heap delta | stored tied governors |
| ------: | ---------: | -------: | -----------------: | --------------------: |
| 150,000 |          2 | 83.37 ms |    3,262,504 bytes |                30,690 |

Timing and heap values are environment observations, not universal performance claims. Complete tie provenance necessarily grows with the number of governing ties, but non-governing source records are not retained.

Each governor stores result ID, result kind, component, entity ID, extremum type, and optional member location. Duplicate IDs, invalid identifiers/kinds, vector-length mismatch, nonfinite values/locations, empty components, and empty sources fail closed.

## Commands

The Part 12 acceptance gate runs formatting, linting, type checking, all tests, verification tests, build, coverage, and the aggregate check through npm scripts.

## Safety-correctness supersession (2026-08-08)

This report preserves the historical Part 12 measurements and counts. Current frame results store fixed cubic segment coefficients, derive stations from analytical roots and endpoint-sided limits, and combine coefficients before deriving combination stations. Current streaming envelopes require strict compatibility metadata, including exact component layout, before values are read. See [`safety-correctness-report.md`](safety-correctness-report.md).
