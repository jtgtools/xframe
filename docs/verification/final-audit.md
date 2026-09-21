# Final System Audit

## Status

The Part 16 audit was executed on 2026-07-31 against the complete linear-static xframe source tree, with the OpenSees-only revision recorded 2026-09-18. The behavioral suite passes in the available sandbox harness. This is an engineering assurance record; xframe is not formally certified, and project-specific independent review remains required.

## Environment and package discipline

- Node.js used for the audit: `v22.16.0`
- npm used for the audit: `10.9.2`
- Declared package manager: npm only (`npm@11.12.1` in `package.json`)
- Runtime: ESM, Node.js 22 or newer, browser-safe production imports
- No Bun, pnpm, Yarn, CSV input path, focused/skipped tests, production TODO/FIXME/STUB marker, or Node-only production import was found.

## Clean installation audit

A clean installation was attempted in `/mnt/data/xframe_npm_audit` after removing dependencies and build output. `npm ci` could not complete because the execution environment's configured internal registry returned HTTP 404 for locked public packages, including `why-is-node-running@2.3.0`, Vitest dependencies, and Oxfmt/Oxlint native bindings. Public npm registry DNS was unavailable from the container.

This is an infrastructure limitation, not a passing clean-install result. The SHA-256 of `package-lock.json` remained `e0d320eaf2edac59d6290b8d31f48f122968eb599fdb050cd60febce3100f538`; no dependency or lockfile was modified to hide the failure.

Because native packages could not be fetched, formatting, linting, testing, and coverage commands in this sandbox used ignored compatibility shims already present under `node_modules`. TypeScript compilation, production build, runtime-import checks, numerical execution, OpenSees execution, package construction, and packed-output imports used the actual repository source and Node.js runtime. A normal networked environment must rerun `npm ci && npm run check` with the pinned native tools.

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
npm run benchmark   # twice
OPENSEES_BIN=/absolute/path/to/OpenSees npm run verify:opensees
npm pack --dry-run
npm pack
```

The available harness reports passing tests and passing verification tests including 99 requested validation cases. Production TypeScript type checking and build pass. The browser runtime boundary is clean across source modules, and the dense-global-allocation guard passes. (Note: `npm run check:dense` was later pruned as a standalone script; the guard now runs as `test/regression/no-dense-global-allocation.test.ts` under `npm run test`.) Native coverage percentages are not claimed because the pinned Vitest coverage provider could not be fetched.

## Package audit

`npm pack --dry-run` and `npm pack` produced `jtgtools-xframe-0.0.1.tgz` with 163 entries, 73,309 compressed bytes, and 359,666 unpacked bytes. The package contains only compiled ESM/TypeScript declarations, the two JSON Schemas, README, license, and package metadata. It excludes source tests, verification fixtures, planning files, and development dependencies.

- SHA-1: `5006e38f2e3af1db33a7cd74152b98172b9fc32e`
- npm integrity: `sha512-HmsVcVrvDOGRCROMSYPcn0Fh1FbWCvni23hKsm7hzFGXaZoLpUbilYJku8DcFArXEYnf7YFGq0WbXBynIWmxYQ==`

The tarball was extracted in a disposable directory. Importing its public `dist/index.js` entry and solving a two-node axial truss returned the exact expected displacement `0.000001 m = PL/EA`.

## OpenSees audit

The supplied OpenSees `3.8.0` Tcl executable has SHA-256 `5aa4e9c80c410c510ca62ac3b2f1d64a8e50679f0238e140b5bebcd6d5ddbe6d`. Five reference datasets (cantilever, portal, two-story two-bay, triangular truss, eccentric truss) verify non-destructively via `npm run verify:opensees`.

Direct element stiffness and global stiffness behavior is covered through solved OpenSees building comparisons: displacements, reactions, local end forces, truss axial forces, and settlement response. Portal and multi-story local forces keep the documented 180-degree vertical-member roll sign mapping; global quantities and magnitudes agree.

## Expanded validation outcome

The supplied 12-category matrix is implemented as 99 executable cases with 565 numerical comparisons. Every category has zero failures. The largest reported percentage error is approximately `0.000452115%`, from the printed commercial-software comparison category, below its declared `0.01%` tolerance.

The expanded tests exposed one genuine xframe defect: symmetric off-diagonal stiffness contributions mapping onto one affine reduced DOF were counted once rather than twice. The reproducing 3D oblique-restraint model showed a 33.33% stiffness error. The shared reduction was repaired and protected by a regression test.

All 4,096 frame-release masks are classified without artificial stiffness regularization: valid masks condense exactly, and singular local mechanisms produce a structured error.

## Benchmark audit

The real-building benchmark suite (2-story, 5-story, 10-story, 15-story moment frames plus tower-grid floor) was run twice. Stable fields were identical. The 15-story model used 1,910 coordinate nonzeros and 6,958 skyline coefficients, reused one assembly and one factorization for two solves, preserved exact load scaling of 2, and reported normalized residual `2.626e-11`.

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

The implemented scope, numerical corpus, OpenSees building overlap, element stiffness and global stiffness evidence, documentation, package boundary, and reproducibility controls are complete. The only unresolved audit item is environmental: a native clean installation could not be demonstrated inside this container because required public registry artifacts were unavailable. This limitation is explicit and must be closed in a normal networked release environment before publication or professional reliance.
