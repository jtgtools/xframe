import { expect, it } from "vitest";
import { XFrameError } from "../../src/errors/xframe-error.js";
import { prepareAnalysis } from "../../src/analysis/prepare-analysis.js";
import { createModelBuilder } from "../../src/model/model-builder.js";
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
  expect(envelope.minimum[0]!.value).toBe(-8);
  expect(envelope.minimum[0]!.governing).toHaveLength(8_824);
  expect(envelope.minimum[0]!.governing.at(-1)!.resultId).toBe("R149991");
  expect(envelope.maximum[0]!.value).toBe(8);
  expect(envelope.maximum[0]!.governing).toHaveLength(8_823);
  expect(envelope.maximum[0]!.governing.at(-1)!.resultId).toBe("R149990");
  expect(envelope.minimum[1]!.value).toBe(-11);
  expect(envelope.minimum[1]!.governing).toHaveLength(6_522);
  expect(envelope.minimum[1]!.governing.at(-1)!.resultId).toBe("R149983");
  expect(envelope.maximum[1]!.value).toBe(11);
  expect(envelope.maximum[1]!.governing).toHaveLength(6_521);
  expect(envelope.maximum[1]!.governing.at(-1)!.resultId).toBe("R149982");
  expect(envelope.maximum[0]!.governing[0]).toEqual({
    resultId: "R16",
    resultKind: "case",
    component: "tx",
    entityId: "n1",
    extremum: "maximum",
  });
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

it("FR-SAFE-014: accepts unread unrelated own compatibility extensions", () => {
  let extensionReads = 0;
  const extensionKey = Symbol("extension");
  const compatibilityWithExtensions = {
    ...compatibility,
    get extension(): never {
      extensionReads += 1;
      throw new Error("string extension read");
    },
    get [extensionKey](): never {
      extensionReads += 1;
      throw new Error("symbol extension read");
    },
  };
  const extendedCompatibility: EnvelopeCompatibility = compatibilityWithExtensions;
  const envelope = streamEnvelope(
    [
      { ...baseRecord, compatibility: extendedCompatibility },
      { ...baseRecord, resultId: "OTHER", compatibility: extendedCompatibility, values: [2, 3] },
    ],
    components,
  );
  expect(envelope.count).toBe(2);
  expect(envelope.minimum[0]!.value).toBe(1);
  expect(extensionReads).toBe(0);
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

it("FR-SAFE-014: rejects a first component layout that differs from supplied components before reading values", () => {
  const otherComponents: readonly EnvelopeComponent[] = [
    { component: "tx", entityId: "n1" },
    { component: "bendingY", entityId: "f1", location: 2 },
  ];
  let valuesRead = false;
  const record = {
    ...baseRecord,
    compatibility: compatible({ components: otherComponents }),
    get values(): readonly number[] {
      valuesRead = true;
      return [1, 2];
    },
  };
  const error = incompatibleError(() => streamEnvelope([record], components));
  expect(error.code).toBe("RESULT_INCOMPATIBLE");
  expect(error.context).toMatchObject({
    reason: "component layout differs from supplied components",
  });
  expect(valuesRead).toBe(false);
});

it("FR-SAFE-014: creates an immutable compatibility copy with normalized nested metadata", () => {
  const sourceUnits = { ...unitSystem };
  const sourceConventions = { ...conventions };
  const sourceComponents: EnvelopeComponent[] = [
    { component: "tx", entityId: "n1" },
    { component: "bendingZ", entityId: "f1", location: -0 },
  ];
  const result = {
    id: "RESULT",
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

it("FR-SAFE-014: creates compatibility from a solver-produced structural result", () => {
  const model = createModelBuilder()
    .setUnitSystem(unitSystem)
    .addNode({ id: "n", coordinates: [0, 0, 0] })
    .addSpring({ id: "k", startNodeId: "n", stiffness: [500, 0, 0, 0, 0, 0] })
    .addLoadCase({ id: "P", loads: [{ kind: "nodal", nodeId: "n", force: [25, 0, 0] }] })
    .finalize();
  const result = prepareAnalysis(model).solveCase("P");
  const created = createEnvelopeCompatibility(result, [{ component: "tx", entityId: "n" }]);
  expect(created.modelFingerprint).toBe(result.modelFingerprint);
  expect(created.unitSystem).toEqual(result.unitSystem);
  expect(created.conventions).toEqual(result.conventions);
  expect(created.components).toEqual([{ component: "tx", entityId: "n" }]);
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

it.each([null, undefined, 1, "result", []] as unknown[])(
  "FR-SAFE-014: rejects non-object envelope compatibility results as structured errors",
  (result) => {
    const error = incompatibleError(() =>
      createEnvelopeCompatibility(result as unknown as StructuralResult, components),
    );
    expect(error.code).toBe("RESULT_INCOMPATIBLE");
    expect(error.context).toMatchObject({
      resultIds: [],
      reason: "missing compatibility metadata",
    });
  },
);

it("FR-SAFE-014: rejects a metadata-only result without an own identifier", () => {
  const result = {
    modelFingerprint: compatibility.modelFingerprint,
    unitSystem,
    conventions,
  } as unknown as StructuralResult;
  const error = incompatibleError(() => createEnvelopeCompatibility(result, components));
  expect(error.code).toBe("RESULT_INCOMPATIBLE");
  expect(error.context).toMatchObject({
    resultIds: [],
    reason: "missing compatibility metadata",
  });
});

it("FR-SAFE-014: rejects a revoked result proxy as a structured error", () => {
  const { proxy, revoke } = Proxy.revocable(
    {
      id: "RESULT",
      modelFingerprint: compatibility.modelFingerprint,
      unitSystem,
      conventions,
    },
    {},
  );
  revoke();
  const error = incompatibleError(() =>
    createEnvelopeCompatibility(proxy as unknown as StructuralResult, components),
  );
  expect(error.code).toBe("RESULT_INCOMPATIBLE");
  expect(error.context).toMatchObject({
    resultIds: [],
    reason: "missing compatibility metadata",
  });
});

it.each(["id", "modelFingerprint", "unitSystem", "conventions"] as const)(
  "FR-SAFE-014: maps a throwing result %s getter to missing compatibility metadata",
  (throwingField) => {
    const result = Object.defineProperties(
      {},
      {
        id: {
          enumerable: true,
          get(): string {
            if (throwingField === "id") throw new Error("result id trap");
            return "RESULT";
          },
        },
        modelFingerprint: {
          enumerable: true,
          get(): string {
            if (throwingField === "modelFingerprint") throw new Error("fingerprint trap");
            return compatibility.modelFingerprint;
          },
        },
        unitSystem: {
          enumerable: true,
          get(): UnitSystem {
            if (throwingField === "unitSystem") throw new Error("unit trap");
            return unitSystem;
          },
        },
        conventions: {
          enumerable: true,
          get(): ResultConventions {
            if (throwingField === "conventions") throw new Error("conventions trap");
            return conventions;
          },
        },
      },
    ) as unknown as StructuralResult;
    const error = incompatibleError(() => createEnvelopeCompatibility(result, components));
    expect(error.code).toBe("RESULT_INCOMPATIBLE");
    expect(error.context).toMatchObject({
      reason: "missing compatibility metadata",
    });
  },
);

it("FR-SAFE-014: captures each own result metadata getter once", () => {
  const reads = {
    id: 0,
    modelFingerprint: 0,
    unitSystem: 0,
    conventions: 0,
  };
  const result = Object.defineProperties(
    {},
    {
      id: {
        enumerable: true,
        get(): string {
          reads.id += 1;
          return "RESULT";
        },
      },
      modelFingerprint: {
        enumerable: true,
        get(): string {
          reads.modelFingerprint += 1;
          return compatibility.modelFingerprint;
        },
      },
      unitSystem: {
        enumerable: true,
        get(): UnitSystem {
          reads.unitSystem += 1;
          return unitSystem;
        },
      },
      conventions: {
        enumerable: true,
        get(): ResultConventions {
          reads.conventions += 1;
          return conventions;
        },
      },
    },
  ) as unknown as StructuralResult;
  const created = createEnvelopeCompatibility(result, components);
  expect(created.modelFingerprint).toBe(compatibility.modelFingerprint);
  expect(reads).toEqual({ id: 1, modelFingerprint: 1, unitSystem: 1, conventions: 1 });
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
    id: "RESULT",
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
    id: "RESULT",
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
      id: "RESULT",
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

it("FR-SAFE-014: revalidates a compatibility object that mutates and freezes during capture", () => {
  const fingerprintA = compatibility.modelFingerprint;
  const fingerprintB = "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
  const stateful = {
    get modelFingerprint(): string {
      Object.defineProperty(this, "modelFingerprint", {
        configurable: false,
        enumerable: true,
        value: fingerprintB,
        writable: false,
      });
      Object.freeze(this);
      return fingerprintA;
    },
    unitSystem: compatibility.unitSystem,
    conventions: compatibility.conventions,
    components: compatibility.components,
  } as unknown as EnvelopeCompatibility;
  let valuesRead = false;
  const second = {
    resultId: "OTHER",
    resultKind: "case" as const,
    compatibility: stateful,
    get values(): readonly number[] {
      valuesRead = true;
      return [2, 3];
    },
  };
  const error = incompatibleError(() =>
    streamEnvelope(
      [{ resultId: "BASE", resultKind: "case", compatibility: stateful, values: [1, 2] }, second],
      components,
    ),
  );
  expect(error.code).toBe("RESULT_INCOMPATIBLE");
  expect(error.context).toMatchObject({ reason: "model fingerprints differ" });
  expect(valuesRead).toBe(false);
});

it("FR-SAFE-014: revalidates a frozen component after its prototype gains location", () => {
  const prototype: { location?: number } = {};
  const mutableComponent = Object.freeze(
    Object.create(prototype, {
      component: { enumerable: true, value: "tx" },
      entityId: { enumerable: true, value: "n1" },
    }),
  ) as EnvelopeComponent;
  const statefulCompatibility = Object.freeze({
    ...compatibility,
    components: Object.freeze([mutableComponent, compatibility.components[1]!]),
  });
  let valuesRead = false;
  const records = (function* () {
    yield {
      resultId: "BASE",
      resultKind: "case" as const,
      compatibility: statefulCompatibility,
      values: [1, 2],
    };
    prototype.location = 0;
    yield {
      resultId: "OTHER",
      resultKind: "case" as const,
      compatibility: statefulCompatibility,
      get values(): readonly number[] {
        valuesRead = true;
        return [2, 3];
      },
    };
  })();
  const error = incompatibleError(() => streamEnvelope(records, components));
  expect(error.code).toBe("RESULT_INCOMPATIBLE");
  expect(error.context).toMatchObject({ reason: "component layouts differ" });
  expect(valuesRead).toBe(false);
});

it.each([null, 1, "record", []] as unknown[])(
  "FR-SAFE-014: maps a non-object record to a structured malformed record error",
  (record) => {
    const error = incompatibleError(() =>
      streamEnvelope([record as unknown as EnvelopeInputRecord], components),
    );
    expect(error.code).toBe("RESULT_INCOMPATIBLE");
    expect(error.context).toMatchObject({ reason: "malformed record" });
  },
);

it("FR-SAFE-014: maps revoked record proxies without reading values", () => {
  let valuesRead = false;
  const { proxy, revoke } = Proxy.revocable(
    {
      resultId: "REVOKED",
      resultKind: "case",
      compatibility,
      get values(): readonly number[] {
        valuesRead = true;
        return [1, 2];
      },
    },
    {},
  );
  revoke();
  const error = incompatibleError(() =>
    streamEnvelope([proxy as unknown as EnvelopeInputRecord], components),
  );
  expect(error.code).toBe("RESULT_INCOMPATIBLE");
  expect(error.context).toMatchObject({ reason: "malformed record" });
  expect(valuesRead).toBe(false);
});

it("FR-SAFE-014: maps throwing record metadata accessors and reads each metadata field once", () => {
  let resultIdReads = 0;
  let resultKindReads = 0;
  let compatibilityReads = 0;
  let valuesRead = false;
  const record = Object.defineProperties(
    {},
    {
      resultId: {
        enumerable: true,
        get(): string {
          resultIdReads += 1;
          return "OTHER";
        },
      },
      resultKind: {
        enumerable: true,
        get(): "case" {
          resultKindReads += 1;
          return "case";
        },
      },
      compatibility: {
        enumerable: true,
        get(): EnvelopeCompatibility {
          compatibilityReads += 1;
          return compatible({
            modelFingerprint:
              "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
          });
        },
      },
      values: {
        enumerable: true,
        get(): readonly number[] {
          valuesRead = true;
          return [1, 2];
        },
      },
    },
  ) as EnvelopeInputRecord;
  const error = incompatibleError(() => streamEnvelope([baseRecord, record], components));
  expect(error.code).toBe("RESULT_INCOMPATIBLE");
  expect(error.context).toMatchObject({ reason: "model fingerprints differ" });
  expect(resultIdReads).toBe(1);
  expect(resultKindReads).toBe(1);
  expect(compatibilityReads).toBe(1);
  expect(valuesRead).toBe(false);
});

it("FR-SAFE-014: maps a throwing resultId accessor before reading values", () => {
  let valuesRead = false;
  const record = {
    get resultId(): string {
      throw new Error("result id trap");
    },
    resultKind: "case" as const,
    compatibility,
    get values(): readonly number[] {
      valuesRead = true;
      return [1, 2];
    },
  } as EnvelopeInputRecord;
  const error = incompatibleError(() => streamEnvelope([record], components));
  expect(error.code).toBe("RESULT_INCOMPATIBLE");
  expect(error.context).toMatchObject({ reason: "malformed record" });
  expect(valuesRead).toBe(false);
});

it("FR-SAFE-014: maps a throwing compatibility accessor before reading values", () => {
  let valuesRead = false;
  const record = {
    resultId: "BROKEN",
    resultKind: "case" as const,
    get compatibility(): EnvelopeCompatibility {
      throw new Error("compatibility trap");
    },
    get values(): readonly number[] {
      valuesRead = true;
      return [1, 2];
    },
  };
  const error = incompatibleError(() => streamEnvelope([record], components));
  expect(error.code).toBe("RESULT_INCOMPATIBLE");
  expect(error.context).toMatchObject({ reason: "missing compatibility metadata" });
  expect(valuesRead).toBe(false);
});

it("FR-SAFE-014: maps a throwing metadata accessor before reading values", () => {
  let valuesRead = false;
  const record = {
    resultId: "BROKEN",
    resultKind: "case" as const,
    compatibility: {
      ...compatibility,
      unitSystem: {
        ...unitSystem,
        get length(): string {
          throw new Error("unit trap");
        },
      },
    },
    get values(): readonly number[] {
      valuesRead = true;
      return [1, 2];
    },
  } as unknown as EnvelopeInputRecord;
  const error = incompatibleError(() => streamEnvelope([record], components));
  expect(error.code).toBe("RESULT_INCOMPATIBLE");
  expect(error.context).toMatchObject({ reason: "missing compatibility metadata" });
  expect(valuesRead).toBe(false);
});

it("FR-SAFE-014: maps a throwing supplied component index before reading values", () => {
  let valuesRead = false;
  const supplied = new Proxy([...components], {
    get(target, property, receiver) {
      if (property === "0") throw new Error("component index trap");
      return Reflect.get(target, property, receiver);
    },
  });
  const record = {
    ...baseRecord,
    get values(): readonly number[] {
      valuesRead = true;
      return [1, 2];
    },
  };
  const error = incompatibleError(() =>
    streamEnvelope([record], supplied as readonly EnvelopeComponent[]),
  );
  expect(error.code).toBe("RESULT_INCOMPATIBLE");
  expect(error.context).toMatchObject({ reason: "component layout is invalid" });
  expect(valuesRead).toBe(false);
});

it("FR-SAFE-014: maps a throwing component field accessor before reading values", () => {
  let valuesRead = false;
  const throwingComponent = {
    get component(): string {
      throw new Error("component field trap");
    },
    entityId: "n1",
  } as unknown as EnvelopeComponent;
  const record = {
    ...baseRecord,
    get values(): readonly number[] {
      valuesRead = true;
      return [1, 2];
    },
  };
  const error = incompatibleError(() =>
    streamEnvelope([record], [throwingComponent, components[1]]),
  );
  expect(error.code).toBe("RESULT_INCOMPATIBLE");
  expect(error.context).toMatchObject({ reason: "component layout is invalid" });
  expect(valuesRead).toBe(false);
});

it.each(["ownKeys", "hasOwn"] as const)(
  "FR-SAFE-014: maps a metadata proxy %s trap before reading values",
  (trap) => {
    let valuesRead = false;
    const metadata = new Proxy(compatibility, {
      ownKeys(target) {
        if (trap === "ownKeys") throw new Error("ownKeys trap");
        return Reflect.ownKeys(target);
      },
      getOwnPropertyDescriptor(target, property) {
        if (trap === "hasOwn" && property === "modelFingerprint") {
          throw new Error("hasOwn trap");
        }
        return Reflect.getOwnPropertyDescriptor(target, property);
      },
    });
    const record = {
      ...baseRecord,
      compatibility: metadata,
      get values(): readonly number[] {
        valuesRead = true;
        return [1, 2];
      },
    } as unknown as EnvelopeInputRecord;
    const error = incompatibleError(() => streamEnvelope([record], components));
    expect(error.code).toBe("RESULT_INCOMPATIBLE");
    expect(error.context).toMatchObject({ reason: "missing compatibility metadata" });
    expect(valuesRead).toBe(false);
  },
);
