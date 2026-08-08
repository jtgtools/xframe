# Requested 3D Frame Validation Report

This report implements the supplied twelve-category validation matrix. Every case is executable through `verification/validation/requested-suite.test.ts`. It is an engineering verification record, not a formal certification.

- Cases: **99**
- Passed: **99**
- Failed: **0**
- Direct or matrix-direct Frame3DD classifications: **74**

## Category summary

| Category | Cases | Failures |  Maximum error (%) | Priority flag |
| -------: | ----: | -------: | -----------------: | ------------- |
|        1 |    17 |        0 | 7.317249229943e-14 | —             |
|        2 |     6 |        0 | 1.109148598986e-13 | —             |
|        3 |    24 |        0 | 1.890454581876e-13 | —             |
|        4 |     6 |        0 | 1.083789143086e-13 | —             |
|        5 |     7 |        0 | 6.969882125154e-11 | —             |
|        6 |     3 |        0 | 6.063298011820e-14 | —             |
|        7 |     5 |        0 |  2.999999665597e-8 | —             |
|        8 |     7 |        0 | 6.467517879274e-14 | —             |
|        9 |     8 |        0 | 7.844633176120e-12 | —             |
|       10 |     6 |        0 |  0.000452114957842 | —             |
|       11 |     7 |        0 |  6.003706559676e-9 | —             |
|       12 |     3 |        0 | 1.580742150589e-14 | —             |

## Case summary

| Test ID    | Category | Pass/Fail |  Maximum error (%) | Frame3DD coverage |
| ---------- | -------: | --------- | -----------------: | ----------------- |
| VAL-01-001 |        1 | Pass      | 7.317249229943e-14 | direct            |
| VAL-01-002 |        1 | Pass      | 1.219541538324e-14 | direct            |
| VAL-01-003 |        1 | Pass      |                  0 | direct            |
| VAL-01-004 |        1 | Pass      | 1.799556575584e-14 | direct            |
| VAL-01-005 |        1 | Pass      | 4.849340626026e-14 | direct            |
| VAL-01-006 |        1 | Pass      |                  0 | direct            |
| VAL-01-007 |        1 | Pass      | 7.314201645924e-14 | direct            |
| VAL-01-008 |        1 | Pass      | 6.063298011820e-14 | overlap-indirect  |
| VAL-01-009 |        1 | Pass      | 4.547473508865e-14 | direct            |
| VAL-01-010 |        1 | Pass      | 1.477183759928e-14 | direct            |
| VAL-01-011 |        1 | Pass      | 2.370788750502e-14 | direct            |
| VAL-01-012 |        1 | Pass      | 1.515824502955e-14 | direct            |
| VAL-01-013 |        1 | Pass      | 2.694799116364e-14 | direct            |
| VAL-01-014 |        1 | Pass      | 2.425319204728e-14 | direct            |
| VAL-01-015 |        1 | Pass      | 4.547473508865e-14 | direct            |
| VAL-01-016 |        1 | Pass      | 2.425319204728e-14 | direct            |
| VAL-01-017 |        1 | Pass      | 2.273736754432e-14 | direct            |
| VAL-02-001 |        2 | Pass      | 1.152498372327e-14 | direct            |
| VAL-02-002 |        2 | Pass      | 2.927345865711e-14 | direct            |
| VAL-02-003 |        2 | Pass      | 1.109148598986e-13 | overlap-indirect  |
| VAL-02-004 |        2 | Pass      | 8.791283236904e-14 | direct            |
| VAL-02-005 |        2 | Pass      | 1.272759072048e-14 | direct            |
| VAL-02-006 |        2 | Pass      | 9.957312752107e-14 | overlap-indirect  |
| VAL-03-001 |        3 | Pass      | 1.230764701742e-14 | matrix-direct     |
| VAL-03-002 |        3 | Pass      | 7.868697531222e-14 | matrix-direct     |
| VAL-03-003 |        3 | Pass      | 2.098319341659e-14 | matrix-direct     |
| VAL-03-004 |        3 | Pass      | 1.403069091662e-14 | matrix-direct     |
| VAL-03-005 |        3 | Pass      |                  0 | matrix-direct     |
| VAL-03-006 |        3 | Pass      | 1.008242443667e-13 | matrix-direct     |
| VAL-03-007 |        3 | Pass      | 1.230764701742e-14 | matrix-direct     |
| VAL-03-008 |        3 | Pass      | 7.868697531222e-14 | matrix-direct     |
| VAL-03-009 |        3 | Pass      | 2.098319341659e-14 | matrix-direct     |
| VAL-03-010 |        3 | Pass      | 1.403069091662e-14 | matrix-direct     |
| VAL-03-011 |        3 | Pass      |                  0 | matrix-direct     |
| VAL-03-012 |        3 | Pass      | 1.008242443667e-13 | matrix-direct     |
| VAL-03-013 |        3 | Pass      | 1.230764701742e-14 | matrix-direct     |
| VAL-03-014 |        3 | Pass      | 1.410489324066e-13 | matrix-direct     |
| VAL-03-015 |        3 | Pass      | 8.380743788004e-14 | matrix-direct     |
| VAL-03-016 |        3 | Pass      | 1.403069091662e-14 | matrix-direct     |
| VAL-03-017 |        3 | Pass      | 8.402020363893e-14 | matrix-direct     |
| VAL-03-018 |        3 | Pass      | 1.890454581876e-13 | matrix-direct     |
| VAL-03-019 |        3 | Pass      | 1.230764701742e-14 | matrix-direct     |
| VAL-03-020 |        3 | Pass      | 1.410489324066e-13 | matrix-direct     |
| VAL-03-021 |        3 | Pass      | 8.380743788004e-14 | matrix-direct     |
| VAL-03-022 |        3 | Pass      | 1.403069091662e-14 | matrix-direct     |
| VAL-03-023 |        3 | Pass      | 8.402020363893e-14 | matrix-direct     |
| VAL-03-024 |        3 | Pass      | 1.890454581876e-13 | matrix-direct     |
| VAL-04-001 |        4 | Pass      |                  0 | unsupported       |
| VAL-04-002 |        4 | Pass      | 1.083789143086e-13 | unsupported       |
| VAL-04-003 |        4 | Pass      | 1.200211804941e-14 | unsupported       |
| VAL-04-004 |        4 | Pass      |                  0 | unsupported       |
| VAL-04-005 |        4 | Pass      | 2.021099337273e-14 | unsupported       |
| VAL-04-006 |        4 | Pass      | 7.275957614183e-14 | unsupported       |
| VAL-05-001 |        5 | Pass      | 6.969882125154e-11 | direct            |
| VAL-05-002 |        5 | Pass      | 7.813878938421e-14 | direct            |
| VAL-05-003 |        5 | Pass      | 1.172081840763e-13 | direct            |
| VAL-05-004 |        5 | Pass      | 7.813878938421e-14 | direct            |
| VAL-05-005 |        5 | Pass      | 7.813878938421e-14 | direct            |
| VAL-05-006 |        5 | Pass      |                  0 | direct            |
| VAL-05-007 |        5 | Pass      | 3.680649535154e-12 | direct            |
| VAL-06-001 |        6 | Pass      | 6.063298011820e-14 | direct            |
| VAL-06-002 |        6 | Pass      | 1.200211804941e-14 | direct            |
| VAL-06-003 |        6 | Pass      | 3.637978807092e-14 | direct            |
| VAL-07-001 |        7 | Pass      |                  0 | unsupported       |
| VAL-07-002 |        7 | Pass      | 4.625929269271e-14 | unsupported       |
| VAL-07-003 |        7 | Pass      |                  0 | unsupported       |
| VAL-07-004 |        7 | Pass      |  2.999999665597e-8 | unsupported       |
| VAL-07-005 |        7 | Pass      |                  0 | unsupported       |
| VAL-08-001 |        8 | Pass      | 4.850638409456e-14 | direct            |
| VAL-08-002 |        8 | Pass      | 6.467517879274e-14 | direct            |
| VAL-08-003 |        8 | Pass      | 1.364242052659e-14 | direct            |
| VAL-08-004 |        8 | Pass      | 1.212659602364e-14 | direct            |
| VAL-08-005 |        8 | Pass      | 2.509727251124e-14 | direct            |
| VAL-08-006 |        8 | Pass      | 4.042198674546e-14 | direct            |
| VAL-08-007 |        8 | Pass      |                  0 | overlap-indirect  |
| VAL-09-001 |        9 | Pass      | 4.956352788505e-14 | direct            |
| VAL-09-002 |        9 | Pass      | 1.079383496163e-13 | overlap-indirect  |
| VAL-09-003 |        9 | Pass      | 1.040834085586e-13 | overlap-indirect  |
| VAL-09-004 |        9 | Pass      | 4.042198674546e-14 | overlap-indirect  |
| VAL-09-005 |        9 | Pass      | 8.673617379884e-17 | direct            |
| VAL-09-006 |        9 | Pass      | 5.649035414739e-14 | direct            |
| VAL-09-007 |        9 | Pass      | 7.844633176120e-12 | direct            |
| VAL-09-008 |        9 | Pass      | 1.299278145390e-14 | direct            |
| VAL-10-001 |       10 | Pass      |  0.000378362026933 | direct            |
| VAL-10-002 |       10 | Pass      |                  0 | overlap-indirect  |
| VAL-10-003 |       10 | Pass      | 1.485198628739e-14 | direct            |
| VAL-10-004 |       10 | Pass      | 1.515824502955e-14 | overlap-indirect  |
| VAL-10-005 |       10 | Pass      |  0.000452114957842 | direct            |
| VAL-10-006 |       10 | Pass      | 1.694065894509e-19 | direct            |
| VAL-11-001 |       11 | Pass      | 2.695094436815e-10 | overlap-indirect  |
| VAL-11-002 |       11 | Pass      |                  0 | matrix-direct     |
| VAL-11-003 |       11 | Pass      | 1.058791184068e-20 | direct            |
| VAL-11-004 |       11 | Pass      | 1.956424158480e-12 | direct            |
| VAL-11-005 |       11 | Pass      |                  0 | overlap-indirect  |
| VAL-11-006 |       11 | Pass      |  6.003706559676e-9 | overlap-indirect  |
| VAL-11-007 |       11 | Pass      | 1.778769189236e-14 | unsupported       |
| VAL-12-001 |       12 | Pass      |                  0 | direct            |
| VAL-12-002 |       12 | Pass      | 1.575908812100e-14 | direct            |
| VAL-12-003 |       12 | Pass      | 1.580742150589e-14 | unsupported       |

## Convention differences

- `VAL-10-001` and `VAL-10-005`: Frame3DD and xframe use local transverse axes that differ by a 180° roll for vertical members. The comparison applies the exact sign transformation `[+,-,-,+,-,-]` to each six-component local end-force block. Global stiffness, displacements, reactions, and transformed local forces agree; this is not logged as an xframe numerical defect.
- Frame3DD result text uses its own local-force signs and approximately six printed decimal digits. Stored matrix and result tolerances are fixed before comparison.

## Defect record

- **xframe defect found and fixed:** sparse affine reduction counted a symmetric off-diagonal term only once when both original DOFs mapped to the same reduced DOF. The reproducing oblique-restraint truss had a 33.33% stiffness error. `FR-CON-003/NFR-COR-001` now protects the corrected double contribution.
- **Frame3DD discrepancy retained:** an interior axial point force uses opposite end distances in the supplied `20140514+` binary.
- **Frame3DD discrepancy retained:** transverse Timoshenko point-force response exchanges the two bending-plane shear parameters in the supplied binary.
- The affected Frame3DD quantities are not used as xframe expected values; independent closed forms are used instead.

## Detailed cases

### VAL-01-001

**Test ID:** VAL-01-001

**Description:** Euler cantilever tip point load about the strong bending axis

**Model:** L=3.6 m, A=0.018 m², Izz=0.000072 m⁴, E=205000000000 Pa, Euler-Bernoulli.

**Supports / releases / springs / offsets:** Node a fixed in all six global DOFs; node b free.

**Loads:** Tip nodal action {"force":[0,18000,0]} at node b.

**Reference method:** closed-form hand calc

**Reference value(s):**

- ty: 0.0189658536585 m

**Library output:**

- ty: 0.0189658536585 m

**Error (%):** maximum 7.317249229943e-14

**Tolerance used and why:** 0.1%. Closed-form and exact algebraic references permit a 0.1% acceptance threshold.

**Pass/Fail:** Pass

**Frame3DD coverage:** direct

### VAL-01-002

**Test ID:** VAL-01-002

**Description:** Euler cantilever tip point load about the weak bending axis

**Model:** L=3.6 m, A=0.018 m², Iyy=0.000024 m⁴, E=205000000000 Pa, Euler-Bernoulli.

**Supports / releases / springs / offsets:** Node a fixed in all six global DOFs; node b free.

**Loads:** Tip nodal action {"force":[0,0,18000]} at node b.

**Reference method:** closed-form hand calc

**Reference value(s):**

- tz: 0.0568975609756 m

**Library output:**

- tz: 0.0568975609756 m

**Error (%):** maximum 1.219541538324e-14

**Tolerance used and why:** 0.1%. Closed-form and exact algebraic references permit a 0.1% acceptance threshold.

**Pass/Fail:** Pass

**Frame3DD coverage:** direct

### VAL-01-003

**Test ID:** VAL-01-003

**Description:** Euler cantilever axial tip load

**Model:** L=3.6 m, A=0.018 m², E=205000000000 Pa, Euler-Bernoulli.

**Supports / releases / springs / offsets:** Node a fixed in all six global DOFs; node b free.

**Loads:** Tip nodal action {"force":[18000,0,0]} at node b.

**Reference method:** closed-form hand calc

**Reference value(s):**

- tx: 0.0000175609756098 m

**Library output:**

- tx: 0.0000175609756098 m

**Error (%):** maximum 0

**Tolerance used and why:** 0.1%. Closed-form and exact algebraic references permit a 0.1% acceptance threshold.

**Pass/Fail:** Pass

**Frame3DD coverage:** direct

### VAL-01-004

**Test ID:** VAL-01-004

**Description:** Euler cantilever tip torque

**Model:** L=3.6 m, J=0.000013 m⁴, G=79000000000 Pa, Euler-Bernoulli.

**Supports / releases / springs / offsets:** Node a fixed in all six global DOFs; node b free.

**Loads:** Tip nodal action {"moment":[11000,0,0]} at node b.

**Reference method:** closed-form hand calc

**Reference value(s):**

- rx: 0.038558909445 rad

**Library output:**

- rx: 0.038558909445 rad

**Error (%):** maximum 1.799556575584e-14

**Tolerance used and why:** 0.1%. Closed-form and exact algebraic references permit a 0.1% acceptance threshold.

**Pass/Fail:** Pass

**Frame3DD coverage:** direct

### VAL-01-005

**Test ID:** VAL-01-005

**Description:** Euler cantilever strong-axis tip moment

**Model:** L=3.6 m, Izz=0.000072 m⁴, E=205000000000 Pa, Euler-Bernoulli.

**Supports / releases / springs / offsets:** Node a fixed in all six global DOFs; node b free.

**Loads:** Tip nodal action {"moment":[0,0,11000]} at node b.

**Reference method:** closed-form hand calc

**Reference value(s):**

- rz: 0.00268292682927 rad

**Library output:**

- rz: 0.00268292682927 rad

**Error (%):** maximum 4.849340626026e-14

**Tolerance used and why:** 0.1%. Closed-form and exact algebraic references permit a 0.1% acceptance threshold.

**Pass/Fail:** Pass

**Frame3DD coverage:** direct

### VAL-01-006

**Test ID:** VAL-01-006

**Description:** Euler cantilever weak-axis tip moment

**Model:** L=3.6 m, Iyy=0.000024 m⁴, E=205000000000 Pa, Euler-Bernoulli.

**Supports / releases / springs / offsets:** Node a fixed in all six global DOFs; node b free.

**Loads:** Tip nodal action {"moment":[0,11000,0]} at node b.

**Reference method:** closed-form hand calc

**Reference value(s):**

- ry: 0.0080487804878 rad

**Library output:**

- ry: 0.0080487804878 rad

**Error (%):** maximum 0

**Tolerance used and why:** 0.1%. Closed-form and exact algebraic references permit a 0.1% acceptance threshold.

**Pass/Fail:** Pass

**Frame3DD coverage:** direct

### VAL-01-007

**Test ID:** VAL-01-007

**Description:** Euler cantilever full-span UDL

**Model:** L=4.2 m, Izz=0.000072 m⁴, E=205000000000 Pa, Euler-Bernoulli.

**Supports / releases / springs / offsets:** Node a fixed in all six global DOFs; node b free.

**Loads:** Uniform local-y distributed load w=-9,000 N/m over the full span.

**Reference method:** closed-form hand calc

**Reference value(s):**

- tip ty: -0.023717195122 m
- base Fy: 37800 N
- base Mz: 79380 N*m

**Library output:**

- tip ty: -0.023717195122 m
- base Fy: 37800 N
- base Mz: 79380 N*m

**Error (%):** maximum 7.314201645924e-14

**Tolerance used and why:** 0.1%. Closed-form and exact algebraic references permit a 0.1% acceptance threshold.

**Pass/Fail:** Pass

**Frame3DD coverage:** direct

### VAL-01-008

**Test ID:** VAL-01-008

**Description:** Simply supported beam with a midspan point load

**Model:** Two equal Euler elements, total L=6 m, Izz=0.000072 m⁴, E=205000000000 Pa.

**Supports / releases / springs / offsets:** Node a pinned with axial restraint; node c roller; planar unused DOFs restrained.

**Loads:** Midspan nodal force P=-24,000 N at node b.

**Reference method:** closed-form hand calc

**Reference value(s):**

- midspan ty: -0.00731707317073 m
- left reaction: 12000 N
- right reaction: 12000 N

**Library output:**

- midspan ty: -0.00731707317073 m
- left reaction: 12000 N
- right reaction: 12000 N

**Error (%):** maximum 6.063298011820e-14

**Tolerance used and why:** 0.1%. Closed-form and exact algebraic references permit a 0.1% acceptance threshold.

**Pass/Fail:** Pass

**Frame3DD coverage:** overlap-indirect

### VAL-01-009

**Test ID:** VAL-01-009

**Description:** Simply supported beam with full-span UDL

**Model:** Two equal Euler elements, total L=6 m, Izz=0.000072 m⁴, E=205000000000 Pa.

**Supports / releases / springs / offsets:** Node a pinned with axial restraint; node c roller; planar unused DOFs restrained.

**Loads:** Uniform local-y load w=-8,000 N/m on both half-span elements.

**Reference method:** closed-form hand calc

**Reference value(s):**

- midspan ty: -0.00914634146341 m
- left reaction: 24000 N
- right reaction: 24000 N

**Library output:**

- midspan ty: -0.00914634146341 m
- left reaction: 24000 N
- right reaction: 24000 N

**Error (%):** maximum 4.547473508865e-14

**Tolerance used and why:** 0.1%. Closed-form and exact algebraic references permit a 0.1% acceptance threshold.

**Pass/Fail:** Pass

**Frame3DD coverage:** direct

### VAL-01-010

**Test ID:** VAL-01-010

**Description:** Simply supported beam with unequal end moments

**Model:** Single Euler member L=5 m, Izz=0.000072 m⁴, E=205000000000 Pa.

**Supports / releases / springs / offsets:** Node a pinned with axial restraint; node b roller; planar unused DOFs restrained.

**Loads:** Global end moments Mz(a)=7,000 N*m and Mz(b)=-3,000 N*m.

**Reference method:** closed-form hand calc

**Reference value(s):**

- left rotation rz: 0.000959801264679 rad
- right rotation rz: -0.00073396567299 rad
- left vertical reaction: 800 N
- right vertical reaction: -800 N

**Library output:**

- left rotation rz: 0.000959801264679 rad
- right rotation rz: -0.00073396567299 rad
- left vertical reaction: 800 N
- right vertical reaction: -800 N

**Error (%):** maximum 1.477183759928e-14

**Tolerance used and why:** 0.1%. Closed-form and exact algebraic references permit a 0.1% acceptance threshold.

**Pass/Fail:** Pass

**Frame3DD coverage:** direct

### VAL-01-011

**Test ID:** VAL-01-011

**Description:** Fixed-fixed beam with a central point load

**Model:** Two equal Euler elements, total L=6 m, Izz=0.000072 m⁴, E=205000000000 Pa.

**Supports / releases / springs / offsets:** Both end nodes fixed in all six DOFs.

**Loads:** Central nodal force P=-24,000 N.

**Reference method:** published benchmark table

**Reference value(s):**

- midspan ty: -0.00182926829268 m
- left reaction: 12000 N
- right reaction: 12000 N
- left fixed-end moment magnitude: 18000 N*m
- right fixed-end moment magnitude: 18000 N*m

**Library output:**

- midspan ty: -0.00182926829268 m
- left reaction: 12000 N
- right reaction: 12000 N
- left fixed-end moment magnitude: 18000 N*m
- right fixed-end moment magnitude: 18000 N*m

**Error (%):** maximum 2.370788750502e-14

**Tolerance used and why:** 0.1%. Closed-form and exact algebraic references permit a 0.1% acceptance threshold.

**Pass/Fail:** Pass

**Frame3DD coverage:** direct

### VAL-01-012

**Test ID:** VAL-01-012

**Description:** Fixed-fixed beam with full-span UDL

**Model:** Two equal Euler elements, total L=6 m, Izz=0.000072 m⁴, E=205000000000 Pa.

**Supports / releases / springs / offsets:** Both end nodes fixed in all six DOFs.

**Loads:** Uniform local-y load w=-8,000 N/m on both half-span elements.

**Reference method:** published benchmark table

**Reference value(s):**

- midspan ty: -0.00182926829268 m
- left reaction: 24000 N
- right reaction: 24000 N
- left fixed-end moment magnitude: 24000 N*m
- right fixed-end moment magnitude: 24000 N*m

**Library output:**

- midspan ty: -0.00182926829268 m
- left reaction: 24000 N
- right reaction: 24000 N
- left fixed-end moment magnitude: 24000 N*m
- right fixed-end moment magnitude: 24000 N*m

**Error (%):** maximum 1.515824502955e-14

**Tolerance used and why:** 0.1%. Closed-form and exact algebraic references permit a 0.1% acceptance threshold.

**Pass/Fail:** Pass

**Frame3DD coverage:** direct

### VAL-01-013

**Test ID:** VAL-01-013

**Description:** Propped cantilever with a central point load

**Model:** Two equal Euler elements, total L=6 m, Izz=0.000072 m⁴, E=205000000000 Pa.

**Supports / releases / springs / offsets:** Node a fixed; node c vertical roller with planar unused DOFs restrained.

**Loads:** Central nodal force P=-24,000 N.

**Reference method:** closed-form hand calc

**Reference value(s):**

- prop reaction: 7500 N
- fixed vertical reaction: 16500 N
- fixed moment magnitude: 27000 N*m

**Library output:**

- prop reaction: 7500 N
- fixed vertical reaction: 16500 N
- fixed moment magnitude: 27000 N*m

**Error (%):** maximum 2.694799116364e-14

**Tolerance used and why:** 0.1%. Closed-form and exact algebraic references permit a 0.1% acceptance threshold.

**Pass/Fail:** Pass

**Frame3DD coverage:** direct

### VAL-01-014

**Test ID:** VAL-01-014

**Description:** Propped cantilever with full-span UDL

**Model:** Two equal Euler elements, total L=6 m, Izz=0.000072 m⁴, E=205000000000 Pa.

**Supports / releases / springs / offsets:** Node a fixed; node c vertical roller with planar unused DOFs restrained.

**Loads:** Uniform local-y load w=-8,000 N/m on both half-span elements.

**Reference method:** closed-form hand calc

**Reference value(s):**

- prop reaction: 18000 N
- fixed vertical reaction: 30000 N
- fixed moment magnitude: 36000 N*m

**Library output:**

- prop reaction: 18000 N
- fixed vertical reaction: 30000 N
- fixed moment magnitude: 36000 N*m

**Error (%):** maximum 2.425319204728e-14

**Tolerance used and why:** 0.1%. Closed-form and exact algebraic references permit a 0.1% acceptance threshold.

**Pass/Fail:** Pass

**Frame3DD coverage:** direct

### VAL-01-015

**Test ID:** VAL-01-015

**Description:** Simply supported beam with a loaded overhang

**Model:** Euler beam with support span L=5 m and overhang a=2 m, Izz=0.000072 m⁴.

**Supports / releases / springs / offsets:** Node a pin with axial restraint; node b roller; free overhang tip c.

**Loads:** Downward tip load P=-15,000 N at c.

**Reference method:** closed-form hand calc

**Reference value(s):**

- left reaction: -6000 N
- right reaction: 21000 N
- support moment magnitude: 30000 N*m

**Library output:**

- left reaction: -6000 N
- right reaction: 21000 N
- support moment magnitude: 30000 N*m

**Error (%):** maximum 4.547473508865e-14

**Tolerance used and why:** 0.1%. Closed-form and exact algebraic references permit a 0.1% acceptance threshold.

**Pass/Fail:** Pass

**Frame3DD coverage:** direct

### VAL-01-016

**Test ID:** VAL-01-016

**Description:** Two-span continuous beam under equal full-span UDL

**Model:** Two equal Euler spans L=4 m, Izz=0.000072 m⁴, E=205000000000 Pa.

**Supports / releases / springs / offsets:** Three simple supports; first support restrains axial translation; planar unused DOFs restrained.

**Loads:** Uniform local-y load w=-10,000 N/m on each span.

**Reference method:** published benchmark table

**Reference value(s):**

- left reaction: 15000 N
- interior reaction: 50000 N
- right reaction: 15000 N
- interior support moment magnitude: 20000 N*m

**Library output:**

- left reaction: 15000 N
- interior reaction: 50000 N
- right reaction: 15000 N
- interior support moment magnitude: 20000 N*m

**Error (%):** maximum 2.425319204728e-14

**Tolerance used and why:** 0.1%. Closed-form and exact algebraic references permit a 0.1% acceptance threshold.

**Pass/Fail:** Pass

**Frame3DD coverage:** direct

### VAL-01-017

**Test ID:** VAL-01-017

**Description:** Three-span continuous beam under equal full-span UDL

**Model:** Three equal Euler spans L=4 m, Izz=0.000072 m⁴, E=205000000000 Pa.

**Supports / releases / springs / offsets:** Four simple supports; first support restrains axial translation; planar unused DOFs restrained.

**Loads:** Uniform local-y load w=-10,000 N/m on all three spans.

**Reference method:** published benchmark table

**Reference value(s):**

- end reaction a: 16000 N
- interior reaction b: 44000 N
- interior reaction c: 44000 N
- end reaction d: 16000 N
- support moment b magnitude: 16000 N*m
- support moment c magnitude: 16000 N*m

**Library output:**

- end reaction a: 16000 N
- interior reaction b: 44000 N
- interior reaction c: 44000 N
- end reaction d: 16000 N
- support moment b magnitude: 16000 N*m
- support moment c magnitude: 16000 N*m

**Error (%):** maximum 2.273736754432e-14

**Tolerance used and why:** 0.1%. Closed-form and exact algebraic references permit a 0.1% acceptance threshold.

**Pass/Fail:** Pass

**Frame3DD coverage:** direct

### VAL-02-001

**Test ID:** VAL-02-001

**Description:** Deep Timoshenko cantilever tip load includes exact shear deformation

**Model:** L=1.0 m, A=0.12 m², Izz=0.0036 m⁴, Asy=0.10 m², E=30 GPa, G=12 GPa.

**Supports / releases / springs / offsets:** Node a fixed; node b free.

**Loads:** Tip local/global-y force P=120,000 N.

**Reference method:** closed-form hand calc

**Reference value(s):**

- tip ty: 0.00047037037037 m

**Library output:**

- tip ty: 0.00047037037037 m

**Error (%):** maximum 1.152498372327e-14

**Tolerance used and why:** 0.1%. Closed-form and exact algebraic references permit a 0.1% acceptance threshold.

**Pass/Fail:** Pass

**Frame3DD coverage:** direct

### VAL-02-002

**Test ID:** VAL-02-002

**Description:** Timoshenko cantilever under pure tip moment equals Euler-Bernoulli

**Model:** Same deep beam analyzed once as Euler-Bernoulli and once as Timoshenko.

**Supports / releases / springs / offsets:** Node a fixed; node b free.

**Loads:** Tip moment Mz=80,000 N*m; no shear force.

**Reference method:** closed-form hand calc

**Reference value(s):**

- Euler tip rotation: 0.000740740740741 rad
- Timoshenko tip rotation: 0.000740740740741 rad
- theory difference: 0 rad

**Library output:**

- Euler tip rotation: 0.000740740740741 rad
- Timoshenko tip rotation: 0.000740740740741 rad
- theory difference: 2.168404344971e-19 rad

**Error (%):** maximum 2.927345865711e-14

**Tolerance used and why:** 0.1%. Closed-form and exact algebraic references permit a 0.1% acceptance threshold.

**Pass/Fail:** Pass

**Frame3DD coverage:** direct

### VAL-02-003

**Test ID:** VAL-02-003

**Description:** Timoshenko slenderness sweep converges monotonically to Euler-Bernoulli

**Model:** Rectangular beam b=0.2 m, d=0.4 m, As=5A/6, L/d={2,5,10,20,50}.

**Supports / releases / springs / offsets:** Cantilever fixed at a.

**Loads:** Tip local-y force P=10,000 N.

**Reference method:** closed-form hand calc

**Reference value(s):**

- L/d=2: 9.323865390553e-6 m
- L/d=5: 0.000125748687867 m
- L/d=10: 0.000983204692806 m
- L/d=20: 0.0078200679222 m
- L/d=50: 0.121989194196 m

**Library output:**

- L/d=2: 9.323865390553e-6 m
- L/d=5: 0.000125748687867 m
- L/d=10: 0.000983204692806 m
- L/d=20: 0.0078200679222 m
- L/d=50: 0.121989194196 m

**Error (%):** maximum 1.109148598986e-13

**Tolerance used and why:** 0.1%. Closed-form and exact algebraic references permit a 0.1% acceptance threshold.

**Pass/Fail:** Pass

**Frame3DD coverage:** overlap-indirect

### VAL-02-004

**Test ID:** VAL-02-004

**Description:** Explicit effective shear areas for rectangular, circular, and wide-flange sections are consumed once

**Model:** Three otherwise identical deep cantilevers with As/A={5/6,0.90,0.35}.

**Supports / releases / springs / offsets:** Each cantilever fixed at a.

**Loads:** Tip local-y force P=15,000 N.

**Reference method:** published benchmark table

**Reference value(s):**

- rectangular tip ty: 0.0000385396727385 m
- circular tip ty: 0.0000382865081815 m
- wide-flange tip ty: 0.0000432593834076 m

**Library output:**

- rectangular tip ty: 0.0000385396727385 m
- circular tip ty: 0.0000382865081815 m
- wide-flange tip ty: 0.0000432593834076 m

**Error (%):** maximum 8.791283236904e-14

**Tolerance used and why:** 0.1%. Closed-form and exact algebraic references permit a 0.1% acceptance threshold.

**Pass/Fail:** Pass

**Frame3DD coverage:** direct

**Notes:** xframe accepts effective shear area; it does not infer section shape. Published factors are supplied by the caller.

### VAL-02-005

**Test ID:** VAL-02-005

**Description:** Simply supported deep Timoshenko beam under UDL

**Model:** Two equal Timoshenko elements, L=2 m, Izz=0.0015 m⁴, Asy=0.06 m².

**Supports / releases / springs / offsets:** Pin at a, roller at c, planar unused DOFs restrained.

**Loads:** Uniform local-y load w=-40,000 N/m over the full span.

**Reference method:** published benchmark table

**Reference value(s):**

- midspan ty: -0.000212962962963 m

**Library output:**

- midspan ty: -0.000212962962963 m

**Error (%):** maximum 1.272759072048e-14

**Tolerance used and why:** 0.1%. Closed-form and exact algebraic references permit a 0.1% acceptance threshold.

**Pass/Fail:** Pass

**Frame3DD coverage:** direct

### VAL-02-006

**Test ID:** VAL-02-006

**Description:** Timoshenko with enormous shear area degenerates to Euler-Bernoulli

**Model:** Identical cantilevers; Timoshenko As=1e12 m² versus Euler-Bernoulli.

**Supports / releases / springs / offsets:** Node a fixed; node b free.

**Loads:** Tip local-y force P=20,000 N.

**Reference method:** self-consistency check

**Reference value(s):**

- tip ty: 0.0121951219512 m

**Library output:**

- tip ty: 0.0121951219512 m

**Error (%):** maximum 9.957312752107e-14

**Tolerance used and why:** 0.1%. Closed-form and exact algebraic references permit a 0.1% acceptance threshold.

**Pass/Fail:** Pass

**Frame3DD coverage:** overlap-indirect

### VAL-03-001

**Test ID:** VAL-03-001

**Description:** euler-bernoulli unit tx compliance at the start end

**Model:** Single local-x member L=3.1 m, A=0.018, Iyy=0.000024, Izz=0.000072, J=0.000013; euler-bernoulli.

**Supports / releases / springs / offsets:** The end node is fixed in all six DOFs.

**Loads:** Positive unit action in local/global tx at the free start node.

**Reference method:** closed-form hand calc

**Reference value(s):**

- a.tx: 8.401084010840e-10 m

**Library output:**

- a.tx: 8.401084010840e-10 m

**Error (%):** maximum 1.230764701742e-14

**Tolerance used and why:** 0.1%. Closed-form and exact algebraic references permit a 0.1% acceptance threshold.

**Pass/Fail:** Pass

**Frame3DD coverage:** matrix-direct

### VAL-03-002

**Test ID:** VAL-03-002

**Description:** euler-bernoulli unit ty compliance at the start end

**Model:** Single local-x member L=3.1 m, A=0.018, Iyy=0.000024, Izz=0.000072, J=0.000013; euler-bernoulli.

**Supports / releases / springs / offsets:** The end node is fixed in all six DOFs.

**Loads:** Positive unit action in local/global ty at the free start node.

**Reference method:** closed-form hand calc

**Reference value(s):**

- a.ty: 6.727868112014e-7 m

**Library output:**

- a.ty: 6.727868112014e-7 m

**Error (%):** maximum 7.868697531222e-14

**Tolerance used and why:** 0.1%. Closed-form and exact algebraic references permit a 0.1% acceptance threshold.

**Pass/Fail:** Pass

**Frame3DD coverage:** matrix-direct

### VAL-03-003

**Test ID:** VAL-03-003

**Description:** euler-bernoulli unit tz compliance at the start end

**Model:** Single local-x member L=3.1 m, A=0.018, Iyy=0.000024, Izz=0.000072, J=0.000013; euler-bernoulli.

**Supports / releases / springs / offsets:** The end node is fixed in all six DOFs.

**Loads:** Positive unit action in local/global tz at the free start node.

**Reference method:** closed-form hand calc

**Reference value(s):**

- a.tz: 2.018360433604e-6 m

**Library output:**

- a.tz: 2.018360433604e-6 m

**Error (%):** maximum 2.098319341659e-14

**Tolerance used and why:** 0.1%. Closed-form and exact algebraic references permit a 0.1% acceptance threshold.

**Pass/Fail:** Pass

**Frame3DD coverage:** matrix-direct

### VAL-03-004

**Test ID:** VAL-03-004

**Description:** euler-bernoulli unit rx compliance at the start end

**Model:** Single local-x member L=3.1 m, A=0.018, Iyy=0.000024, Izz=0.000072, J=0.000013; euler-bernoulli.

**Supports / releases / springs / offsets:** The end node is fixed in all six DOFs.

**Loads:** Positive unit action in local/global rx at the free start node.

**Reference method:** closed-form hand calc

**Reference value(s):**

- a.rx: 3.018500486855e-6 rad

**Library output:**

- a.rx: 3.018500486855e-6 rad

**Error (%):** maximum 1.403069091662e-14

**Tolerance used and why:** 0.1%. Closed-form and exact algebraic references permit a 0.1% acceptance threshold.

**Pass/Fail:** Pass

**Frame3DD coverage:** matrix-direct

### VAL-03-005

**Test ID:** VAL-03-005

**Description:** euler-bernoulli unit ry compliance at the start end

**Model:** Single local-x member L=3.1 m, A=0.018, Iyy=0.000024, Izz=0.000072, J=0.000013; euler-bernoulli.

**Supports / releases / springs / offsets:** The end node is fixed in all six DOFs.

**Loads:** Positive unit action in local/global ry at the free start node.

**Reference method:** closed-form hand calc

**Reference value(s):**

- a.ry: 6.300813008130e-7 rad

**Library output:**

- a.ry: 6.300813008130e-7 rad

**Error (%):** maximum 0

**Tolerance used and why:** 0.1%. Closed-form and exact algebraic references permit a 0.1% acceptance threshold.

**Pass/Fail:** Pass

**Frame3DD coverage:** matrix-direct

### VAL-03-006

**Test ID:** VAL-03-006

**Description:** euler-bernoulli unit rz compliance at the start end

**Model:** Single local-x member L=3.1 m, A=0.018, Iyy=0.000024, Izz=0.000072, J=0.000013; euler-bernoulli.

**Supports / releases / springs / offsets:** The end node is fixed in all six DOFs.

**Loads:** Positive unit action in local/global rz at the free start node.

**Reference method:** closed-form hand calc

**Reference value(s):**

- a.rz: 2.100271002710e-7 rad

**Library output:**

- a.rz: 2.100271002710e-7 rad

**Error (%):** maximum 1.008242443667e-13

**Tolerance used and why:** 0.1%. Closed-form and exact algebraic references permit a 0.1% acceptance threshold.

**Pass/Fail:** Pass

**Frame3DD coverage:** matrix-direct

### VAL-03-007

**Test ID:** VAL-03-007

**Description:** euler-bernoulli unit tx compliance at the end end

**Model:** Single local-x member L=3.1 m, A=0.018, Iyy=0.000024, Izz=0.000072, J=0.000013; euler-bernoulli.

**Supports / releases / springs / offsets:** The start node is fixed in all six DOFs.

**Loads:** Positive unit action in local/global tx at the free end node.

**Reference method:** closed-form hand calc

**Reference value(s):**

- b.tx: 8.401084010840e-10 m

**Library output:**

- b.tx: 8.401084010840e-10 m

**Error (%):** maximum 1.230764701742e-14

**Tolerance used and why:** 0.1%. Closed-form and exact algebraic references permit a 0.1% acceptance threshold.

**Pass/Fail:** Pass

**Frame3DD coverage:** matrix-direct

### VAL-03-008

**Test ID:** VAL-03-008

**Description:** euler-bernoulli unit ty compliance at the end end

**Model:** Single local-x member L=3.1 m, A=0.018, Iyy=0.000024, Izz=0.000072, J=0.000013; euler-bernoulli.

**Supports / releases / springs / offsets:** The start node is fixed in all six DOFs.

**Loads:** Positive unit action in local/global ty at the free end node.

**Reference method:** closed-form hand calc

**Reference value(s):**

- b.ty: 6.727868112014e-7 m

**Library output:**

- b.ty: 6.727868112014e-7 m

**Error (%):** maximum 7.868697531222e-14

**Tolerance used and why:** 0.1%. Closed-form and exact algebraic references permit a 0.1% acceptance threshold.

**Pass/Fail:** Pass

**Frame3DD coverage:** matrix-direct

### VAL-03-009

**Test ID:** VAL-03-009

**Description:** euler-bernoulli unit tz compliance at the end end

**Model:** Single local-x member L=3.1 m, A=0.018, Iyy=0.000024, Izz=0.000072, J=0.000013; euler-bernoulli.

**Supports / releases / springs / offsets:** The start node is fixed in all six DOFs.

**Loads:** Positive unit action in local/global tz at the free end node.

**Reference method:** closed-form hand calc

**Reference value(s):**

- b.tz: 2.018360433604e-6 m

**Library output:**

- b.tz: 2.018360433604e-6 m

**Error (%):** maximum 2.098319341659e-14

**Tolerance used and why:** 0.1%. Closed-form and exact algebraic references permit a 0.1% acceptance threshold.

**Pass/Fail:** Pass

**Frame3DD coverage:** matrix-direct

### VAL-03-010

**Test ID:** VAL-03-010

**Description:** euler-bernoulli unit rx compliance at the end end

**Model:** Single local-x member L=3.1 m, A=0.018, Iyy=0.000024, Izz=0.000072, J=0.000013; euler-bernoulli.

**Supports / releases / springs / offsets:** The start node is fixed in all six DOFs.

**Loads:** Positive unit action in local/global rx at the free end node.

**Reference method:** closed-form hand calc

**Reference value(s):**

- b.rx: 3.018500486855e-6 rad

**Library output:**

- b.rx: 3.018500486855e-6 rad

**Error (%):** maximum 1.403069091662e-14

**Tolerance used and why:** 0.1%. Closed-form and exact algebraic references permit a 0.1% acceptance threshold.

**Pass/Fail:** Pass

**Frame3DD coverage:** matrix-direct

### VAL-03-011

**Test ID:** VAL-03-011

**Description:** euler-bernoulli unit ry compliance at the end end

**Model:** Single local-x member L=3.1 m, A=0.018, Iyy=0.000024, Izz=0.000072, J=0.000013; euler-bernoulli.

**Supports / releases / springs / offsets:** The start node is fixed in all six DOFs.

**Loads:** Positive unit action in local/global ry at the free end node.

**Reference method:** closed-form hand calc

**Reference value(s):**

- b.ry: 6.300813008130e-7 rad

**Library output:**

- b.ry: 6.300813008130e-7 rad

**Error (%):** maximum 0

**Tolerance used and why:** 0.1%. Closed-form and exact algebraic references permit a 0.1% acceptance threshold.

**Pass/Fail:** Pass

**Frame3DD coverage:** matrix-direct

### VAL-03-012

**Test ID:** VAL-03-012

**Description:** euler-bernoulli unit rz compliance at the end end

**Model:** Single local-x member L=3.1 m, A=0.018, Iyy=0.000024, Izz=0.000072, J=0.000013; euler-bernoulli.

**Supports / releases / springs / offsets:** The start node is fixed in all six DOFs.

**Loads:** Positive unit action in local/global rz at the free end node.

**Reference method:** closed-form hand calc

**Reference value(s):**

- b.rz: 2.100271002710e-7 rad

**Library output:**

- b.rz: 2.100271002710e-7 rad

**Error (%):** maximum 1.008242443667e-13

**Tolerance used and why:** 0.1%. Closed-form and exact algebraic references permit a 0.1% acceptance threshold.

**Pass/Fail:** Pass

**Frame3DD coverage:** matrix-direct

### VAL-03-013

**Test ID:** VAL-03-013

**Description:** timoshenko unit tx compliance at the start end

**Model:** Single local-x member L=3.1 m, A=0.018, Iyy=0.000024, Izz=0.000072, J=0.000013; timoshenko.

**Supports / releases / springs / offsets:** The end node is fixed in all six DOFs.

**Loads:** Positive unit action in local/global tx at the free start node.

**Reference method:** closed-form hand calc

**Reference value(s):**

- a.tx: 8.401084010840e-10 m

**Library output:**

- a.tx: 8.401084010840e-10 m

**Error (%):** maximum 1.230764701742e-14

**Tolerance used and why:** 0.1%. Closed-form and exact algebraic references permit a 0.1% acceptance threshold.

**Pass/Fail:** Pass

**Frame3DD coverage:** matrix-direct

### VAL-03-014

**Test ID:** VAL-03-014

**Description:** timoshenko unit ty compliance at the start end

**Model:** Single local-x member L=3.1 m, A=0.018, Iyy=0.000024, Izz=0.000072, J=0.000013; timoshenko.

**Supports / releases / springs / offsets:** The end node is fixed in all six DOFs.

**Loads:** Positive unit action in local/global ty at the free start node.

**Reference method:** closed-form hand calc

**Reference value(s):**

- a.ty: 6.755897045107e-7 m

**Library output:**

- a.ty: 6.755897045107e-7 m

**Error (%):** maximum 1.410489324066e-13

**Tolerance used and why:** 0.1%. Closed-form and exact algebraic references permit a 0.1% acceptance threshold.

**Pass/Fail:** Pass

**Frame3DD coverage:** matrix-direct

### VAL-03-015

**Test ID:** VAL-03-015

**Description:** timoshenko unit tz compliance at the start end

**Model:** Single local-x member L=3.1 m, A=0.018, Iyy=0.000024, Izz=0.000072, J=0.000013; timoshenko.

**Supports / releases / springs / offsets:** The end node is fixed in all six DOFs.

**Loads:** Positive unit action in local/global tz at the free start node.

**Reference method:** closed-form hand calc

**Reference value(s):**

- a.tz: 2.021378934091e-6 m

**Library output:**

- a.tz: 2.021378934091e-6 m

**Error (%):** maximum 8.380743788004e-14

**Tolerance used and why:** 0.1%. Closed-form and exact algebraic references permit a 0.1% acceptance threshold.

**Pass/Fail:** Pass

**Frame3DD coverage:** matrix-direct

### VAL-03-016

**Test ID:** VAL-03-016

**Description:** timoshenko unit rx compliance at the start end

**Model:** Single local-x member L=3.1 m, A=0.018, Iyy=0.000024, Izz=0.000072, J=0.000013; timoshenko.

**Supports / releases / springs / offsets:** The end node is fixed in all six DOFs.

**Loads:** Positive unit action in local/global rx at the free start node.

**Reference method:** closed-form hand calc

**Reference value(s):**

- a.rx: 3.018500486855e-6 rad

**Library output:**

- a.rx: 3.018500486855e-6 rad

**Error (%):** maximum 1.403069091662e-14

**Tolerance used and why:** 0.1%. Closed-form and exact algebraic references permit a 0.1% acceptance threshold.

**Pass/Fail:** Pass

**Frame3DD coverage:** matrix-direct

### VAL-03-017

**Test ID:** VAL-03-017

**Description:** timoshenko unit ry compliance at the start end

**Model:** Single local-x member L=3.1 m, A=0.018, Iyy=0.000024, Izz=0.000072, J=0.000013; timoshenko.

**Supports / releases / springs / offsets:** The end node is fixed in all six DOFs.

**Loads:** Positive unit action in local/global ry at the free start node.

**Reference method:** closed-form hand calc

**Reference value(s):**

- a.ry: 6.300813008130e-7 rad

**Library output:**

- a.ry: 6.300813008130e-7 rad

**Error (%):** maximum 8.402020363893e-14

**Tolerance used and why:** 0.1%. Closed-form and exact algebraic references permit a 0.1% acceptance threshold.

**Pass/Fail:** Pass

**Frame3DD coverage:** matrix-direct

### VAL-03-018

**Test ID:** VAL-03-018

**Description:** timoshenko unit rz compliance at the start end

**Model:** Single local-x member L=3.1 m, A=0.018, Iyy=0.000024, Izz=0.000072, J=0.000013; timoshenko.

**Supports / releases / springs / offsets:** The end node is fixed in all six DOFs.

**Loads:** Positive unit action in local/global rz at the free start node.

**Reference method:** closed-form hand calc

**Reference value(s):**

- a.rz: 2.100271002710e-7 rad

**Library output:**

- a.rz: 2.100271002710e-7 rad

**Error (%):** maximum 1.890454581876e-13

**Tolerance used and why:** 0.1%. Closed-form and exact algebraic references permit a 0.1% acceptance threshold.

**Pass/Fail:** Pass

**Frame3DD coverage:** matrix-direct

### VAL-03-019

**Test ID:** VAL-03-019

**Description:** timoshenko unit tx compliance at the end end

**Model:** Single local-x member L=3.1 m, A=0.018, Iyy=0.000024, Izz=0.000072, J=0.000013; timoshenko.

**Supports / releases / springs / offsets:** The start node is fixed in all six DOFs.

**Loads:** Positive unit action in local/global tx at the free end node.

**Reference method:** closed-form hand calc

**Reference value(s):**

- b.tx: 8.401084010840e-10 m

**Library output:**

- b.tx: 8.401084010840e-10 m

**Error (%):** maximum 1.230764701742e-14

**Tolerance used and why:** 0.1%. Closed-form and exact algebraic references permit a 0.1% acceptance threshold.

**Pass/Fail:** Pass

**Frame3DD coverage:** matrix-direct

### VAL-03-020

**Test ID:** VAL-03-020

**Description:** timoshenko unit ty compliance at the end end

**Model:** Single local-x member L=3.1 m, A=0.018, Iyy=0.000024, Izz=0.000072, J=0.000013; timoshenko.

**Supports / releases / springs / offsets:** The start node is fixed in all six DOFs.

**Loads:** Positive unit action in local/global ty at the free end node.

**Reference method:** closed-form hand calc

**Reference value(s):**

- b.ty: 6.755897045107e-7 m

**Library output:**

- b.ty: 6.755897045107e-7 m

**Error (%):** maximum 1.410489324066e-13

**Tolerance used and why:** 0.1%. Closed-form and exact algebraic references permit a 0.1% acceptance threshold.

**Pass/Fail:** Pass

**Frame3DD coverage:** matrix-direct

### VAL-03-021

**Test ID:** VAL-03-021

**Description:** timoshenko unit tz compliance at the end end

**Model:** Single local-x member L=3.1 m, A=0.018, Iyy=0.000024, Izz=0.000072, J=0.000013; timoshenko.

**Supports / releases / springs / offsets:** The start node is fixed in all six DOFs.

**Loads:** Positive unit action in local/global tz at the free end node.

**Reference method:** closed-form hand calc

**Reference value(s):**

- b.tz: 2.021378934091e-6 m

**Library output:**

- b.tz: 2.021378934091e-6 m

**Error (%):** maximum 8.380743788004e-14

**Tolerance used and why:** 0.1%. Closed-form and exact algebraic references permit a 0.1% acceptance threshold.

**Pass/Fail:** Pass

**Frame3DD coverage:** matrix-direct

### VAL-03-022

**Test ID:** VAL-03-022

**Description:** timoshenko unit rx compliance at the end end

**Model:** Single local-x member L=3.1 m, A=0.018, Iyy=0.000024, Izz=0.000072, J=0.000013; timoshenko.

**Supports / releases / springs / offsets:** The start node is fixed in all six DOFs.

**Loads:** Positive unit action in local/global rx at the free end node.

**Reference method:** closed-form hand calc

**Reference value(s):**

- b.rx: 3.018500486855e-6 rad

**Library output:**

- b.rx: 3.018500486855e-6 rad

**Error (%):** maximum 1.403069091662e-14

**Tolerance used and why:** 0.1%. Closed-form and exact algebraic references permit a 0.1% acceptance threshold.

**Pass/Fail:** Pass

**Frame3DD coverage:** matrix-direct

### VAL-03-023

**Test ID:** VAL-03-023

**Description:** timoshenko unit ry compliance at the end end

**Model:** Single local-x member L=3.1 m, A=0.018, Iyy=0.000024, Izz=0.000072, J=0.000013; timoshenko.

**Supports / releases / springs / offsets:** The start node is fixed in all six DOFs.

**Loads:** Positive unit action in local/global ry at the free end node.

**Reference method:** closed-form hand calc

**Reference value(s):**

- b.ry: 6.300813008130e-7 rad

**Library output:**

- b.ry: 6.300813008130e-7 rad

**Error (%):** maximum 8.402020363893e-14

**Tolerance used and why:** 0.1%. Closed-form and exact algebraic references permit a 0.1% acceptance threshold.

**Pass/Fail:** Pass

**Frame3DD coverage:** matrix-direct

### VAL-03-024

**Test ID:** VAL-03-024

**Description:** timoshenko unit rz compliance at the end end

**Model:** Single local-x member L=3.1 m, A=0.018, Iyy=0.000024, Izz=0.000072, J=0.000013; timoshenko.

**Supports / releases / springs / offsets:** The start node is fixed in all six DOFs.

**Loads:** Positive unit action in local/global rz at the free end node.

**Reference method:** closed-form hand calc

**Reference value(s):**

- b.rz: 2.100271002710e-7 rad

**Library output:**

- b.rz: 2.100271002710e-7 rad

**Error (%):** maximum 1.890454581876e-13

**Tolerance used and why:** 0.1%. Closed-form and exact algebraic references permit a 0.1% acceptance threshold.

**Pass/Fail:** Pass

**Frame3DD coverage:** matrix-direct

### VAL-04-001

**Test ID:** VAL-04-001

**Description:** Cantilever fixed-end rigid offset shortens the elastic span

**Model:** Reference span 5 m; start rigid offset +1 m in local x; elastic L=4 m; E=205000000000, Izz=0.000072.

**Supports / releases / springs / offsets:** Reference node a fixed in all six DOFs; node b free.

**Loads:** Tip nodal force Fy=18,000 N at reference node b.

**Reference method:** closed-form hand calc

**Reference value(s):**

- tip ty: 0.0260162601626 m
- tip rz: 0.00975609756098 rad

**Library output:**

- tip ty: 0.0260162601626 m
- tip rz: 0.00975609756098 rad

**Error (%):** maximum 0

**Tolerance used and why:** 0.1%. Closed-form and exact algebraic references permit a 0.1% acceptance threshold.

**Pass/Fail:** Pass

**Frame3DD coverage:** unsupported

**Notes:** Frame3DD does not expose xframe's exact vector rigid-offset model.

### VAL-04-002

**Test ID:** VAL-04-002

**Description:** Both-end collinear offsets match an explicit clear-span member at elastic ends

**Model:** Reference span 5 m; offsets +0.5 m and -0.75 m; clear span 3.75 m.

**Supports / releases / springs / offsets:** Start joint fixed; end joint free.

**Loads:** Tip nodal force Fy=12,000 N.

**Reference method:** equivalent-model cross-check

**Reference value(s):**

- elastic-end ty: 0.0185785060976 m
- elastic-end rz: 0.00800304878049 rad
- base moment: -54000 N*m

**Library output:**

- elastic-end ty: 0.0185785060976 m
- elastic-end rz: 0.00800304878049 rad
- base moment: -54000 N*m

**Error (%):** maximum 1.083789143086e-13

**Tolerance used and why:** 0.1%. Closed-form and exact algebraic references permit a 0.1% acceptance threshold.

**Pass/Fail:** Pass

**Frame3DD coverage:** unsupported

### VAL-04-003

**Test ID:** VAL-04-003

**Description:** A large rigid zone contributes no elastic deformation

**Model:** Reference span 5 m; fixed-end rigid offset 4 m; elastic span 1 m.

**Supports / releases / springs / offsets:** Start node fixed; end node free.

**Loads:** Tip nodal force Fy=10,000 N.

**Reference method:** closed-form hand calc

**Reference value(s):**

- tip ty: 0.000225835591689 m

**Library output:**

- tip ty: 0.000225835591689 m

**Error (%):** maximum 1.200211804941e-14

**Tolerance used and why:** 0.1%. Closed-form and exact algebraic references permit a 0.1% acceptance threshold.

**Pass/Fail:** Pass

**Frame3DD coverage:** unsupported

### VAL-04-004

**Test ID:** VAL-04-004

**Description:** Zero rigid offsets recover the baseline member exactly

**Model:** Two identical 4 m Euler cantilevers; one omits offsets and one uses explicit zero vectors.

**Supports / releases / springs / offsets:** Start node fixed; end node free.

**Loads:** Tip force [2,000,-8,000,3,000] N and tip moment [900,400,-600] N*m.

**Reference method:** equivalent-model cross-check

**Reference value(s):**

- b.tx: 2.168021680217e-6 m
- b.ty: -0.0118879855465 m
- b.tz: 0.0123577235772 m
- b.rx: 0.00350535540409 rad
- b.ry: -0.00455284552846 rad
- b.rz: -0.00449864498645 rad

**Library output:**

- b.tx: 2.168021680217e-6 m
- b.ty: -0.0118879855465 m
- b.tz: 0.0123577235772 m
- b.rx: 0.00350535540409 rad
- b.ry: -0.00455284552846 rad
- b.rz: -0.00449864498645 rad

**Error (%):** maximum 0

**Tolerance used and why:** 0.1%. Closed-form and exact algebraic references permit a 0.1% acceptance threshold.

**Pass/Fail:** Pass

**Frame3DD coverage:** unsupported

### VAL-04-005

**Test ID:** VAL-04-005

**Description:** Rigid offset and end release are applied in the correct order under UDL

**Model:** Reference span 5 m; +0.5 m start and -0.5 m end offsets; end rz released; elastic span 4 m.

**Supports / releases / springs / offsets:** Start node fixed; end node vertically restrained and rotationally free.

**Loads:** Uniform local-y load w=-9,000 N/m over the elastic span.

**Reference method:** closed-form hand calc

**Reference value(s):**

- released end moment: 0 N*m
- left reaction: 36000 N
- right reaction: 0 N

**Library output:**

- released end moment: 0 N*m
- left reaction: 36000 N
- right reaction: -1.818989403546e-12 N

**Error (%):** maximum 2.021099337273e-14

**Tolerance used and why:** 0.1%. Closed-form and exact algebraic references permit a 0.1% acceptance threshold.

**Pass/Fail:** Pass

**Frame3DD coverage:** unsupported

### VAL-04-006

**Test ID:** VAL-04-006

**Description:** Parallel lateral offsets create the expected axial-bending coupling

**Model:** 5 m member with equal +0.2 m global-y offsets at both ends; elastic axis remains parallel to global x.

**Supports / releases / springs / offsets:** Start reference node fixed; end reference node free.

**Loads:** Axial nodal force Fx=25,000 N at the end reference node.

**Reference method:** closed-form hand calc

**Reference value(s):**

- elastic start axial force magnitude: 25000 N
- elastic start bending moment magnitude: 5000 N*m
- elastic end bending moment magnitude: 5000 N*m

**Library output:**

- elastic start axial force magnitude: 25000 N
- elastic start bending moment magnitude: 5000 N*m
- elastic end bending moment magnitude: 5000 N*m

**Error (%):** maximum 7.275957614183e-14

**Tolerance used and why:** 0.1%. Closed-form and exact algebraic references permit a 0.1% acceptance threshold.

**Pass/Fail:** Pass

**Frame3DD coverage:** unsupported

### VAL-05-001

**Test ID:** VAL-05-001

**Description:** Arbitrarily oriented 3D member transforms an axial action exactly

**Model:** Frame from [1,-2,0.5] to [4,2,5.5], arbitrary non-axis-aligned orientation.

**Supports / releases / springs / offsets:** Start node fixed in all six DOFs.

**Loads:** End force P=30,000 N parallel to the member axis.

**Reference method:** closed-form hand calc

**Reference value(s):**

- axial displacement: 0.000057488356194 m
- transverse leakage: 0 m

**Library output:**

- axial displacement: 0.000057488356194 m
- transverse leakage: 4.006870662413e-17 m

**Error (%):** maximum 6.969882125154e-11

**Tolerance used and why:** 0.1%. Closed-form and exact algebraic references permit a 0.1% acceptance threshold.

**Pass/Fail:** Pass

**Frame3DD coverage:** direct

### VAL-05-002

**Test ID:** VAL-05-002

**Description:** Member roll/reference orientation at 0 degrees preserves local-y bending compliance

**Model:** 3.2 m global-x Euler member; orientation vector rotated 0 degrees in the global yz plane.

**Supports / releases / springs / offsets:** Start node fixed; end node free.

**Loads:** Tip force P=9,000 N along the constructed local y axis.

**Reference method:** closed-form hand calc

**Reference value(s):**

- local-y tip displacement: 0.00666016260163 m

**Library output:**

- local-y tip displacement: 0.00666016260163 m

**Error (%):** maximum 7.813878938421e-14

**Tolerance used and why:** 0.1%. Closed-form and exact algebraic references permit a 0.1% acceptance threshold.

**Pass/Fail:** Pass

**Frame3DD coverage:** direct

### VAL-05-003

**Test ID:** VAL-05-003

**Description:** Member roll/reference orientation at 45 degrees preserves local-y bending compliance

**Model:** 3.2 m global-x Euler member; orientation vector rotated 45 degrees in the global yz plane.

**Supports / releases / springs / offsets:** Start node fixed; end node free.

**Loads:** Tip force P=9,000 N along the constructed local y axis.

**Reference method:** closed-form hand calc

**Reference value(s):**

- local-y tip displacement: 0.00666016260163 m

**Library output:**

- local-y tip displacement: 0.00666016260163 m

**Error (%):** maximum 1.172081840763e-13

**Tolerance used and why:** 0.1%. Closed-form and exact algebraic references permit a 0.1% acceptance threshold.

**Pass/Fail:** Pass

**Frame3DD coverage:** direct

### VAL-05-004

**Test ID:** VAL-05-004

**Description:** Member roll/reference orientation at 90 degrees preserves local-y bending compliance

**Model:** 3.2 m global-x Euler member; orientation vector rotated 90 degrees in the global yz plane.

**Supports / releases / springs / offsets:** Start node fixed; end node free.

**Loads:** Tip force P=9,000 N along the constructed local y axis.

**Reference method:** closed-form hand calc

**Reference value(s):**

- local-y tip displacement: 0.00666016260163 m

**Library output:**

- local-y tip displacement: 0.00666016260163 m

**Error (%):** maximum 7.813878938421e-14

**Tolerance used and why:** 0.1%. Closed-form and exact algebraic references permit a 0.1% acceptance threshold.

**Pass/Fail:** Pass

**Frame3DD coverage:** direct

### VAL-05-005

**Test ID:** VAL-05-005

**Description:** Member roll/reference orientation at 180 degrees preserves local-y bending compliance

**Model:** 3.2 m global-x Euler member; orientation vector rotated 180 degrees in the global yz plane.

**Supports / releases / springs / offsets:** Start node fixed; end node free.

**Loads:** Tip force P=9,000 N along the constructed local y axis.

**Reference method:** closed-form hand calc

**Reference value(s):**

- local-y tip displacement: 0.00666016260163 m

**Library output:**

- local-y tip displacement: 0.00666016260163 m

**Error (%):** maximum 7.813878938421e-14

**Tolerance used and why:** 0.1%. Closed-form and exact algebraic references permit a 0.1% acceptance threshold.

**Pass/Fail:** Pass

**Frame3DD coverage:** direct

### VAL-05-006

**Test ID:** VAL-05-006

**Description:** Arbitrary non-45-degree diagonal truss matches axial closed form

**Model:** Truss from [0,0,0] to [2.3,3.7,1.4], A=0.018 m², E=205 GPa.

**Supports / releases / springs / offsets:** Start translations fixed; end transverse motion constrained by two affine equations, axial motion free.

**Loads:** End force P=22,000 N along the truss axis.

**Reference method:** closed-form hand calc

**Reference value(s):**

- axial displacement: 0.000027282530748 m

**Library output:**

- axial displacement: 0.000027282530748 m

**Error (%):** maximum 0

**Tolerance used and why:** 0.1%. Closed-form and exact algebraic references permit a 0.1% acceptance threshold.

**Pass/Fail:** Pass

**Frame3DD coverage:** direct

### VAL-05-007

**Test ID:** VAL-05-007

**Description:** Inclined tip force decomposes into independent biaxial bending responses

**Model:** 4 m member from [0,0,0] to [2,2,2.828427], with unequal Iyy and Izz.

**Supports / releases / springs / offsets:** Start node fixed; end node free.

**Loads:** Tip force with local components [0,7,000,-11,000] N.

**Reference method:** closed-form hand calc

**Reference value(s):**

- local-y displacement: 0.0101174345077 m
- local-z displacement: -0.0476964769648 m

**Library output:**

- local-y displacement: 0.0101174345077 m
- local-z displacement: -0.0476964769648 m

**Error (%):** maximum 3.680649535154e-12

**Tolerance used and why:** 0.1%. Closed-form and exact algebraic references permit a 0.1% acceptance threshold.

**Pass/Fail:** Pass

**Frame3DD coverage:** direct

### VAL-06-001

**Test ID:** VAL-06-001

**Description:** Fixed, pinned, and roller support components produce the exact simply-supported reactions

**Model:** Two-element 6 m Euler beam with a midspan node.

**Supports / releases / springs / offsets:** Left pin restrains tx and ty; right roller restrains ty; unused planar DOFs restrained.

**Loads:** Midspan force Fy=-24,000 N.

**Reference method:** closed-form hand calc

**Reference value(s):**

- left reaction: 12000 N
- right reaction: 12000 N
- pin rotation freedom: 0 N*m

**Library output:**

- left reaction: 12000 N
- right reaction: 12000 N
- pin rotation freedom: 0 N*m

**Error (%):** maximum 6.063298011820e-14

**Tolerance used and why:** 0.1%. Closed-form and exact algebraic references permit a 0.1% acceptance threshold.

**Pass/Fail:** Pass

**Frame3DD coverage:** direct

### VAL-06-002

**Test ID:** VAL-06-002

**Description:** Partial end restraint on unrelated DOFs does not alter in-plane cantilever bending

**Model:** 4 m Euler cantilever with additional end restraints tx and tz.

**Supports / releases / springs / offsets:** Start node fixed; end node restrains tx and tz only.

**Loads:** Tip force Fy=10,000 N.

**Reference method:** closed-form hand calc

**Reference value(s):**

- tip ty: 0.0144534778681 m
- restrained tx: 0 m
- restrained tz: 0 m

**Library output:**

- tip ty: 0.0144534778681 m
- restrained tx: 0 m
- restrained tz: 0 m

**Error (%):** maximum 1.200211804941e-14

**Tolerance used and why:** 0.1%. Closed-form and exact algebraic references permit a 0.1% acceptance threshold.

**Pass/Fail:** Pass

**Frame3DD coverage:** direct

### VAL-06-003

**Test ID:** VAL-06-003

**Description:** A propped cantilever support reaction matches the force method

**Model:** Single 5 m Euler beam.

**Supports / releases / springs / offsets:** Node a fixed; node b vertical roller with unused planar DOFs restrained.

**Loads:** Uniform local-y load w=-8,000 N/m.

**Reference method:** closed-form hand calc

**Reference value(s):**

- roller reaction: 15000 N
- fixed reaction: 25000 N
- fixed moment magnitude: 25000 N*m

**Library output:**

- roller reaction: 15000 N
- fixed reaction: 25000 N
- fixed moment magnitude: 25000 N*m

**Error (%):** maximum 3.637978807092e-14

**Tolerance used and why:** 0.1%. Closed-form and exact algebraic references permit a 0.1% acceptance threshold.

**Pass/Fail:** Pass

**Frame3DD coverage:** direct

### VAL-07-001

**Test ID:** VAL-07-001

**Description:** A two-node tip spring in series adds P/k to cantilever deflection

**Model:** 4 m Euler cantilever joined at its tip to a load node by a translational y spring k=2.4 MN/m.

**Supports / releases / springs / offsets:** Cantilever base fixed; load node is connected only through the y spring.

**Loads:** Load-node force Fy=-18,000 N.

**Reference method:** closed-form hand calc

**Reference value(s):**

- load-node ty: -0.0395 m
- spring force magnitude: 18000 N

**Library output:**

- load-node ty: -0.0395 m
- spring force magnitude: 18000 N

**Error (%):** maximum 0

**Tolerance used and why:** 0.1%. Closed-form and exact algebraic references permit a 0.1% acceptance threshold.

**Pass/Fail:** Pass

**Frame3DD coverage:** unsupported

**Notes:** The prompt's additive beam-plus-spring formula is physically a series model; the case is constructed that way.

### VAL-07-002

**Test ID:** VAL-07-002

**Description:** A base rotational spring matches the exact semi-rigid cantilever flexibility

**Model:** 3 m Euler member with grounded base rz spring kθ=18 MN·m/rad.

**Supports / releases / springs / offsets:** Base translations, rx, and ry fixed; base rz restrained only by spring.

**Loads:** Tip force Fy=-12,000 N.

**Reference method:** closed-form hand calc

**Reference value(s):**

- base rotation: -0.002 rad
- tip deflection: -0.015 m

**Library output:**

- base rotation: -0.002 rad
- tip deflection: -0.015 m

**Error (%):** maximum 4.625929269271e-14

**Tolerance used and why:** 0.1%. Closed-form and exact algebraic references permit a 0.1% acceptance threshold.

**Pass/Fail:** Pass

**Frame3DD coverage:** unsupported

### VAL-07-003

**Test ID:** VAL-07-003

**Description:** Two unequal tip springs split reaction in direct proportion to stiffness

**Model:** 4 m cantilever with two grounded y springs k1=1.5 MN/m and k2=4.5 MN/m at the tip.

**Supports / releases / springs / offsets:** Base fixed; both springs act in parallel at the tip.

**Loads:** Tip force Fy=-30,000 N.

**Reference method:** closed-form hand calc

**Reference value(s):**

- tip deflection: -0.00457142857143 m
- spring k1 force: 6857.14285714 N
- spring k2 force: 20571.4285714 N
- reaction ratio k2/k1: 3 1

**Library output:**

- tip deflection: -0.00457142857143 m
- spring k1 force: 6857.14285714 N
- spring k2 force: 20571.4285714 N
- reaction ratio k2/k1: 3 1

**Error (%):** maximum 0

**Tolerance used and why:** 0.1%. Closed-form and exact algebraic references permit a 0.1% acceptance threshold.

**Pass/Fail:** Pass

**Frame3DD coverage:** unsupported

### VAL-07-004

**Test ID:** VAL-07-004

**Description:** Rotational spring limits converge to free-rotation and fixed-rotation end conditions

**Model:** 3.5 m fixed-base Euler beam with a grounded rz spring at the loaded tip.

**Supports / releases / springs / offsets:** Base fixed; tip translation free; tip rotation controlled by kθ.

**Loads:** Tip force Fy=-10,000 N.

**Reference method:** closed-form hand calc

**Reference value(s):**

- k→0 tip deflection: -0.0119097222222 m
- k→∞ tip deflection: -0.00297743055556 m

**Library output:**

- k→0 tip deflection: -0.0119097222213 m
- k→∞ tip deflection: -0.00297743055645 m

**Error (%):** maximum 2.999999665597e-8

**Tolerance used and why:** 0.1%. Closed-form and exact algebraic references permit a 0.1% acceptance threshold.

**Pass/Fail:** Pass

**Frame3DD coverage:** unsupported

### VAL-07-005

**Test ID:** VAL-07-005

**Description:** A spring remains active when a different DOF at the same node is hard-restrained

**Model:** Single grounded node with tx spring k=900 kN/m.

**Supports / releases / springs / offsets:** Node ty is hard-restrained; tx is spring-supported.

**Loads:** Fx=9,000 N and Fy=3,000 N.

**Reference method:** closed-form hand calc

**Reference value(s):**

- spring displacement: 0.01 m
- hard-restrained displacement: 0 m
- hard-restrained reaction: -3000 N

**Library output:**

- spring displacement: 0.01 m
- hard-restrained displacement: 0 m
- hard-restrained reaction: -3000 N

**Error (%):** maximum 0

**Tolerance used and why:** 0.1%. Closed-form and exact algebraic references permit a 0.1% acceptance threshold.

**Pass/Fail:** Pass

**Frame3DD coverage:** unsupported

### VAL-08-001

**Test ID:** VAL-08-001

**Description:** A single end Mz release produces the exact fixed-pinned UDL response

**Model:** 5 m Euler beam, end-b rz released.

**Supports / releases / springs / offsets:** Both reference nodes fixed in all DOFs.

**Loads:** Uniform local-y load w=-8,000 N/m.

**Reference method:** closed-form hand calc

**Reference value(s):**

- released Mz: 0 N*m
- fixed-end Mz magnitude: 25000 N*m
- released-end reaction: 15000 N

**Library output:**

- released Mz: 3.637978807092e-12 N*m
- fixed-end Mz magnitude: 25000 N*m
- released-end reaction: 15000 N

**Error (%):** maximum 4.850638409456e-14

**Tolerance used and why:** 0.1%. Closed-form and exact algebraic references permit a 0.1% acceptance threshold.

**Pass/Fail:** Pass

**Frame3DD coverage:** direct

### VAL-08-002

**Test ID:** VAL-08-002

**Description:** A single end My release is independent of the Mz implementation

**Model:** 5 m Euler beam, end-b ry released, Iyy differs from Izz.

**Supports / releases / springs / offsets:** Both nodes fixed in all DOFs.

**Loads:** Uniform local-z load w=6,000 N/m.

**Reference method:** closed-form hand calc

**Reference value(s):**

- released My: 0 N*m
- fixed-end My magnitude: 18750 N*m
- released-end reaction magnitude: 11250 N

**Library output:**

- released My: -3.637978807092e-12 N*m
- fixed-end My magnitude: 18750 N*m
- released-end reaction magnitude: 11250 N

**Error (%):** maximum 6.467517879274e-14

**Tolerance used and why:** 0.1%. Closed-form and exact algebraic references permit a 0.1% acceptance threshold.

**Pass/Fail:** Pass

**Frame3DD coverage:** direct

### VAL-08-003

**Test ID:** VAL-08-003

**Description:** Both-end release in one bending plane leaves the orthogonal plane fixed-fixed

**Model:** 4 m Euler beam with rz released at both ends and no ry releases.

**Supports / releases / springs / offsets:** Both nodes fixed in all DOFs.

**Loads:** Simultaneous uniform local-y and local-z loads, each -5,000 N/m.

**Reference method:** closed-form hand calc

**Reference value(s):**

- start released Mz: 0 N*m
- end released Mz: 0 N*m
- start fixed My magnitude: 6666.66666667 N*m
- end fixed My magnitude: 6666.66666667 N*m

**Library output:**

- start released Mz: -9.094947017729e-13 N*m
- end released Mz: 0 N*m
- start fixed My magnitude: 6666.66666667 N*m
- end fixed My magnitude: 6666.66666667 N*m

**Error (%):** maximum 1.364242052659e-14

**Tolerance used and why:** 0.1%. Closed-form and exact algebraic references permit a 0.1% acceptance threshold.

**Pass/Fail:** Pass

**Frame3DD coverage:** direct

### VAL-08-004

**Test ID:** VAL-08-004

**Description:** A torsional release transfers all interior torque to the retained end

**Model:** 4 m Euler beam with end-b rx released.

**Supports / releases / springs / offsets:** Both nodes fixed in all DOFs.

**Loads:** Interior local-x point moment T=7,500 N·m at midspan.

**Reference method:** closed-form hand calc

**Reference value(s):**

- released end torsion: 0 N*m
- retained end torsion magnitude: 7500 N*m

**Library output:**

- released end torsion: -9.094947017729e-13 N*m
- retained end torsion magnitude: 7500 N*m

**Error (%):** maximum 1.212659602364e-14

**Tolerance used and why:** 0.1%. Closed-form and exact algebraic references permit a 0.1% acceptance threshold.

**Pass/Fail:** Pass

**Frame3DD coverage:** direct

### VAL-08-005

**Test ID:** VAL-08-005

**Description:** Multiple bending releases plus a torsional end release preserve exact two-force axial behavior

**Model:** 3 m member with ry and rz released at both ends and rx released at end b; releasing rx at both ends is separately classified as a local mechanism.

**Supports / releases / springs / offsets:** Start translations fixed; end transverse translations fixed; rotations hard-restrained only to remove inactive rigid modes.

**Loads:** End axial force Fx=36,000 N.

**Reference method:** closed-form hand calc

**Reference value(s):**

- axial displacement: 0.000027 m
- axial force magnitude: 36000 N
- maximum released action: 0 N*m

**Library output:**

- axial displacement: 0.000027 m
- axial force magnitude: 36000 N
- maximum released action: 0 N*m

**Error (%):** maximum 2.509727251124e-14

**Tolerance used and why:** 0.1%. Closed-form and exact algebraic references permit a 0.1% acceptance threshold.

**Pass/Fail:** Pass

**Frame3DD coverage:** direct

### VAL-08-006

**Test ID:** VAL-08-006

**Description:** A released end under UDL condenses fixed-end forces before global assembly

**Model:** 6 m Euler beam with end-b rz released.

**Supports / releases / springs / offsets:** Both nodes fixed in all DOFs.

**Loads:** Uniform local-y load w=-4,000 N/m.

**Reference method:** closed-form hand calc

**Reference value(s):**

- released end moment: 0 N*m
- left reaction: 15000 N
- right reaction: 9000 N

**Library output:**

- released end moment: -1.818989403546e-12 N*m
- left reaction: 15000 N
- right reaction: 9000 N

**Error (%):** maximum 4.042198674546e-14

**Tolerance used and why:** 0.1%. Closed-form and exact algebraic references permit a 0.1% acceptance threshold.

**Pass/Fail:** Pass

**Frame3DD coverage:** direct

### VAL-08-007

**Test ID:** VAL-08-007

**Description:** A release pattern that creates a local mechanism is rejected

**Model:** Single member with rz released at both ends and no alternative in-plane load path.

**Supports / releases / springs / offsets:** Start reference node fixed; end node otherwise free.

**Loads:** Tip force Fy=-1,000 N.

**Reference method:** self-consistency check

**Reference value(s):**

- mechanism detected: 1 boolean

**Library output:**

- mechanism detected: 1 boolean

**Error (%):** maximum 0

**Tolerance used and why:** 0.1%. Closed-form and exact algebraic references permit a 0.1% acceptance threshold.

**Pass/Fail:** Pass

**Frame3DD coverage:** overlap-indirect

### VAL-09-001

**Test ID:** VAL-09-001

**Description:** Nodal forces and moments in all six global DOFs match independent cantilever formulas

**Model:** 3 m global-x Euler cantilever with unequal bending inertias.

**Supports / releases / springs / offsets:** Base fixed; tip free.

**Loads:** Six separate load cases: unit-scaled Fx, Fy, Fz, Mx, My, and Mz.

**Reference method:** closed-form hand calc

**Reference value(s):**

- Fx: 7.500000000000e-6 m
- Fy: -0.009 m
- Fz: 0.021 m
- Mx: 0.015 rad
- My: 0.0035 rad
- Mz: -0.002 rad

**Library output:**

- Fx: 7.500000000000e-6 m
- Fy: -0.009 m
- Fz: 0.021 m
- Mx: 0.015 rad
- My: 0.0035 rad
- Mz: -0.002 rad

**Error (%):** maximum 4.956352788505e-14

**Tolerance used and why:** 0.1%. Closed-form and exact algebraic references permit a 0.1% acceptance threshold.

**Pass/Fail:** Pass

**Frame3DD coverage:** direct

### VAL-09-002

**Test ID:** VAL-09-002

**Description:** Interior point force at quarter-span matches cantilever closed form

**Model:** 6 m Euler cantilever.

**Supports / releases / springs / offsets:** Base fixed; tip free.

**Loads:** Local-y point force P=-15,000 N at x/L=0.25.

**Reference method:** closed-form hand calc

**Reference value(s):**

- tip deflection: -0.007734375 m
- tip rotation: -0.00140625 rad

**Library output:**

- tip deflection: -0.007734375 m
- tip rotation: -0.00140625 rad

**Error (%):** maximum 1.079383496163e-13

**Tolerance used and why:** 0.1%. Closed-form and exact algebraic references permit a 0.1% acceptance threshold.

**Pass/Fail:** Pass

**Frame3DD coverage:** overlap-indirect

**Notes:** Frame3DD point-load outputs are retained separately because two interpolation defects were observed in the supplied binary.

### VAL-09-003

**Test ID:** VAL-09-003

**Description:** Interior point force at one-third-span matches cantilever closed form

**Model:** 6 m Euler cantilever.

**Supports / releases / springs / offsets:** Base fixed; tip free.

**Loads:** Local-y point force P=-15,000 N at x/L=0.3333333333333333.

**Reference method:** closed-form hand calc

**Reference value(s):**

- tip deflection: -0.0133333333333 m
- tip rotation: -0.0025 rad

**Library output:**

- tip deflection: -0.0133333333333 m
- tip rotation: -0.0025 rad

**Error (%):** maximum 1.040834085586e-13

**Tolerance used and why:** 0.1%. Closed-form and exact algebraic references permit a 0.1% acceptance threshold.

**Pass/Fail:** Pass

**Frame3DD coverage:** overlap-indirect

**Notes:** Frame3DD point-load outputs are retained separately because two interpolation defects were observed in the supplied binary.

### VAL-09-004

**Test ID:** VAL-09-004

**Description:** An interior point moment creates the exact bending-moment jump

**Model:** 5 m Euler cantilever.

**Supports / releases / springs / offsets:** Base fixed; tip free.

**Loads:** Local-z point moment M=18,000 N·m at x=2 m.

**Reference method:** closed-form hand calc

**Reference value(s):**

- moment jump magnitude: 18000 N*m
- base moment magnitude: 18000 N*m

**Library output:**

- moment jump magnitude: 18000 N*m
- base moment magnitude: 18000 N*m

**Error (%):** maximum 4.042198674546e-14

**Tolerance used and why:** 0.1%. Closed-form and exact algebraic references permit a 0.1% acceptance threshold.

**Pass/Fail:** Pass

**Frame3DD coverage:** overlap-indirect

### VAL-09-005

**Test ID:** VAL-09-005

**Description:** Global-direction UDL on an inclined member equals its transformed local-direction model

**Model:** Inclined 4.5 m Euler cantilever from [0,0,0] to [3,2,2.6926].

**Supports / releases / springs / offsets:** Base fixed; tip free.

**Loads:** Equivalent uniform load vectors represented once globally and once locally.

**Reference method:** equivalent-model cross-check

**Reference value(s):**

- tip tx: 0.00431693200758 m
- tip ty: -0.00198382763081 m
- tip tz: -0.00312701660644 m
- tip rx: -0.0000348813904504 rad
- tip ry: 0.00136661916853 rad
- tip rz: -0.000915159021654 rad

**Library output:**

- tip tx: 0.00431693200758 m
- tip ty: -0.00198382763081 m
- tip tz: -0.00312701660644 m
- tip rx: -0.0000348813904504 rad
- tip ry: 0.00136661916853 rad
- tip rz: -0.000915159021654 rad

**Error (%):** maximum 8.673617379884e-17

**Tolerance used and why:** 0.1%. Closed-form and exact algebraic references permit a 0.1% acceptance threshold.

**Pass/Fail:** Pass

**Frame3DD coverage:** direct

### VAL-09-006

**Test ID:** VAL-09-006

**Description:** Partial trapezoidal load reactions equal independent resultant and centroid integration

**Model:** 7 m Euler cantilever; load acts from x=1.2 m to x=5.8 m.

**Supports / releases / springs / offsets:** Base fixed; tip free.

**Loads:** Local-y intensity varies linearly from -3,000 to -11,000 N/m.

**Reference method:** closed-form hand calc

**Reference value(s):**

- base shear: 32200 N
- base moment: 126806.666667 N*m

**Library output:**

- base shear: 32200 N
- base moment: 126806.666667 N*m

**Error (%):** maximum 5.649035414739e-14

**Tolerance used and why:** 0.1%. Closed-form and exact algebraic references permit a 0.1% acceptance threshold.

**Pass/Fail:** Pass

**Frame3DD coverage:** direct

### VAL-09-007

**Test ID:** VAL-09-007

**Description:** Self-weight on horizontal and inclined members balances exact mass times gravity

**Model:** Two independent 3 m frames with identical A and density; one horizontal, one inclined.

**Supports / releases / springs / offsets:** Both frame starts fixed.

**Loads:** Global gravity vector [1.2,-9.81,2.4] m/s² applied as self-weight.

**Reference method:** closed-form hand calc

**Reference value(s):**

- horizontal Rx: -565.2 N
- horizontal Ry: 4620.51 N
- horizontal Rz: -1130.4 N
- inclined Rx: -565.2 N
- inclined Ry: 4620.51 N
- inclined Rz: -1130.4 N

**Library output:**

- horizontal Rx: -565.2 N
- horizontal Ry: 4620.51 N
- horizontal Rz: -1130.4 N
- inclined Rx: -565.2 N
- inclined Ry: 4620.51 N
- inclined Rz: -1130.4 N

**Error (%):** maximum 7.844633176120e-12

**Tolerance used and why:** 0.1%. Closed-form and exact algebraic references permit a 0.1% acceptance threshold.

**Pass/Fail:** Pass

**Frame3DD coverage:** direct

### VAL-09-008

**Test ID:** VAL-09-008

**Description:** A combined load case is exact superposition of separately solved cases

**Model:** 4 m Euler cantilever with three compatible load cases.

**Supports / releases / springs / offsets:** Base fixed; tip free.

**Loads:** Case A tip force, case B UDL, case AB contains both.

**Reference method:** self-consistency check

**Reference value(s):**

- tip ty: -0.0231111111111 m
- base Mz: 56000 N*m
- full displacement max difference: 0 m

**Library output:**

- tip ty: -0.0231111111111 m
- base Mz: 56000 N*m
- full displacement max difference: 0 m

**Error (%):** maximum 1.299278145390e-14

**Tolerance used and why:** 0.1%. Closed-form and exact algebraic references permit a 0.1% acceptance threshold.

**Pass/Fail:** Pass

**Frame3DD coverage:** direct

### VAL-10-001

**Test ID:** VAL-10-001

**Description:** Single-bay portal frame matches Frame3DD displacements, reactions, and member end forces

**Model:** Four-node 3D portal in N-mm units with two columns and one beam.

**Supports / releases / springs / offsets:** Both column bases fixed.

**Loads:** Combined lateral, vertical, and out-of-plane nodal forces at both beam-column joints.

**Reference method:** commercial software

**Reference value(s):**

- node 1 displacement tx: 0 mm
- node 1 reaction tx: -10000 N
- node 1 displacement ty: 0 mm
- node 1 reaction ty: 550.795 N
- node 1 displacement tz: 0 mm
- node 1 reaction tz: -2465.753 N
- node 1 displacement rx: 0 rad
- node 1 reaction rx: -7.286851755000e+6 N*mm
- node 1 displacement ry: 0 rad
- node 1 reaction ry: -85617.828 N*mm
- node 1 displacement rz: 0 rad
- node 1 reaction rz: 1.887698772300e+7 N*mm
- node 2 displacement tx: 12.681411 mm
- node 2 reaction tx: 0 N
- node 2 displacement ty: -0.004371 mm
- node 2 reaction ty: 0 N
- node 2 displacement tz: 11.478807 mm
- node 2 reaction tz: 0 N
- node 2 displacement rx: 0.005696 rad
- node 2 reaction rx: 0 N*mm
- node 2 displacement ry: 0.004543 rad
- node 2 reaction ry: 0 N*mm
- node 2 displacement rz: -0.003692 rad
- node 2 reaction rz: 0 N*mm
- node 3 displacement tx: 12.681411 mm
- node 3 reaction tx: 0 N
- node 3 displacement ty: -0.074994 mm
- node 3 reaction ty: 0 N
- node 3 displacement tz: -11.478807 mm
- node 3 reaction tz: 0 N
- node 3 displacement rx: -0.005696 rad
- node 3 reaction rx: 0 N*mm
- node 3 displacement ry: 0.004543 rad
- node 3 reaction ry: 0 N*mm
- node 3 displacement rz: -0.003692 rad
- node 3 reaction rz: 0 N*mm
- node 4 displacement tx: 0 mm
- node 4 reaction tx: -10000 N
- node 4 displacement ty: 0 mm
- node 4 reaction ty: 9449.205 N
- node 4 displacement tz: 0 mm
- node 4 reaction tz: 2465.753 N
- node 4 displacement rx: 0 rad
- node 4 reaction rx: 7.286851755000e+6 N*mm
- node 4 displacement ry: 0 rad
- node 4 reaction ry: -85617.828 N*mm
- node 4 displacement rz: 0 rad
- node 4 reaction rz: 1.887698772300e+7 N*mm
- frame 1 force 0: 550.795 N
- frame 1 force 1: 10000 N
- frame 1 force 2: -2465.753 N
- frame 1 force 3: -85617.828 N*mm
- frame 1 force 4: 7.286851755000e+6 N*mm
- frame 1 force 5: 1.887698772300e+7 N*mm
- frame 1 force 6: -550.795 N
- frame 1 force 7: -10000 N
- frame 1 force 8: 2465.753 N
- frame 1 force 9: 85617.828 N*mm
- frame 1 force 10: 110406.851 N*mm
- frame 1 force 11: 1.112301227700e+7 N*mm
- frame 2 force 0: 0 N
- frame 2 force 1: -4449.205 N
- frame 2 force 2: 34.247 N
- frame 2 force 3: 110406.851 N*mm
- frame 2 force 4: -85617.828 N*mm
- frame 2 force 5: -1.112301227700e+7 N*mm
- frame 2 force 6: 0 N
- frame 2 force 7: 4449.205 N
- frame 2 force 8: -34.247 N
- frame 2 force 9: -110406.851 N*mm
- frame 2 force 10: -85617.828 N*mm
- frame 2 force 11: -1.112301227700e+7 N*mm
- frame 3 force 0: 9449.205 N
- frame 3 force 1: 10000 N
- frame 3 force 2: 2465.753 N
- frame 3 force 3: -85617.828 N*mm
- frame 3 force 4: -7.286851755000e+6 N*mm
- frame 3 force 5: 1.887698772300e+7 N*mm
- frame 3 force 6: -9449.205 N
- frame 3 force 7: -10000 N
- frame 3 force 8: -2465.753 N
- frame 3 force 9: 85617.828 N*mm
- frame 3 force 10: -110406.851 N*mm
- frame 3 force 11: 1.112301227700e+7 N*mm

**Library output:**

- node 1 displacement tx: 0 mm
- node 1 reaction tx: -10000 N
- node 1 displacement ty: 0 mm
- node 1 reaction ty: 550.795089396 N
- node 1 displacement tz: 0 mm
- node 1 reaction tz: -2465.75287042 N
- node 1 displacement rx: 0 rad
- node 1 reaction rx: -7.286851766323e+6 N*mm
- node 1 displacement ry: 0 rad
- node 1 reaction ry: -85617.8239441 N*mm
- node 1 displacement rz: 0 rad
- node 1 reaction rz: 1.887698772349e+7 N*mm
- node 2 displacement tx: 12.6814110336 mm
- node 2 reaction tx: -1.164153218269e-10 N
- node 2 displacement ty: -0.00437138959838 mm
- node 2 reaction ty: 0 N
- node 2 displacement tz: 11.478806895 mm
- node 2 reaction tz: -2.728484105319e-12 N
- node 2 displacement rx: 0.00569559120744 rad
- node 2 reaction rx: 2.502929419279e-9 N*mm
- node 2 displacement ry: 0.00454298657663 rad
- node 2 reaction ry: 0 N*mm
- node 2 displacement rz: -0.00369236926047 rad
- node 2 reaction rz: 1.396983861923e-9 N*mm
- node 3 displacement tx: 12.6814110336 mm
- node 3 reaction tx: -6.730260793120e-11 N
- node 3 displacement ty: -0.0749936897667 mm
- node 3 reaction ty: -1.818989403546e-12 N
- node 3 displacement tz: -11.478806895 mm
- node 3 reaction tz: -9.094947017729e-13 N
- node 3 displacement rx: -0.00569559120744 rad
- node 3 reaction rx: 0 N*mm
- node 3 displacement ry: 0.00454298657663 rad
- node 3 reaction ry: -9.313225746155e-10 N*mm
- node 3 displacement rz: -0.00369236926047 rad
- node 3 reaction rz: 7.450580596924e-9 N*mm
- node 4 displacement tx: 0 mm
- node 4 reaction tx: -10000 N
- node 4 displacement ty: 0 mm
- node 4 reaction ty: 9449.2049106 N
- node 4 displacement tz: 0 mm
- node 4 reaction tz: 2465.75287042 N
- node 4 displacement rx: 0 rad
- node 4 reaction rx: 7.286851766323e+6 N*mm
- node 4 displacement ry: 0 rad
- node 4 reaction ry: -85617.8239441 N*mm
- node 4 displacement rz: 0 rad
- node 4 reaction rz: 1.887698772349e+7 N*mm
- frame 1 force 0: 550.795089396 N
- frame 1 force 1: 10000 N
- frame 1 force 2: -2465.75287042 N
- frame 1 force 3: -85617.8239441 N*mm
- frame 1 force 4: 7.286851766323e+6 N*mm
- frame 1 force 5: 1.887698772349e+7 N*mm
- frame 1 force 6: -550.795089396 N
- frame 1 force 7: -10000 N
- frame 1 force 8: 2465.75287042 N
- frame 1 force 9: 85617.8239441 N*mm
- frame 1 force 10: 110406.844944 N*mm
- frame 1 force 11: 1.112301227651e+7 N*mm
- frame 2 force 0: 0 N
- frame 2 force 1: -4449.2049106 N
- frame 2 force 2: 34.2471295776 N
- frame 2 force 3: 110406.844944 N*mm
- frame 2 force 4: -85617.8239441 N*mm
- frame 2 force 5: -1.112301227651e+7 N*mm
- frame 2 force 6: 0 N
- frame 2 force 7: 4449.2049106 N
- frame 2 force 8: -34.2471295776 N
- frame 2 force 9: -110406.844944 N*mm
- frame 2 force 10: -85617.8239441 N*mm
- frame 2 force 11: -1.112301227651e+7 N*mm
- frame 3 force 0: 9449.2049106 N
- frame 3 force 1: 10000 N
- frame 3 force 2: 2465.75287042 N
- frame 3 force 3: -85617.8239441 N*mm
- frame 3 force 4: -7.286851766323e+6 N*mm
- frame 3 force 5: 1.887698772349e+7 N*mm
- frame 3 force 6: -9449.2049106 N
- frame 3 force 7: -10000 N
- frame 3 force 8: -2465.75287042 N
- frame 3 force 9: 85617.8239441 N*mm
- frame 3 force 10: -110406.844944 N*mm
- frame 3 force 11: 1.112301227651e+7 N*mm

**Error (%):** maximum 0.000378362026933

**Tolerance used and why:** 0.01%. Frame3DD text output is printed to about six significant decimal digits; 0.01% remains tighter than the requested commercial-software range.

**Pass/Fail:** Pass

**Frame3DD coverage:** direct

### VAL-10-002

**Test ID:** VAL-10-002

**Description:** A three-dimensional L-frame is covariant under rigid global rotation

**Model:** Two non-collinear 3D Euler members with unequal bending inertias.

**Supports / releases / springs / offsets:** One end fixed.

**Loads:** General three-component force and moment at the free node.

**Reference method:** self-consistency check

**Reference value(s):**

- rotated translation 0: 0.169495465809 m
- rotated translation 1: 0.0168794843572 m
- rotated translation 2: 0.239956349679 m
- rotated rotation 0: 0.00026587148895 rad
- rotated rotation 1: 0.0797768701514 rad
- rotated rotation 2: -0.00625208103947 rad
- local force ab[0]: -4200 N
- local force ab[1]: 7300 N
- local force ab[2]: -5100 N
- local force ab[3]: -30800 N*m
- local force ab[4]: 13200 N*m
- local force ab[5]: 40200 N*m
- local force ab[6]: 4200 N
- local force ab[7]: -7300 N
- local force ab[8]: 5100 N
- local force ab[9]: 30800 N*m
- local force ab[10]: 7200 N*m
- local force ab[11]: -11000 N*m
- local force bc[0]: 3244.99614793 N
- local force bc[1]: -8292.76793356 N
- local force bc[2]: -4200 N
- local force bc[3]: 110.940039245 N*m
- local force bc[4]: 13146.3946505 N*m
- local force bc[5]: -30800 N*m
- local force bc[6]: -3244.99614793 N
- local force bc[7]: 8292.76793356 N
- local force bc[8]: 4200 N
- local force bc[9]: -110.940039245 N*m
- local force bc[10]: 1996.92070641 N*m
- local force bc[11]: 900 N*m

**Library output:**

- rotated translation 0: 0.169495465809 m
- rotated translation 1: 0.0168794843572 m
- rotated translation 2: 0.239956349679 m
- rotated rotation 0: 0.00026587148895 rad
- rotated rotation 1: 0.0797768701514 rad
- rotated rotation 2: -0.00625208103947 rad
- local force ab[0]: -4200 N
- local force ab[1]: 7300 N
- local force ab[2]: -5100 N
- local force ab[3]: -30800 N*m
- local force ab[4]: 13200 N*m
- local force ab[5]: 40200 N*m
- local force ab[6]: 4200 N
- local force ab[7]: -7300 N
- local force ab[8]: 5100 N
- local force ab[9]: 30800 N*m
- local force ab[10]: 7200 N*m
- local force ab[11]: -11000 N*m
- local force bc[0]: 3244.99614793 N
- local force bc[1]: -8292.76793356 N
- local force bc[2]: -4200 N
- local force bc[3]: 110.940039245 N*m
- local force bc[4]: 13146.3946505 N*m
- local force bc[5]: -30800 N*m
- local force bc[6]: -3244.99614793 N
- local force bc[7]: 8292.76793356 N
- local force bc[8]: 4200 N
- local force bc[9]: -110.940039245 N*m
- local force bc[10]: 1996.92070641 N*m
- local force bc[11]: 900 N*m

**Error (%):** maximum 0

**Tolerance used and why:** 0.1%. Closed-form and exact algebraic references permit a 0.1% acceptance threshold.

**Pass/Fail:** Pass

**Frame3DD coverage:** overlap-indirect

### VAL-10-003

**Test ID:** VAL-10-003

**Description:** A regular tetrahedral space truss matches method-of-joints symmetry

**Model:** Six pinned truss bars forming a regular tetrahedron, side length 4 m.

**Supports / releases / springs / offsets:** All three base nodes fixed in translation.

**Loads:** 30 kN downward at the apex.

**Reference method:** closed-form hand calc

**Reference value(s):**

- apex vertical displacement: -0.000047619047619 m
- ad axial force: -12247.4487139 N
- bd axial force: -12247.4487139 N
- cd axial force: -12247.4487139 N
- ab zero force: 0 N
- bc zero force: 0 N
- ca zero force: 0 N

**Library output:**

- apex vertical displacement: -0.000047619047619 m
- ad axial force: -12247.4487139 N
- bd axial force: -12247.4487139 N
- cd axial force: -12247.4487139 N
- ab zero force: 0 N
- bc zero force: 0 N
- ca zero force: 0 N

**Error (%):** maximum 1.485198628739e-14

**Tolerance used and why:** 0.1%. Closed-form and exact algebraic references permit a 0.1% acceptance threshold.

**Pass/Fail:** Pass

**Frame3DD coverage:** direct

### VAL-10-004

**Test ID:** VAL-10-004

**Description:** Orthogonal floor grid matches the symmetric fixed-guided closed form

**Model:** Four identical orthogonal Euler beams meeting at one center node.

**Supports / releases / springs / offsets:** All four outer ends fixed.

**Loads:** 24 kN vertical point load at the grid center.

**Reference method:** closed-form hand calc

**Reference value(s):**

- center vertical displacement: -0.000918367346939 m
- xp vertical reaction: 6000 N
- xm vertical reaction: 6000 N
- yp vertical reaction: 6000 N
- ym vertical reaction: 6000 N

**Library output:**

- center vertical displacement: -0.000918367346939 m
- xp vertical reaction: 6000 N
- xm vertical reaction: 6000 N
- yp vertical reaction: 6000 N
- ym vertical reaction: 6000 N

**Error (%):** maximum 1.515824502955e-14

**Tolerance used and why:** 0.1%. Closed-form and exact algebraic references permit a 0.1% acceptance threshold.

**Pass/Fail:** Pass

**Frame3DD coverage:** overlap-indirect

### VAL-10-005

**Test ID:** VAL-10-005

**Description:** Two-story two-bay frame matches independent Frame3DD output

**Model:** Nine-node, ten-member two-story/two-bay Euler frame in N-mm units.

**Supports / releases / springs / offsets:** Three fixed column bases.

**Loads:** Combined gravity, lateral, and antisymmetric out-of-plane top-story nodal forces.

**Reference method:** commercial software

**Reference value(s):**

- node 1 displacement tx: 0 mm
- node 1 reaction tx: -9027.512 N
- node 1 displacement ty: 0 mm
- node 1 reaction ty: 5206.171 N
- node 1 displacement tz: 0 mm
- node 1 reaction tz: -980.84 N
- node 1 displacement rx: 0 rad
- node 1 reaction rx: -5.656620160000e+6 N*mm
- node 1 displacement ry: 0 rad
- node 1 reaction ry: -51336.497 N*mm
- node 1 displacement rz: 0 rad
- node 1 reaction rz: 1.957309419400e+7 N*mm
- node 2 displacement tx: 0 mm
- node 2 reaction tx: -11944.975 N
- node 2 displacement ty: 0 mm
- node 2 reaction ty: 20000 N
- node 2 displacement tz: 0 mm
- node 2 reaction tz: 0 N
- node 2 displacement rx: 0 rad
- node 2 reaction rx: 0 N*mm
- node 2 displacement ry: 0 rad
- node 2 reaction ry: -50605.592 N*mm
- node 2 displacement rz: 0 rad
- node 2 reaction rz: 2.250317694300e+7 N*mm
- node 3 displacement tx: 0 mm
- node 3 reaction tx: -9027.512 N
- node 3 displacement ty: 0 mm
- node 3 reaction ty: 34793.829 N
- node 3 displacement tz: 0 mm
- node 3 reaction tz: 980.84 N
- node 3 displacement rx: 0 rad
- node 3 reaction rx: 5.656620160000e+6 N*mm
- node 3 displacement ry: 0 rad
- node 3 reaction ry: -51336.497 N*mm
- node 3 displacement rz: 0 rad
- node 3 reaction rz: 1.957309419400e+7 N*mm
- node 4 displacement tx: 10.271671 mm
- node 4 reaction tx: 0 N
- node 4 displacement ty: -0.033806 mm
- node 4 reaction ty: 0 N
- node 4 displacement tz: 8.349607 mm
- node 4 reaction tz: 0 N
- node 4 displacement rx: 0.004983 rad
- node 4 reaction rx: 0 N*mm
- node 4 displacement ry: 0.002119 rad
- node 4 reaction ry: 0 N*mm
- node 4 displacement rz: -0.003917 rad
- node 4 reaction rz: 0 N*mm
- node 5 displacement tx: 10.283963 mm
- node 5 reaction tx: 0 N
- node 5 displacement ty: -0.12987 mm
- node 5 reaction ty: 0 N
- node 5 displacement tz: 0 mm
- node 5 reaction tz: 0 N
- node 5 displacement rx: 0 rad
- node 5 reaction rx: 0 N*mm
- node 5 displacement ry: 0.002088 rad
- node 5 reaction ry: 0 N*mm
- node 5 displacement rz: -0.002978 rad
- node 5 reaction rz: 0 N*mm
- node 6 displacement tx: 10.271671 mm
- node 6 reaction tx: 0 N
- node 6 displacement ty: -0.225934 mm
- node 6 reaction ty: 0 N
- node 6 displacement tz: -8.349607 mm
- node 6 reaction tz: 0 N
- node 6 displacement rx: -0.004983 rad
- node 6 reaction rx: 0 N*mm
- node 6 displacement ry: 0.002119 rad
- node 6 reaction ry: 0 N*mm
- node 6 displacement rz: -0.003917 rad
- node 6 reaction rz: 0 N*mm
- node 7 displacement tx: 24.556406 mm
- node 7 reaction tx: 0 N
- node 7 displacement ty: -0.123629 mm
- node 7 reaction ty: 0 N
- node 7 displacement tz: 26.556834 mm
- node 7 reaction tz: 0 N
- node 7 displacement rx: 0.006585 rad
- node 7 reaction rx: 0 N*mm
- node 7 displacement ry: 0.006579 rad
- node 7 reaction ry: 0 N*mm
- node 7 displacement rz: -0.003032 rad
- node 7 reaction rz: 0 N*mm
- node 8 displacement tx: 24.533217 mm
- node 8 reaction tx: 0 N
- node 8 displacement ty: -0.25974 mm
- node 8 reaction ty: 0 N
- node 8 displacement tz: 0 mm
- node 8 reaction tz: 0 N
- node 8 displacement rx: 0 rad
- node 8 reaction rx: 0 N*mm
- node 8 displacement ry: 0.006638 rad
- node 8 reaction ry: 0 N*mm
- node 8 displacement rz: -0.001931 rad
- node 8 reaction rz: 0 N*mm
- node 9 displacement tx: 24.556406 mm
- node 9 reaction tx: 0 N
- node 9 displacement ty: -0.395851 mm
- node 9 reaction ty: 0 N
- node 9 displacement tz: -26.556834 mm
- node 9 reaction tz: 0 N
- node 9 displacement rx: -0.006585 rad
- node 9 reaction rx: 0 N*mm
- node 9 displacement ry: 0.006579 rad
- node 9 reaction ry: 0 N*mm
- node 9 displacement rz: -0.003032 rad
- node 9 reaction rz: 0 N*mm
- frame 1 force 0: 5206.171 N
- frame 1 force 1: 9027.512 N
- frame 1 force 2: -980.84 N
- frame 1 force 3: -51336.497 N*mm
- frame 1 force 4: 5.656620160000e+6 N*mm
- frame 1 force 5: 1.957309419400e+7 N*mm
- frame 1 force 6: -5206.171 N
- frame 1 force 7: -9027.512 N
- frame 1 force 8: 980.84 N
- frame 1 force 9: 51336.497 N*mm
- frame 1 force 10: -2.714099629000e+6 N*mm
- frame 1 force 11: 7.509442851000e+6 N*mm
- frame 2 force 0: 20000 N
- frame 2 force 1: 11944.975 N
- frame 2 force 2: 0 N
- frame 2 force 3: -50605.592 N*mm
- frame 2 force 4: 0 N*mm
- frame 2 force 5: 2.250317694300e+7 N*mm
- frame 2 force 6: -20000 N
- frame 2 force 7: -11944.975 N
- frame 2 force 8: 0 N
- frame 2 force 9: 50605.592 N*mm
- frame 2 force 10: 0 N*mm
- frame 2 force 11: 1.333174896700e+7 N*mm
- frame 3 force 0: 34793.829 N
- frame 3 force 1: 9027.512 N
- frame 3 force 2: 980.84 N
- frame 3 force 3: -51336.497 N*mm
- frame 3 force 4: -5.656620160000e+6 N*mm
- frame 3 force 5: 1.957309419400e+7 N*mm
- frame 3 force 6: -34793.829 N
- frame 3 force 7: -9027.512 N
- frame 3 force 8: -980.84 N
- frame 3 force 9: 51336.497 N*mm
- frame 3 force 10: 2.714099629000e+6 N*mm
- frame 3 force 11: 7.509442851000e+6 N*mm
- frame 4 force 0: 13832.728 N
- frame 4 force 1: 7930.451 N
- frame 4 force 2: -959.199 N
- frame 4 force 3: -108079.309 N*mm
- frame 4 force 4: 2.784526362000e+6 N*mm
- frame 4 force 5: 1.053246072500e+7 N*mm
- frame 4 force 6: -13832.728 N
- frame 4 force 7: -7930.451 N
- frame 4 force 8: 959.199 N
- frame 4 force 9: 108079.309 N*mm
- frame 4 force 10: 93071.188 N*mm
- frame 4 force 11: 1.325889157600e+7 N*mm
- frame 5 force 0: 20000 N
- frame 5 force 1: 14139.098 N
- frame 5 force 2: 0 N
- frame 5 force 3: -110247.916 N*mm
- frame 5 force 4: 0 N*mm
- frame 5 force 5: 1.959690542000e+7 N*mm
- frame 5 force 6: -20000 N
- frame 5 force 7: -14139.098 N
- frame 5 force 8: 0 N
- frame 5 force 9: 110247.916 N*mm
- frame 5 force 10: 0 N*mm
- frame 5 force 11: 2.282038997800e+7 N*mm
- frame 6 force 0: 26167.272 N
- frame 6 force 1: 7930.451 N
- frame 6 force 2: 959.199 N
- frame 6 force 3: -108079.309 N*mm
- frame 6 force 4: -2.784526362000e+6 N*mm
- frame 6 force 5: 1.053246072500e+7 N*mm
- frame 6 force 6: -26167.272 N
- frame 6 force 7: -7930.451 N
- frame 6 force 8: -959.199 N
- frame 6 force 9: 108079.309 N*mm
- frame 6 force 10: -93071.188 N*mm
- frame 6 force 11: 1.325889157600e+7 N*mm
- frame 7 force 0: -1097.062 N
- frame 7 force 1: -8626.558 N
- frame 7 force 2: -21.641 N
- frame 7 force 3: 70426.732 N*mm
- frame 7 force 4: 56742.812 N*mm
- frame 7 force 5: -1.804190357600e+7 N*mm
- frame 7 force 6: 1097.062 N
- frame 7 force 7: 8626.558 N
- frame 7 force 8: 21.641 N
- frame 7 force 9: -70426.732 N*mm
- frame 7 force 10: 29821.162 N*mm
- frame 7 force 11: -1.646432719300e+7 N*mm
- frame 8 force 0: 1097.062 N
- frame 8 force 1: -8626.558 N
- frame 8 force 2: -21.641 N
- frame 8 force 3: 70426.732 N*mm
- frame 8 force 4: 29821.162 N*mm
- frame 8 force 5: -1.646432719300e+7 N*mm
- frame 8 force 6: -1097.062 N
- frame 8 force 7: 8626.558 N
- frame 8 force 8: 21.641 N
- frame 8 force 9: -70426.732 N*mm
- frame 8 force 10: 56742.812 N*mm
- frame 8 force 11: -1.804190357600e+7 N*mm
- frame 9 force 0: 2069.549 N
- frame 9 force 1: -6167.272 N
- frame 9 force 2: 40.801 N
- frame 9 force 3: 93071.188 N*mm
- frame 9 force 4: -108079.309 N*mm
- frame 9 force 5: -1.325889157600e+7 N*mm
- frame 9 force 6: -2069.549 N
- frame 9 force 7: 6167.272 N
- frame 9 force 8: -40.801 N
- frame 9 force 9: -93071.188 N*mm
- frame 9 force 10: -55123.958 N*mm
- frame 9 force 11: -1.141019498900e+7 N*mm
- frame 10 force 0: -2069.549 N
- frame 10 force 1: -6167.272 N
- frame 10 force 2: 40.801 N
- frame 10 force 3: 93071.188 N*mm
- frame 10 force 4: -55123.958 N*mm
- frame 10 force 5: -1.141019498900e+7 N*mm
- frame 10 force 6: 2069.549 N
- frame 10 force 7: 6167.272 N
- frame 10 force 8: -40.801 N
- frame 10 force 9: -93071.188 N*mm
- frame 10 force 10: -108079.309 N*mm
- frame 10 force 11: -1.325889157600e+7 N*mm

**Library output:**

- node 1 displacement tx: 0 mm
- node 1 reaction tx: -9027.51234835 N
- node 1 displacement ty: 0 mm
- node 1 reaction ty: 5206.17066643 N
- node 1 displacement tz: 0 mm
- node 1 reaction tz: -980.84017731 N
- node 1 displacement rx: 0 rad
- node 1 reaction rx: -5.656620172262e+6 N*mm
- node 1 displacement ry: 0 rad
- node 1 reaction ry: -51336.495346 N*mm
- node 1 displacement rz: 0 rad
- node 1 reaction rz: 1.957309419437e+7 N*mm
- node 2 displacement tx: 0 mm
- node 2 reaction tx: -11944.9753033 N
- node 2 displacement ty: 0 mm
- node 2 reaction ty: 20000 N
- node 2 displacement tz: 0 mm
- node 2 reaction tz: 8.100691113925e-13 N
- node 2 displacement rx: 0 rad
- node 2 reaction rx: 7.325379527478e-9 N*mm
- node 2 displacement ry: 0 rad
- node 2 reaction ry: -50605.5908241 N*mm
- node 2 displacement rz: 0 rad
- node 2 reaction rz: 2.250317694267e+7 N*mm
- node 3 displacement tx: 0 mm
- node 3 reaction tx: -9027.51234835 N
- node 3 displacement ty: 0 mm
- node 3 reaction ty: 34793.8293336 N
- node 3 displacement tz: 0 mm
- node 3 reaction tz: 980.84017731 N
- node 3 displacement rx: 0 rad
- node 3 reaction rx: 5.656620172262e+6 N*mm
- node 3 displacement ry: 0 rad
- node 3 reaction ry: -51336.495346 N*mm
- node 3 displacement rz: 0 rad
- node 3 reaction rz: 1.957309419437e+7 N*mm
- node 4 displacement tx: 10.2716706292 mm
- node 4 reaction tx: 1.855369191617e-10 N
- node 4 displacement ty: -0.0338063030287 mm
- node 4 reaction ty: 3.637978807092e-12 N
- node 4 displacement tz: 8.34960713384 mm
- node 4 reaction tz: 0 N
- node 4 displacement rx: 0.00498257131702 rad
- node 4 reaction rx: 0 N*mm
- node 4 displacement ry: 0.00211864901428 rad
- node 4 reaction ry: -1.135049387813e-9 N*mm
- node 4 displacement rz: -0.00391676991678 rad
- node 4 reaction rz: -9.313225746155e-9 N*mm
- node 5 displacement tx: 10.2839626358 mm
- node 5 reaction tx: -1.364242052659e-10 N
- node 5 displacement ty: -0.12987012987 mm
- node 5 reaction ty: 0 N
- node 5 displacement tz: -1.163448288587e-14 mm
- node 5 reaction tz: -8.407117235406e-13 N
- node 5 displacement rx: -7.274137929034e-18 rad
- node 5 reaction rx: -3.430387920765e-10 N*mm
- node 5 displacement ry: 0.00208848470068 rad
- node 5 reaction ry: 1.396983861923e-9 N*mm
- node 5 displacement rz: -0.00297773635567 rad
- node 5 reaction rz: -2.700835466385e-8 N*mm
- node 6 displacement tx: 10.2716706292 mm
- node 6 reaction tx: -4.729372449219e-11 N
- node 6 displacement ty: -0.225933956712 mm
- node 6 reaction ty: 2.182787284255e-11 N
- node 6 displacement tz: -8.34960713384 mm
- node 6 reaction tz: 7.275957614183e-12 N
- node 6 displacement rx: -0.00498257131702 rad
- node 6 reaction rx: -3.725290298462e-9 N*mm
- node 6 displacement ry: 0.00211864901428 rad
- node 6 reaction ry: 1.367880031466e-9 N*mm
- node 6 displacement rz: -0.00391676991678 rad
- node 6 reaction rz: -9.313225746155e-9 N*mm
- node 7 displacement tx: 24.5564056637 mm
- node 7 reaction tx: -4.656612873077e-10 N
- node 7 displacement ty: -0.12362921445 mm
- node 7 reaction ty: 0 N
- node 7 displacement tz: 26.5568339154 mm
- node 7 reaction tz: -2.728484105319e-12 N
- node 7 displacement rx: 0.00658462797514 rad
- node 7 reaction rx: -1.103258900534e-8 N*mm
- node 7 displacement ry: 0.00657906481654 rad
- node 7 reaction ry: 4.656612873077e-9 N*mm
- node 7 displacement rz: -0.00303156509521 rad
- node 7 reaction rz: 1.536682248116e-8 N*mm
- node 8 displacement tx: 24.533217437 mm
- node 8 reaction tx: 4.656612873077e-10 N
- node 8 displacement ty: -0.25974025974 mm
- node 8 reaction ty: 0 N
- node 8 displacement tz: -3.901926703516e-14 mm
- node 8 reaction tz: 0 N
- node 8 displacement rx: -1.013695004422e-17 rad
- node 8 reaction rx: -1.455191522837e-10 N*mm
- node 8 displacement ry: 0.00663839854184 rad
- node 8 reaction ry: 4.656612873077e-9 N*mm
- node 8 displacement rz: -0.00193115046013 rad
- node 8 reaction rz: 1.862645149231e-8 N*mm
- node 9 displacement tx: 24.5564056637 mm
- node 9 reaction tx: -5.056790541857e-10 N
- node 9 displacement ty: -0.395851305031 mm
- node 9 reaction ty: 0 N
- node 9 displacement tz: -26.5568339154 mm
- node 9 reaction tz: 3.637978807092e-12 N
- node 9 displacement rx: -0.00658462797514 rad
- node 9 reaction rx: 0 N*mm
- node 9 displacement ry: 0.00657906481654 rad
- node 9 reaction ry: -1.862645149231e-9 N*mm
- node 9 displacement rz: -0.00303156509521 rad
- node 9 reaction rz: 2.980232238770e-8 N*mm
- frame 1 force 0: 5206.17066643 N
- frame 1 force 1: 9027.51234835 N
- frame 1 force 2: -980.84017731 N
- frame 1 force 3: -51336.495346 N*mm
- frame 1 force 4: 5.656620172262e+6 N*mm
- frame 1 force 5: 1.957309419437e+7 N*mm
- frame 1 force 6: -5206.17066643 N
- frame 1 force 7: -9027.51234835 N
- frame 1 force 8: 980.84017731 N
- frame 1 force 9: 51336.495346 N*mm
- frame 1 force 10: -2.714099640330e+6 N*mm
- frame 1 force 11: 7.509442850684e+6 N*mm
- frame 2 force 0: 20000 N
- frame 2 force 1: 11944.9753033 N
- frame 2 force 2: 8.100691113925e-13 N
- frame 2 force 3: -50605.5908241 N*mm
- frame 2 force 4: -7.325379527478e-9 N*mm
- frame 2 force 5: 2.250317694267e+7 N*mm
- frame 2 force 6: -20000 N
- frame 2 force 7: -11944.9753033 N
- frame 2 force 8: -8.100691113925e-13 N
- frame 2 force 9: 50605.5908241 N*mm
- frame 2 force 10: 4.895172193300e-9 N*mm
- frame 2 force 11: 1.333174896722e+7 N*mm
- frame 3 force 0: 34793.8293336 N
- frame 3 force 1: 9027.51234835 N
- frame 3 force 2: 980.84017731 N
- frame 3 force 3: -51336.495346 N*mm
- frame 3 force 4: -5.656620172262e+6 N*mm
- frame 3 force 5: 1.957309419437e+7 N*mm
- frame 3 force 6: -34793.8293336 N
- frame 3 force 7: -9027.51234835 N
- frame 3 force 8: -980.84017731 N
- frame 3 force 9: 51336.495346 N*mm
- frame 3 force 10: 2.714099640330e+6 N*mm
- frame 3 force 11: 7.509442850684e+6 N*mm
- frame 4 force 0: 13832.7283588 N
- frame 4 force 1: 7930.45076709 N
- frame 4 force 2: -959.199184467 N
- frame 4 force 3: -108079.305978 N*mm
- frame 4 force 4: 2.784526369523e+6 N*mm
- frame 4 force 5: 1.053246072541e+7 N*mm
- frame 4 force 6: -13832.7283588 N
- frame 4 force 7: -7930.45076709 N
- frame 4 force 8: 959.199184467 N
- frame 4 force 9: 108079.305978 N*mm
- frame 4 force 10: 93071.1838794 N*mm
- frame 4 force 11: 1.325889157586e+7 N*mm
- frame 5 force 0: 20000 N
- frame 5 force 1: 14139.0984658 N
- frame 5 force 2: 1.420330452143e-12 N
- frame 5 force 3: -110247.912305 N*mm
- frame 5 force 4: -4.535257854969e-9 N*mm
- frame 5 force 5: 1.959690541962e+7 N*mm
- frame 5 force 6: -20000 N
- frame 5 force 7: -14139.0984658 N
- frame 5 force 8: -1.420330452143e-12 N
- frame 5 force 9: 110247.912305 N*mm
- frame 5 force 10: 2.742664985411e-10 N*mm
- frame 5 force 11: 2.282038997786e+7 N*mm
- frame 6 force 0: 26167.2716412 N
- frame 6 force 1: 7930.45076709 N
- frame 6 force 2: 959.199184467 N
- frame 6 force 3: -108079.305978 N*mm
- frame 6 force 4: -2.784526369523e+6 N*mm
- frame 6 force 5: 1.053246072541e+7 N*mm
- frame 6 force 6: -26167.2716412 N
- frame 6 force 7: -7930.45076709 N
- frame 6 force 8: -959.199184467 N
- frame 6 force 9: 108079.305978 N*mm
- frame 6 force 10: -93071.1838794 N*mm
- frame 6 force 11: 1.325889157586e+7 N*mm
- frame 7 force 0: -1097.06158127 N
- frame 7 force 1: -8626.55769238 N
- frame 7 force 2: -21.6409928431 N
- frame 7 force 3: 70426.7291925 N*mm
- frame 7 force 4: 56742.8106318 N*mm
- frame 7 force 5: -1.804190357609e+7 N*mm
- frame 7 force 6: 1097.06158127 N
- frame 7 force 7: 8626.55769238 N
- frame 7 force 8: 21.6409928431 N
- frame 7 force 9: -70426.7291925 N*mm
- frame 7 force 10: 29821.1607404 N*mm
- frame 7 force 11: -1.646432719342e+7 N*mm
- frame 8 force 0: 1097.06158127 N
- frame 8 force 1: -8626.55769238 N
- frame 8 force 2: -21.6409928431 N
- frame 8 force 3: 70426.7291925 N*mm
- frame 8 force 4: 29821.1607404 N*mm
- frame 8 force 5: -1.646432719342e+7 N*mm
- frame 8 force 6: -1097.06158127 N
- frame 8 force 7: 8626.55769238 N
- frame 8 force 8: 21.6409928431 N
- frame 8 force 9: -70426.7291925 N*mm
- frame 8 force 10: 56742.8106318 N*mm
- frame 8 force 11: -1.804190357609e+7 N*mm
- frame 9 force 0: 2069.54923291 N
- frame 9 force 1: -6167.2716412 N
- frame 9 force 2: 40.8008155326 N
- frame 9 force 3: 93071.1838794 N*mm
- frame 9 force 4: -108079.305978 N*mm
- frame 9 force 5: -1.325889157586e+7 N*mm
- frame 9 force 6: -2069.54923291 N
- frame 9 force 7: 6167.2716412 N
- frame 9 force 8: -40.8008155326 N
- frame 9 force 9: -93071.1838794 N*mm
- frame 9 force 10: -55123.9561525 N*mm
- frame 9 force 11: -1.141019498893e+7 N*mm
- frame 10 force 0: -2069.54923291 N
- frame 10 force 1: -6167.2716412 N
- frame 10 force 2: 40.8008155326 N
- frame 10 force 3: 93071.1838794 N*mm
- frame 10 force 4: -55123.9561525 N*mm
- frame 10 force 5: -1.141019498893e+7 N*mm
- frame 10 force 6: 2069.54923291 N
- frame 10 force 7: 6167.2716412 N
- frame 10 force 8: -40.8008155326 N
- frame 10 force 9: -93071.1838794 N*mm
- frame 10 force 10: -108079.305978 N*mm
- frame 10 force 11: -1.325889157586e+7 N*mm

**Error (%):** maximum 0.000452114957842

**Tolerance used and why:** 0.01%. Direct Frame3DD text-output comparison; 0.01% accommodates printed precision while remaining stricter than the requested 1–2%.

**Pass/Fail:** Pass

**Frame3DD coverage:** direct

### VAL-10-006

**Test ID:** VAL-10-006

**Description:** Symmetric and antisymmetric portal loads produce exact mirrored response

**Model:** Geometrically and materially symmetric one-bay portal.

**Supports / releases / springs / offsets:** Both bases fixed.

**Loads:** Equal vertical loads and equal-opposite vertical loads at the two top joints.

**Reference method:** self-consistency check

**Reference value(s):**

- symmetric vertical displacement: -5.714285714286e-6 m
- symmetric opposite rotations: -1.578667470587e-22 rad
- antisymmetric opposite vertical displacement: -5.711782463536e-6 m
- antisymmetric equal rotations: 1.788036249455e-6 rad

**Library output:**

- symmetric vertical displacement: -5.714285714286e-6 m
- symmetric opposite rotations: 1.578667470587e-22 rad
- antisymmetric opposite vertical displacement: -5.711782463536e-6 m
- antisymmetric equal rotations: 1.788036249455e-6 rad

**Error (%):** maximum 1.694065894509e-19

**Tolerance used and why:** 0.1%. Closed-form and exact algebraic references permit a 0.1% acceptance threshold.

**Pass/Fail:** Pass

**Frame3DD coverage:** direct

### VAL-11-001

**Test ID:** VAL-11-001

**Description:** A general 3D frame satisfies force, moment, residual, and energy equilibrium

**Model:** Two-member L-frame from VAL-10-002.

**Supports / releases / springs / offsets:** One end fixed.

**Loads:** General tip force and moment.

**Reference method:** self-consistency check

**Reference value(s):**

- normalized force equilibrium: 0 ratio
- normalized moment equilibrium: 0 ratio
- normalized residual: 0 ratio
- relative energy error: 0 ratio

**Library output:**

- normalized force equilibrium: 5.478883745611e-17 ratio
- normalized moment equilibrium: 1.749672114543e-13 ratio
- normalized residual: 2.695094436815e-12 ratio
- relative energy error: 2.403894672281e-12 ratio

**Error (%):** maximum 2.695094436815e-10

**Tolerance used and why:** 0.1%. Closed-form and exact algebraic references permit a 0.1% acceptance threshold.

**Pass/Fail:** Pass

**Frame3DD coverage:** overlap-indirect

### VAL-11-002

**Test ID:** VAL-11-002

**Description:** The assembled global stiffness is symmetric

**Model:** Single-bay portal from VAL-10-001.

**Supports / releases / springs / offsets:** Both bases fixed.

**Loads:** Stiffness-only preparation.

**Reference method:** self-consistency check

**Reference value(s):**

- maximum K-K^T: 0 stiffness

**Library output:**

- maximum K-K^T: 0 stiffness

**Error (%):** maximum 0

**Tolerance used and why:** 0.1%. Closed-form and exact algebraic references permit a 0.1% acceptance threshold.

**Pass/Fail:** Pass

**Frame3DD coverage:** matrix-direct

### VAL-11-003

**Test ID:** VAL-11-003

**Description:** Maxwell-Betti reciprocity holds for cross force-moment flexibility

**Model:** 4 m Euler cantilever.

**Supports / releases / springs / offsets:** Base fixed.

**Loads:** Unit tip transverse force and unit tip bending moment in separate cases.

**Reference method:** self-consistency check

**Reference value(s):**

- cross flexibility: 5.442176870748e-7 m/N or rad/(N*m)

**Library output:**

- cross flexibility: 5.442176870748e-7 m/N or rad/(N*m)

**Error (%):** maximum 1.058791184068e-20

**Tolerance used and why:** 0.1%. Closed-form and exact algebraic references permit a 0.1% acceptance threshold.

**Pass/Fail:** Pass

**Frame3DD coverage:** direct

### VAL-11-004

**Test ID:** VAL-11-004

**Description:** Subdividing a prismatic member into 2, 4, and 8 elements preserves nodal response

**Model:** 6 m Euler cantilever represented by 1, 2, 4, and 8 equal elements.

**Supports / releases / springs / offsets:** Base fixed.

**Loads:** 15 kN transverse tip force.

**Reference method:** self-consistency check

**Reference value(s):**

- 2-element tip displacement: -0.0734693877551 m
- 2-element base moment: 90000 N*m
- 4-element tip displacement: -0.0734693877551 m
- 4-element base moment: 90000 N*m
- 8-element tip displacement: -0.0734693877551 m
- 8-element base moment: 90000 N*m

**Library output:**

- 2-element tip displacement: -0.0734693877551 m
- 2-element base moment: 90000 N*m
- 4-element tip displacement: -0.0734693877551 m
- 4-element base moment: 90000 N*m
- 8-element tip displacement: -0.0734693877551 m
- 8-element base moment: 90000 N*m

**Error (%):** maximum 1.956424158480e-12

**Tolerance used and why:** 0.1%. Closed-form and exact algebraic references permit a 0.1% acceptance threshold.

**Pass/Fail:** Pass

**Frame3DD coverage:** direct

### VAL-11-005

**Test ID:** VAL-11-005

**Description:** A deliberately under-restrained model is rejected as a global mechanism

**Model:** One free axial truss bar.

**Supports / releases / springs / offsets:** Only transverse translations constrained; axial rigid-body motion remains.

**Loads:** No external load.

**Reference method:** self-consistency check

**Reference value(s):**

- mechanism detected: 1 boolean

**Library output:**

- mechanism detected: 1 boolean

**Error (%):** maximum 0

**Tolerance used and why:** 0.1%. Closed-form and exact algebraic references permit a 0.1% acceptance threshold.

**Pass/Fail:** Pass

**Frame3DD coverage:** overlap-indirect

### VAL-11-006

**Test ID:** VAL-11-006

**Description:** Equivalent SI and imperial models agree after unit conversion

**Model:** Same 3.5 m Euler cantilever encoded once in SI and once in inch-pound units.

**Supports / releases / springs / offsets:** Base fixed.

**Loads:** 18 kN transverse tip force.

**Reference method:** self-consistency check

**Reference value(s):**

- tip displacement converted to metres: -0.0175 m
- base reaction converted to newtons: 18000 N
- base moment converted to N*m: 63000 N*m

**Library output:**

- tip displacement converted to metres: -0.01750000006 m
- base reaction converted to newtons: 18000 N
- base moment converted to N*m: 63000 N*m

**Error (%):** maximum 6.003706559676e-9

**Tolerance used and why:** 0.1%. Closed-form and exact algebraic references permit a 0.1% acceptance threshold.

**Pass/Fail:** Pass

**Frame3DD coverage:** overlap-indirect

### VAL-11-007

**Test ID:** VAL-11-007

**Description:** Extreme spring-to-member stiffness ratios retain exact response and diagnostics

**Model:** Axial truss in parallel with a grounded translational spring.

**Supports / releases / springs / offsets:** Start node fixed; tip transverse translations fixed.

**Loads:** 20 kN axial tip force.

**Reference method:** closed-form hand calc

**Reference value(s):**

- ratio 1e-12 displacement: 0.0000190476190476 m
- ratio 1e-12 residual: 0 ratio
- ratio 1000000000000 displacement: 1.904761904760e-17 m
- ratio 1000000000000 residual: 0 ratio

**Library output:**

- ratio 1e-12 displacement: 0.0000190476190476 m
- ratio 1e-12 residual: 0 ratio
- ratio 1000000000000 displacement: 1.904761904760e-17 m
- ratio 1000000000000 residual: 0 ratio

**Error (%):** maximum 1.778769189236e-14

**Tolerance used and why:** 0.1%. Closed-form and exact algebraic references permit a 0.1% acceptance threshold.

**Pass/Fail:** Pass

**Frame3DD coverage:** unsupported

### VAL-12-001

**Test ID:** VAL-12-001

**Description:** Kassimali classical two-span continuous-beam coefficient is reproduced

**Model:** Two equal 5 m Euler spans with constant EI.

**Supports / releases / springs / offsets:** Simple supports at both ends and the interior joint.

**Loads:** Equal full-span UDL w=-12 kN/m on both spans.

**Reference method:** published benchmark table

**Reference value(s):**

- interior support moment: -37500 N*m

**Library output:**

- interior support moment: -37500 N*m

**Error (%):** maximum 0

**Tolerance used and why:** 0.1%. Closed-form and exact algebraic references permit a 0.1% acceptance threshold.

**Pass/Fail:** Pass

**Frame3DD coverage:** direct

**Notes:** Classical continuous-beam and moment-distribution benchmark; Kassimali, Structural Analysis, chapters on indeterminate beams and moment distribution.

### VAL-12-002

**Test ID:** VAL-12-002

**Description:** Cowper rectangular-section shear coefficient produces the published Timoshenko compliance

**Model:** Deep rectangular Timoshenko cantilever, L=1.2 m, A=0.18 m².

**Supports / releases / springs / offsets:** Base fixed.

**Loads:** 50 kN transverse tip load.

**Reference method:** published benchmark table

**Reference value(s):**

- tip deflection: -0.0000429990842491 m

**Library output:**

- tip deflection: -0.0000429990842491 m

**Error (%):** maximum 1.575908812100e-14

**Tolerance used and why:** 0.1%. Closed-form and exact algebraic references permit a 0.1% acceptance threshold.

**Pass/Fail:** Pass

**Frame3DD coverage:** direct

**Notes:** G. R. Cowper, The Shear Coefficient in Timoshenko's Beam Theory, Journal of Applied Mechanics 33(2), 1966, DOI 10.1115/1.3625046.

### VAL-12-003

**Test ID:** VAL-12-003

**Description:** Monforton-Wu end-fixity factor matches a zero-length rotational spring model

**Model:** 4 m Euler member with a linear rotational spring at one end.

**Supports / releases / springs / offsets:** Far end fixed; near-end translation fixed and rotation carried by spring.

**Loads:** Unit end moment at the spring-connected joint.

**Reference method:** published benchmark table

**Reference value(s):**

- joint rotation: 4.186289900576e-8 rad
- published fixity factor: 0.454545454545 ratio

**Library output:**

- joint rotation: 4.186289900576e-8 rad
- published fixity factor: 0.454545454545 ratio

**Error (%):** maximum 1.580742150589e-14

**Tolerance used and why:** 0.1%. Closed-form and exact algebraic references permit a 0.1% acceptance threshold.

**Pass/Fail:** Pass

**Frame3DD coverage:** unsupported

**Notes:** G. R. Monforton and T. S. Wu, Matrix Analysis of Semi-Rigidly Connected Frames, Journal of the Structural Division 89(6), 1963, DOI 10.1061/JSDEAG.0000997.
