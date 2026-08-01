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

it("FR-SAFE-014: rejects inherited record compatibility before reading values", () => {
  let valuesRead = false;
  const record = Object.create({ compatibility }) as EnvelopeInputRecord;
  Object.defineProperties(record, {
    resultId: { value: "INHERITED", enumerable: true },
    resultKind: { value: "case", enumerable: true },
    values: {
      enumerable: true,
      get(): readonly number[] {
        valuesRead = true;
        return [1, 2];
      },
    },
  });
  const error = incompatibleError(() => streamEnvelope([record], components));
  expect(error.code).toBe("RESULT_INCOMPATIBLE");
  expect(error.context).toMatchObject({ reason: "missing compatibility metadata" });
  expect(valuesRead).toBe(false);
});

it("FR-SAFE-014: enforces exact result convention literals in first metadata", () => {
  const invalidConventions = {
    ...conventions,
    rotations: "nonempty-but-unsupported",
  } as unknown as ResultConventions;
  const error = incompatibleError(() =>
    streamEnvelope(
      [{ ...baseRecord, compatibility: compatible({ conventions: invalidConventions }) }],
      components,
    ),
  );
  expect(error.code).toBe("RESULT_INCOMPATIBLE");
  expect(error.context).toMatchObject({ reason: "missing compatibility metadata" });
});

it("FR-SAFE-014: captures stateful unit getters once while creating owned metadata", () => {
  let lengthReads = 0;
  const sourceUnits = {
    ...unitSystem,
    get length(): string {
      lengthReads += 1;
      return lengthReads === 1 ? "m" : "mm";
    },
  };
  const result = {
    modelFingerprint: compatibility.modelFingerprint,
    unitSystem: sourceUnits,
    conventions,
  } as StructuralResult;
  const created = createEnvelopeCompatibility(result, components);
  expect(lengthReads).toBe(1);
  expect(created.unitSystem.length).toBe("m");
});

it("FR-SAFE-014: copies component arrays by index without calling overridden map", () => {
  class OverriddenComponentArray extends Array<EnvelopeComponent> {
    public override map<U>(
      _callbackfn: (value: EnvelopeComponent, index: number, array: EnvelopeComponent[]) => U,
    ): U[] {
      throw new Error("untrusted map called");
    }
  }
  const sourceComponents = new OverriddenComponentArray(...components);
  const result = {
    modelFingerprint: compatibility.modelFingerprint,
    unitSystem,
    conventions,
  } as StructuralResult;
  const created = createEnvelopeCompatibility(result, sourceComponents);
  expect(created.components).toEqual(components);
  expect(Object.isFrozen(created.components)).toBe(true);
  expect(Object.isFrozen(created.components[0])).toBe(true);
});

it("FR-SAFE-014: rejects inherited component fields", () => {
  const inherited = Object.create({ component: "tx", entityId: "n1" });
  const supplied = [inherited, components[1]] as readonly EnvelopeComponent[];
  const error = incompatibleError(() => streamEnvelope([baseRecord], supplied));
  expect(error.code).toBe("RESULT_INCOMPATIBLE");
  expect(error.context).toMatchObject({ reason: "component layout is invalid" });
});

it("FR-SAFE-014: rejects an inherited optional component location", () => {
  const inherited = Object.create({ location: 0 });
  Object.assign(inherited, { component: "tx", entityId: "n1" });
  const supplied = [inherited, components[1]] as readonly EnvelopeComponent[];
  const error = incompatibleError(() => streamEnvelope([baseRecord], supplied));
  expect(error.code).toBe("RESULT_INCOMPATIBLE");
  expect(error.context).toMatchObject({ reason: "component layout is invalid" });
});

it("FR-SAFE-014: maps invalid compatibility identifiers to a stable incompatibility", () => {
  const invalidComponents = [{ component: "tx", entityId: "" }, components[1]];
  const error = incompatibleError(() =>
    streamEnvelope(
      [{ ...baseRecord, compatibility: compatible({ components: invalidComponents }) }],
      components,
    ),
  );
  expect(error.code).toBe("RESULT_INCOMPATIBLE");
  expect(error.context).toMatchObject({ reason: "missing compatibility metadata" });
});

it.each([
  ["invalid fingerprint", "sha256:ABC"],
  ["missing fingerprint", undefined],
] as const)(
  "FR-SAFE-014: maps %s in first metadata to missing compatibility metadata",
  (_label, fingerprint) => {
    const metadata = { ...compatible() } as Record<string, unknown>;
    if (fingerprint === undefined) delete metadata["modelFingerprint"];
    else metadata["modelFingerprint"] = fingerprint;
    let valuesRead = false;
    const record = {
      ...baseRecord,
      compatibility: metadata as unknown as EnvelopeCompatibility,
      get values(): readonly number[] {
        valuesRead = true;
        return [1, 2];
      },
    };
    const error = incompatibleError(() => streamEnvelope([record], components));
    expect(error.code).toBe("RESULT_INCOMPATIBLE");
    expect(error.context).toMatchObject({ reason: "missing compatibility metadata" });
    expect(valuesRead).toBe(false);
  },
);

it.each([
  ["uppercase hex", "sha256:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"],
  ["short hex", "sha256:aaaaaaaa"],
] as const)(
  "FR-SAFE-014: rejects %s fingerprints from create compatibility",
  (_label, fingerprint) => {
    const result = {
      modelFingerprint: fingerprint,
      unitSystem,
      conventions,
    } as StructuralResult;
    const error = incompatibleError(() => createEnvelopeCompatibility(result, components));
    expect(error.code).toBe("RESULT_INCOMPATIBLE");
    expect(error.context).toMatchObject({ reason: "missing compatibility metadata" });
  },
);

const metadataMismatches = [
  {
    label: "model fingerprints",
    reason: "model fingerprints differ",
    compatibility: compatible({
      modelFingerprint: "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    }),
  },
  {
    label: "unit systems",
    reason: "unit systems differ",
    compatibility: compatible({ unitSystem: { ...unitSystem, length: "mm" } }),
  },
  {
    label: "result conventions",
    reason: "result conventions differ",
    compatibility: compatible({
      conventions: {
        ...conventions,
        internalForces: "other-sign-convention",
      } as unknown as ResultConventions,
    }),
  },
  {
    label: "component layouts",
    reason: "component layouts differ",
    compatibility: compatible({
      components: [
        { component: "tx", entityId: "n1" },
        { component: "bendingY", entityId: "f1", location: 2 },
      ],
    }),
  },
  {
    label: "missing compatibility metadata",
    reason: "missing compatibility metadata",
    compatibility: {} as EnvelopeCompatibility,
  },
] as const;

it.each(metadataMismatches)(
  "FR-SAFE-014: leaves values unread for $label metadata mismatches",
  ({ compatibility: mismatchedCompatibility, reason }) => {
    let valuesRead = false;
    const record = {
      resultId: "OTHER",
      resultKind: "case" as const,
      compatibility: mismatchedCompatibility,
      get values(): readonly number[] {
        valuesRead = true;
        return [1, 2];
      },
    };
    const error = incompatibleError(() => streamEnvelope([baseRecord, record], components));
    expect(error.code).toBe("RESULT_INCOMPATIBLE");
    expect(error.context).toMatchObject({ reason });
    expect(valuesRead).toBe(false);
  },
);
