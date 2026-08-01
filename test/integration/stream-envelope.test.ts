import { expect, it } from "vitest";
import { XFrameError } from "../../src/errors/xframe-error.js";
import { createEnvelopeCompatibility, streamEnvelope } from "../../src/results/stream-envelope.js";
import type {
  EnvelopeCompatibility,
  EnvelopeComponent,
  EnvelopeInputRecord,
  ResultConventions,
  StructuralResult,
} from "../../src/results/result-types.js";
import type { UnitSystem } from "../../src/units/unit-system.js";

const components = [
  { component: "tx", entityId: "n1" },
  { component: "bendingZ", entityId: "f1", location: 2 },
] as const;

const unitSystem: UnitSystem = Object.freeze({
  version: "1",
  length: "m",
  force: "N",
  moment: "N*m",
  modulus: "Pa",
  distributedForce: "N/m",
  density: "kg/m^3",
  rotation: "rad",
});

const conventions: ResultConventions = Object.freeze({
  coordinateSystem: "global-node-local-member",
  rotations: "radians-right-hand-rule",
  frameEndForces: "element-on-node",
  internalForces: "positive-local-cut-face",
});

const compatibility: EnvelopeCompatibility = Object.freeze({
  modelFingerprint: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  unitSystem,
  conventions,
  components: Object.freeze(components.map((component) => Object.freeze({ ...component }))),
});

const baseRecord: EnvelopeInputRecord = {
  resultId: "BASE",
  resultKind: "case",
  compatibility,
  values: [1, 2],
};

function compatible(overrides: Partial<EnvelopeCompatibility> = {}): EnvelopeCompatibility {
  return {
    ...compatibility,
    ...overrides,
  };
}

function incompatibleError(action: () => unknown): XFrameError {
  let thrown: unknown;
  try {
    action();
  } catch (error) {
    thrown = error;
  }
  if (!(thrown instanceof XFrameError)) throw new Error("expected RESULT_INCOMPATIBLE");
  return thrown;
}

it("FR-RES-006/FR-RES-007: streams 150000 records and retains complete deterministic extrema provenance", () => {
  function* records() {
    for (let index = 0; index < 150_000; index += 1) {
      yield {
        resultId: `R${index}`,
        resultKind: "case" as const,
        compatibility,
        values: [(index % 17) - 8, (index % 23) - 11],
      };
    }
  }
  const envelope = streamEnvelope(records(), components);
  expect(envelope.count).toBe(150_000);
  expect(envelope.maximum[0]!.value).toBe(8);
  expect(envelope.maximum[0]!.governing[0]).toEqual({
    resultId: "R16",
    resultKind: "case",
    component: "tx",
    entityId: "n1",
    extremum: "maximum",
  });
  expect(envelope.minimum[1]!.value).toBe(-11);
  expect(envelope.minimum[1]!.governing[0]).toEqual({
    resultId: "R0",
    resultKind: "case",
    component: "bendingZ",
    entityId: "f1",
    location: 2,
    extremum: "minimum",
  });
  expect(Object.isFrozen(envelope)).toBe(true);
});

it("FR-RES-006: keeps every tied governor and normalizes negative zero", () => {
  const envelope = streamEnvelope(
    [
      { resultId: "A", resultKind: "case", compatibility, values: [-0, 2] },
      { resultId: "B", resultKind: "combination", compatibility, values: [0, 2] },
    ],
    components,
  );
  expect(Object.is(envelope.minimum[0]!.value, -0)).toBe(false);
  expect(envelope.maximum[1]!.governing.map(({ resultId }) => resultId)).toEqual(["A", "B"]);
});

it("FR-RES-006/NFR-COR-002: rejects empty, duplicate, malformed, mismatched, and non-finite records", () => {
  const invalid = [
    () => streamEnvelope([], components),
    () =>
      streamEnvelope(
        [
          { resultId: "A", resultKind: "case", compatibility, values: [1, 2] },
          { resultId: "A", resultKind: "case", compatibility, values: [2, 3] },
        ],
        components,
      ),
    () =>
      streamEnvelope(
        [{ resultId: "", resultKind: "case", compatibility, values: [1, 2] }],
        components,
      ),
    () =>
      streamEnvelope(
        [{ resultId: "A", resultKind: "case", compatibility, values: [1] }],
        components,
      ),
    () =>
      streamEnvelope(
        [{ resultId: "A", resultKind: "case", compatibility, values: [1, Number.NaN] }],
        components,
      ),
  ];
  for (const action of invalid) expect(action).toThrowError(XFrameError);
});

it("FR-SAFE-014: rejects a bare legacy record with missing compatibility metadata", () => {
  const legacy = {
    resultId: "LEGACY",
    resultKind: "case",
    values: [1, 2],
  } as unknown as EnvelopeInputRecord;
  const error = incompatibleError(() => streamEnvelope([legacy], components));
  expect(error.code).toBe("RESULT_INCOMPATIBLE");
  expect(error.context).toMatchObject({ reason: "missing compatibility metadata" });
});

it("FR-SAFE-014: rejects model fingerprints that differ before reading values", () => {
  let read = false;
  const record = {
    ...baseRecord,
    resultId: "OTHER",
    compatibility: compatible({
      modelFingerprint: "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    }),
    get values(): readonly number[] {
      read = true;
      return [1, 2];
    },
  } satisfies EnvelopeInputRecord;
  const error = incompatibleError(() => streamEnvelope([baseRecord, record], components));
  expect(error.code).toBe("RESULT_INCOMPATIBLE");
  expect(error.context).toMatchObject({ reason: "model fingerprints differ" });
  expect(read).toBe(false);
});

it("FR-SAFE-014: rejects unit systems that differ", () => {
  const otherUnits = Object.freeze({ ...unitSystem, length: "mm" });
  const record = {
    ...baseRecord,
    resultId: "OTHER",
    compatibility: compatible({ unitSystem: otherUnits }),
  };
  const error = incompatibleError(() => streamEnvelope([baseRecord, record], components));
  expect(error.code).toBe("RESULT_INCOMPATIBLE");
  expect(error.context).toMatchObject({ reason: "unit systems differ" });
});

it("FR-SAFE-014: rejects result conventions that differ", () => {
  const otherConventions = {
    ...conventions,
    internalForces: "other-sign-convention",
  } as unknown as ResultConventions;
  const record = {
    ...baseRecord,
    resultId: "OTHER",
    compatibility: compatible({ conventions: otherConventions }),
  };
  const error = incompatibleError(() => streamEnvelope([baseRecord, record], components));
  expect(error.code).toBe("RESULT_INCOMPATIBLE");
  expect(error.context).toMatchObject({ reason: "result conventions differ" });
});

it("FR-SAFE-014: rejects component layouts that differ between records", () => {
  const otherComponents: readonly EnvelopeComponent[] = [
    { component: "tx", entityId: "n1" },
    { component: "bendingY", entityId: "f1", location: 2 },
  ];
  const record = {
    ...baseRecord,
    resultId: "OTHER",
    compatibility: compatible({ components: otherComponents }),
  };
  const error = incompatibleError(() => streamEnvelope([baseRecord, record], components));
  expect(error.code).toBe("RESULT_INCOMPATIBLE");
  expect(error.context).toMatchObject({ reason: "component layouts differ" });
});

it("FR-SAFE-014: rejects a first component layout that differs from supplied components", () => {
  const otherComponents: readonly EnvelopeComponent[] = [
    { component: "tx", entityId: "n1" },
    { component: "bendingY", entityId: "f1", location: 2 },
  ];
  const record = { ...baseRecord, compatibility: compatible({ components: otherComponents }) };
  const error = incompatibleError(() => streamEnvelope([record], components));
  expect(error.code).toBe("RESULT_INCOMPATIBLE");
  expect(error.context).toMatchObject({
    reason: "component layout differs from supplied components",
  });
});

it("FR-SAFE-014: creates an immutable compatibility copy with normalized nested metadata", () => {
  const sourceUnits = { ...unitSystem };
  const sourceConventions = { ...conventions };
  const sourceComponents: EnvelopeComponent[] = [
    { component: "tx", entityId: "n1" },
    { component: "bendingZ", entityId: "f1", location: -0 },
  ];
  const result = {
    modelFingerprint: compatibility.modelFingerprint,
    unitSystem: sourceUnits,
    conventions: sourceConventions,
  } as StructuralResult;
  const created = createEnvelopeCompatibility(result, sourceComponents);
  expect(created).toEqual({
    ...compatibility,
    components: [
      { component: "tx", entityId: "n1" },
      { component: "bendingZ", entityId: "f1", location: 0 },
    ],
  });
  expect(Object.isFrozen(created)).toBe(true);
  expect(Object.isFrozen(created.unitSystem)).toBe(true);
  expect(Object.isFrozen(created.conventions)).toBe(true);
  expect(Object.isFrozen(created.components)).toBe(true);
  expect(Object.isFrozen(created.components[0])).toBe(true);
  sourceUnits.length = "mm";
  sourceConventions.internalForces = "changed" as ResultConventions["internalForces"];
  (sourceComponents[0] as { component: string }).component = "changed";
  expect(created.unitSystem.length).toBe("m");
  expect(created.conventions.internalForces).toBe("positive-local-cut-face");
  expect(created.components[0]!.component).toBe("tx");
});
