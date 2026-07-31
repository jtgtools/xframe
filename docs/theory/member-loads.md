# Frame Member Loads

Equivalent nodal vectors are computed from virtual work. Axial and torsional fields use linear interpolation. Euler-Bernoulli transverse fields use cubic Hermite interpolation. Timoshenko transverse displacement and independent section-rotation interpolation include the same `φ` parameters as the stiffness matrix. Distributed force intensity is integrated with eight-point Gauss-Legendre quadrature, which is exact for the polynomial orders exposed by version one. Point forces and point moments are evaluated directly at their physical deformable-member coordinate.
