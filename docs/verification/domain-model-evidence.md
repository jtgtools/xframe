# Domain Model and Validation Evidence

Date: 2026-07-31
Part: 02
Requirements: FR-ERR-001, FR-MOD-001, FR-MOD-002, FR-MOD-003, FR-MOD-005

## Public construction contracts

The Part 02 implementation establishes these stable construction interfaces:

```ts
parseIdentifier(value: unknown, path: string): EntityId;
createModelBuilder(): ModelBuilder;
```

`ModelBuilder` exposes fluent methods for nodes, materials, frame sections, truss sections, frames, trusses, springs, affine constraints, load cases, combinations, and atomic batches. Cross-reference existence is deliberately deferred to model finalization. `snapshot()` returns frozen arrays of frozen, caller-independent records. `finalize()` currently fails explicitly with `UNSUPPORTED_FEATURE`; Part 05 replaces that temporary boundary with complete reference and topology finalization.

## Structured-error evidence

`XFrameError` stores a stable `XFrameErrorCode`, a copied and recursively frozen discriminated context, and an optional safe cause summary containing only `name`, `message`, and a stringified scalar `code`. Arbitrary properties on an underlying cause are neither copied nor serialized.

Representative JSON form:

```json
{
  "name": "XFrameError",
  "code": "NON_FINITE_VALUE",
  "message": "Expected a finite number at node.coordinates[1].",
  "context": {
    "kind": "numeric",
    "path": "node.coordinates[1]",
    "value": "NaN",
    "expected": "finite number"
  }
}
```

## Identifier and registry evidence

Identifiers are NFC-normalized strings with a maximum of 128 Unicode code points. Empty values, Unicode whitespace, control/format characters, and spreadsheet-formula prefixes (`=`, `+`, `-`, `@`) are rejected. Prototype-like values such as `__proto__`, `constructor`, `prototype`, and `toString` remain valid identifiers because registries use `Map` rather than ordinary object dictionaries.

Registry iteration follows insertion order. Duplicate insertion raises `DUPLICATE_IDENTIFIER` with entity type and identifier. Transactions mutate a private draft and replace live storage only after the callback completes successfully.

## Ownership and rollback evidence

The test suite demonstrates all of the following:

- Mutating a caller-owned coordinate array after `addNode` does not alter stored coordinates.
- Stored records, nested arrays, snapshot category arrays, and error contexts are frozen.
- Nested own properties named `__proto__` are preserved as data without mutating object prototypes.
- A duplicate in a later batch category rolls back records staged in earlier categories.
- Failed and pre-operation snapshots are byte-for-byte identical under canonical `JSON.stringify` insertion order.
- Successful batches preserve deterministic caller order within every category.

## Verification commands

The following repository scripts were executed for Part 02:

```text
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run verify
npm run build
npm run coverage
npm run check
```

The execution container could not retrieve the pinned Vitest/Oxfmt/Oxlint packages because its configured npm mirror lacks required tarballs and public npm DNS is unavailable. Therefore, this run used an ignored sandbox-only compatibility harness for command execution; `package.json` and `package-lock.json` remain pinned and unchanged for a normal `npm ci` against the public registry. Native-tool revalidation remains a mandatory Part 16 audit item.
