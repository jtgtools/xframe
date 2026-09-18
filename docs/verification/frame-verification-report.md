# Frame Kernel Verification

## Closed forms

Euler-Bernoulli cantilever tip force tests match `PL³/(3EI)` and `PL²/(2EI)`. Timoshenko cantilever tests independently match `PL³/(3EI)+PL/(GAs)` in both bending planes. Uniform-load vectors match `qL/2` and `±qL²/12`.

Point-force, point-moment, uniform, triangular, and partial-span vectors are checked by resultant force and moment equilibrium. The Timoshenko load interpolation uses its own shear-flexible shape functions.

## Releases

All 4,096 masks were evaluated for a representative 3D frame kernel: 900 are condensable and 3,196 contain a singular released block. Every mask is classified as `valid` or `local-mechanism`; no stiffness regularization is used.

## External oracle

OpenSees Tcl element and global building behavior (cantilever, portal, two-story), displacement, reaction, and member-force comparisons are executed by the OpenSees-only verification harness using the supplied native binary. Solved nodal responses carry the stiffness evidence end to end; see `verification/reference-data/opensees/`.
