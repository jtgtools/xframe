# JSON and Public API Verification Report

Date: 2026-07-31
Part: 13 — JSON serialization and public API

## Acceptance scope

The version-one JSON boundary accepts only complete JSON objects. It does not accept CSV paths, CSV text, shorthand file references, ambiguous member point `position` fields, missing discriminants, additional properties, non-finite JavaScript numbers, or unsupported schema versions.

The runtime parser remains authoritative for conditions that JSON Schema cannot completely express, including normalized identifier rules, duplicate identifiers, cross-references, constitutive consistency, topology, constraint rank, member coordinate limits, and result compatibility.

## Published schemas

- `schemas/model.schema.json`: JSON Schema draft 2020-12, closed root and nested objects, exact unit metadata, every model entity, all five load discriminants, exclusive point-coordinate alternatives, distributed-load span alternatives, constraints, cases, and combinations.
- `schemas/result.schema.json`: JSON Schema draft 2020-12, closed case/combination unions, units, conventions, full vectors, node and element recovery, internal-force stations, diagnostics, provenance, and combination factors.

At the original Part 13 execution, both artifacts used schema version `1`. The TypeScript parsers rejected any other version with `SCHEMA_UNSUPPORTED`.

## Malformed corpus

The focused corpus covers:

- unsupported schema versions;
- missing and additional top-level properties;
- CSV-related properties;
- wrong tuple lengths;
- null load and null result values;
- ambiguous point-load coordinate properties;
- hostile/prototype-like object properties;
- non-finite JavaScript numeric values;
- incomplete result diagnostics;
- malformed unit metadata with exact additional-property paths.

Failures return immutable `XFrameError` instances with stable codes and exact JSON paths. Native `TypeError` and internal `UNITS_INVALID` errors do not escape the JSON parser boundary.

## Canonical serialization

Canonical output sorts object keys lexicographically, preserves array order, rejects cycles and unsupported/non-finite values, and normalizes negative zero to zero. Fifty seeded generated spring models round-trip to byte-identical canonical JSON.

Known SHA-256 check:

- canonical value: `{"a":1}`
- digest: `015abd7f5cc57a2dd94b7590f04ad8084273905ee33e4746d225b456ab85ac5275`

Artifact hashing uses `globalThis.crypto.subtle` and `TextEncoder`; it does not import Node runtime modules.

## Public runtime export snapshot

The exact version-one runtime exports are:

- `MODEL_SCHEMA_VERSION`
- `PreparedAnalysis`
- `RESULT_SCHEMA_VERSION`
- `XFRAME_ERROR_CODES`
- `XFRAME_VERSION`
- `XFrameError`
- `artifactHash`
- `canonicalJson`
- `combineResults`
- `createModelBuilder`
- `modelToJsonValue`
- `parseModelJson`
- `parseResultJson`
- `prepareAnalysis`
- `resultToJsonValue`
- `streamEnvelope`

The package exposes only `.` as ESM, points declarations to `dist/index.d.ts`, declares no side effects, and publishes only `dist`, `schemas`, `README.md`, and `LICENSE`.

## Runtime boundary

`scripts/check-runtime-imports.mjs` recursively rejects Node built-in imports, CommonJS `require`, `process`, `Buffer`, `__dirname`, and `__filename` under `src`. It also imports the built package entry when `dist/index.js` exists. The audit covered 79 runtime source modules.

## Test environment qualification

The repository remains pinned to Vitest 4.1.10, Oxlint 1.76.0, Oxfmt 0.61.0, and TypeScript 5.9.3. This container's configured package mirror omits the pinned Vitest tarballs, so test execution uses the previously disclosed sandbox compatibility harness. Native clean-install verification is reserved for the Part 16 environment audit and will be reported separately.

## Safety-correctness supersession (2026-08-08)

This report preserves the historical Part 13 execution and its test counts. Current model JSON remains schema version `2`; current result JSON is schema version `3`, and result version `2` fails with `SCHEMA_UNSUPPORTED`. Current exports additionally include `createEnvelopeCompatibility`, and envelopes require compatibility metadata rather than accepting bare records. See [`safety-correctness-report.md`](safety-correctness-report.md).
