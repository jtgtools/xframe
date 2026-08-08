# JSON Input and Result Artifacts

xframe accepts parsed JSON values, not filenames or CSV. CSV input is not supported.

## Model artifact

A version-one model is a closed object with `schemaVersion: "1"`, `unitSystem`, `nodes`, `materials`, `frameSections`, `trussSections`, `frames`, `trusses`, `springs`, `constraints`, `loadCases`, and `combinations`. Every property is required; unused collections are empty arrays. Unknown properties fail validation.

Use the complete schema at [`../../schemas/model.schema.json`](../../schemas/model.schema.json). JSON Schema validates shape, but `parseModelJson` remains authoritative for cross-references, physical properties, topology, constraints, finite values, and identifier safety.

```ts
import { parseModelJson, prepareAnalysis } from "@jtgtools/xframe";

const value = JSON.parse(text);
const model = parseModelJson(value);
const result = prepareAnalysis(model).solveCase("service");
```

Member point locations and partial distributed spans use either physical distance from the deformable elastic start or a dimensionless position ratio. The two forms are mutually exclusive. Rigid offsets therefore change the physical coordinate used for member loads.

Self-weight requires material density for every selected frame or truss. Omitting both `frameIds` and `trussIds` selects all structural members; providing either list selects only the explicitly listed categories and identifiers.

## Result artifact

A result artifact has `schemaVersion: "2"` and a complete immutable case or combination representation. Use [`../../schemas/result.schema.json`](../../schemas/result.schema.json). `parseResultJson` verifies closed shape, finite values, unit metadata, result conventions, and internal vector lengths; it does not rerun the structural analysis. A result schema version `1` fails with `SCHEMA_UNSUPPORTED` rather than being reinterpreted.

Result schema version two adds exact frame `internalForceSegments`, including six fixed cubic coefficient arrays per segment, and `globalReferenceEndForces` for every truss. The retained `globalEndForces` array contains the six elastic-end forces; `globalReferenceEndForces` contains twelve start-then-end reference-node force and moment components.

## Canonical form and hashes

```ts
import { artifactHash, canonicalJson, modelToJsonValue } from "@jtgtools/xframe";

const value = modelToJsonValue(model);
const text = canonicalJson(value);
const sha256 = await artifactHash(value);
```

Canonical JSON sorts object keys lexicographically, retains array order, emits finite JSON numbers, and normalizes `-0` to `0`. It is deterministic for the same artifact and runtime-defined numeric values. `artifactHash` requires `globalThis.crypto.subtle`; finalized structural model fingerprints are separately computed synchronously as `sha256:<64 lowercase hexadecimal digits>` from canonical UTF-8 model JSON.

## Units

The exact unit keys are `version`, `length`, `force`, `moment`, `modulus`, `distributedForce`, `density`, and `rotation`. `rotation` must be `"rad"`. Labels are metadata; xframe performs no unit conversion.

## Failure handling

Parsing throws `XFrameError` with `SCHEMA_INVALID` or `SCHEMA_UNSUPPORTED` and an exact JSON path when possible. Non-finite JavaScript values are rejected even though ordinary JSON text cannot encode them. Unknown fields are never ignored.
