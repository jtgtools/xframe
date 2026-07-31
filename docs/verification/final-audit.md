# Final System Audit

## Status

The Part 16 audit was executed on 2026-07-31 against the complete linear-static xframe source tree. The completed behavioral suite contains 303 tests. The verification subset contains 137 tests, including 99 requested validation cases. All tests pass in the available sandbox harness. This is an engineering assurance record; xframe is not formally certified, and project-specific independent review remains required.

## Environment and package discipline

- Node.js used for the audit: `v22.16.0`
- npm used for the audit: `10.9.2`
- Declared package manager: npm only (`npm@11.12.1` in `package.json`)
- Runtime: ESM, Node.js 22 or newer, browser-safe production imports
- No Bun, pnpm, Yarn, CSV input path, focused/skipped tests, production TODO/FIXME/STUB marker, or Node-only production import was found.

## Clean installation audit

A clean installation was attempted in `/mnt/data/xframe_npm_audit` after removing dependencies and build output. `npm ci` could not complete because the execution environment's configured internal registry returned HTTP 404 for locked public packages, including `why-is-node-running@2.3.0`, Vitest dependencies, and Oxfmt/Oxlint native bindings. Public npm registry DNS was unavailable from the container.

This is an infrastructure limitation, not a passing clean-install result. The SHA-256 of `package-lock.json` remained `e0d320eaf2edac59d6290b8d31f48f122968eb599fdb050cd60febce3100f538`; no dependency or lockfile was modified to hide the failure.

Because native packages could not be fetched, formatting, linting, testing, and coverage commands in this sandbox used ignored compatibility shims already present under `node_modules`. TypeScript compilation, production build, runtime-import checks, numerical execution, Frame3DD execution, package construction, and packed-output imports used the actual repository source and Node.js runtime. A normal networked environment must rerun `npm ci && npm run check` with the pinned native tools.

## Command audit

The final command sequence executed:

```text
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run verify
npm run build
npm run coverage
npm run check
npm run check:runtime
npm run check:dense
XFRAME_BENCH_10000=1 npm run benchmark   # twice
FRAME3DD_BIN=/mnt/data/frame3dd_work/Frame3DD/linux/frame3dd npm run verify:frame3dd
npm pack --dry-run
npm pack
```

The available harness reports 303 passing tests and 137 passing verification tests. Production TypeScript type checking and build pass. The browser runtime boundary is clean across 79 source modules, and the dense-global-allocation guard passes. Native coverage percentages are not claimed because the pinned Vitest coverage provider could not be fetched.

## Package audit

`npm pack --dry-run` and `npm pack` produced `jtgtools-xframe-0.0.1.tgz` with 163 entries, 73,309 compressed bytes, and 359,666 unpacked bytes. The package contains only compiled ESM/TypeScript declarations, the two JSON Schemas, README, license, and package metadata. It excludes source tests, verification fixtures, planning files, and development dependencies.

- SHA-1: `5006e38f2e3af1db33a7cd74152b98172b9fc32e`
- npm integrity: `sha512-HmsVcVrvDOGRCROMSYPcn0Fh1FbWCvni23hKsm7hzFGXaZoLpUbilYJku8DcFArXEYnf7YFGq0WbXBynIWmxYQ==`

The tarball was extracted in a disposable directory. Importing its public `dist/index.js` entry and solving a two-node axial truss returned the exact expected displacement `0.000001 m = PL/EA`.

## Frame3DD audit

The supplied Frame3DD `20140514+` Linux executable has SHA-256 `53b1dc6628424b156e491e3205f13d58a0e325e33e4746d225b456ab85ac5275`. Six reference datasets regenerate non-destructively and match the committed parsed records.

Direct element stiffness and global stiffness comparisons cover Euler-Bernoulli and Timoshenko cantilevers, a two-member chain, a single-bay portal, and a two-story two-bay frame. In total, 17 transformed 12×12 element stiffness matrices, five assembled global stiffness matrices through 54×54, and 6,552 matrix entries are compared. Displacements, reactions, local end forces, truss axial forces, distributed loads, point actions, self-weight, and multi-member responses are also compared.

Two Frame3DD point-load discrepancies are retained as external-oracle defect records rather than copied into xframe. Portal and multi-story local forces also require a documented 180-degree vertical-member roll sign mapping; global quantities and magnitudes agree.

## Expanded validation outcome

The supplied 12-category matrix is implemented as 99 executable cases with 565 numerical comparisons. Every category has zero failures. The largest reported percentage error is approximately `0.000452115%`, from the printed commercial-software comparison category, below its declared `0.01%` tolerance.

The expanded tests exposed one genuine xframe defect: symmetric off-diagonal stiffness contributions mapping onto one affine reduced DOF were counted once rather than twice. The reproducing 3D oblique-restraint model showed a 33.33% stiffness error. The shared reduction was repaired and protected by a regression test.

All 4,096 frame-release masks are classified without artificial stiffness regularization: valid masks condense exactly, and singular local mechanisms produce a structured error.

## Benchmark audit

The 500, 2,000, 5,000, and 10,000-equation sparse spring-chain benchmark was run twice. Stable fields were identical. The 10,000-equation model used 19,999 coordinate nonzeros and 19,999 skyline coefficients, estimated 1,039,968 sparse working bytes, reused one assembly and one factorization for two solves, preserved exact load scaling of 2, and reported normalized residual `7.275957614183426e-12`.

## Repository and security audit

- Public identifiers are NFC-normalized and stored in `Map`, including prototype-like names.
- External JSON uses closed versioned schemas, exact paths, unknown-property rejection, finite-number checks, canonical output, and Web Crypto hashing.
- Caller-owned arrays and objects are copied before immutable storage.
- Constraint contradictions, global mechanisms, local release mechanisms, non-positive pivots, memory limits, non-finite values, and missing density are explicit structured failures.
- No dense global stiffness matrix or dense global affine transform is introduced.
- The production dependency graph has no runtime dependencies.

## Supported scope and exclusions

Supported behavior is linear-elastic static 3D analysis with Euler-Bernoulli and Timoshenko frames, trusses, diagonal nodal springs, rigid end offsets, exact end releases, nodal and member loads, self-weight, affine constraints, load cases, combinations, immutable recovery, diagnostics, envelopes, and strict JSON artifacts.

Not supported: material or geometric nonlinearity, P-Delta, buckling/stability, modal or transient dynamics, damping, temperature loads, moving loads, staged construction, plasticity, finite rigid-body mass, section-property generation, design-code checks, member/connection design, optimization, meshing, visualization, or automatic unit conversion.

## Final disposition

The implemented scope, numerical corpus, Frame3DD overlap, documentation, package boundary, and reproducibility controls are complete. The only unresolved audit item is environmental: a native clean installation could not be demonstrated inside this container because required public registry artifacts were unavailable. This limitation is explicit and must be closed in a normal networked release environment before publication or professional reliance.
