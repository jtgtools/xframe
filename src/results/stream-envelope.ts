import { XFrameError } from "../errors/xframe-error.js";
import { parseIdentifier, type EntityId } from "../model/identifier.js";
import type { ResultConventions, StructuralResult } from "./result-types.js";
import type {
  EnvelopeCompatibility,
  EnvelopeComponent,
  EnvelopeExtreme,
  EnvelopeGoverning,
  EnvelopeInputRecord,
  StreamingEnvelope,
} from "./result-types.js";
import type { UnitSystem } from "../units/unit-system.js";

const UNIT_SYSTEM_KEYS = [
  "version",
  "length",
  "force",
  "moment",
  "modulus",
  "distributedForce",
  "density",
  "rotation",
] as const;
const CONVENTION_KEYS = [
  "coordinateSystem",
  "rotations",
  "frameEndForces",
  "internalForces",
] as const;
const COMPATIBILITY_KEYS = ["modelFingerprint", "unitSystem", "conventions", "components"] as const;
const MODEL_FINGERPRINT = /^sha256:[0-9a-f]{64}$/u;

type MetadataRecord = Readonly<Record<string, unknown>>;
type CapturedMetadata = Record<string, unknown>;

type RecordMetadata = {
  readonly resultId: EntityId;
  readonly resultKind: StructuralResult["kind"];
  readonly compatibility: unknown;
};

function incompatible(resultIds: readonly string[], reason: string): never {
  throw new XFrameError("RESULT_INCOMPATIBLE", "Envelope input is incompatible.", {
    kind: "result",
    resultIds: Object.freeze([...resultIds]),
    reason,
  });
}

function isRecord(value: unknown): value is MetadataRecord {
  if (value === null || typeof value !== "object") return false;
  try {
    return !Array.isArray(value);
  } catch {
    return false;
  }
}

function hasExactKeys(value: MetadataRecord, keys: readonly string[]): boolean {
  try {
    const actual = Reflect.ownKeys(value);
    if (actual.length !== keys.length) return false;
    for (const key of actual) if (typeof key !== "string" || !keys.includes(key)) return false;
    for (const key of keys) if (!Object.hasOwn(value, key)) return false;
    return true;
  } catch {
    return false;
  }
}

function captureMetadata(
  value: unknown,
  keys: readonly string[],
  resultIds: readonly string[],
  invalidReason: string,
): CapturedMetadata {
  if (!isRecord(value) || !hasExactKeys(value, keys)) incompatible(resultIds, invalidReason);
  const captured: CapturedMetadata = Object.create(null) as CapturedMetadata;
  for (const key of keys) {
    try {
      captured[key] = value[key];
    } catch {
      incompatible(resultIds, invalidReason);
    }
  }
  return captured;
}

function normalizeComponents(
  input: unknown,
  resultIds: readonly string[],
  invalidReason = "component layout is invalid",
): readonly EnvelopeComponent[] {
  let array: readonly unknown[];
  try {
    array = Array.isArray(input) ? input : incompatible(resultIds, invalidReason);
  } catch {
    incompatible(resultIds, invalidReason);
  }
  let length: number;
  try {
    length = array.length;
  } catch {
    incompatible(resultIds, invalidReason);
  }
  if (!Number.isSafeInteger(length) || length < 0 || length > 4_294_967_295) {
    incompatible(resultIds, invalidReason);
  }
  const copiedComponents: EnvelopeComponent[] = [];
  copiedComponents.length = length;
  for (let index = 0; index < length; index += 1) {
    let component: unknown;
    try {
      component = array[index];
    } catch {
      incompatible(resultIds, invalidReason);
    }
    if (!isRecord(component)) incompatible(resultIds, invalidReason);

    let hasLocation: boolean;
    let componentName: unknown;
    let entityIdValue: unknown;
    let locationValue: unknown;
    try {
      if (!Object.hasOwn(component, "component") || !Object.hasOwn(component, "entityId")) {
        incompatible(resultIds, invalidReason);
      }
      hasLocation = Object.hasOwn(component, "location");
      if (!hasLocation && "location" in component) incompatible(resultIds, invalidReason);
      componentName = component["component"];
      entityIdValue = component["entityId"];
      locationValue = hasLocation ? component["location"] : undefined;
    } catch {
      incompatible(resultIds, invalidReason);
    }

    if (typeof componentName !== "string" || componentName.length === 0) {
      incompatible(resultIds, invalidReason);
    }

    let entityId: EntityId;
    try {
      entityId = parseIdentifier(entityIdValue, `envelope.components[${index}].entityId`);
    } catch {
      incompatible(resultIds, invalidReason);
    }

    if (
      locationValue !== undefined &&
      (typeof locationValue !== "number" || !Number.isFinite(locationValue))
    ) {
      incompatible(resultIds, invalidReason);
    }
    copiedComponents[index] = Object.freeze({
      component: componentName,
      entityId,
      ...(locationValue === undefined
        ? {}
        : { location: Object.is(locationValue, -0) ? 0 : locationValue }),
    });
  }
  return Object.freeze(copiedComponents);
}

function normalizeUnitSystem(
  value: unknown,
  resultIds: readonly string[],
  invalidReason = "missing compatibility metadata",
): UnitSystem {
  const captured = captureMetadata(value, UNIT_SYSTEM_KEYS, resultIds, invalidReason);
  if (captured["version"] !== "1" || captured["rotation"] !== "rad")
    incompatible(resultIds, invalidReason);
  for (const key of UNIT_SYSTEM_KEYS.slice(1, -1)) {
    const unit = captured[key];
    if (typeof unit !== "string" || unit.length === 0) incompatible(resultIds, invalidReason);
  }
  return Object.freeze({
    version: "1",
    length: captured["length"] as string,
    force: captured["force"] as string,
    moment: captured["moment"] as string,
    modulus: captured["modulus"] as string,
    distributedForce: captured["distributedForce"] as string,
    density: captured["density"] as string,
    rotation: "rad",
  });
}

function normalizeConventions(
  value: unknown,
  resultIds: readonly string[],
  invalidReason = "missing compatibility metadata",
): ResultConventions {
  const captured = captureMetadata(value, CONVENTION_KEYS, resultIds, invalidReason);
  if (
    captured["coordinateSystem"] !== "global-node-local-member" ||
    captured["rotations"] !== "radians-right-hand-rule" ||
    captured["frameEndForces"] !== "element-on-node" ||
    captured["internalForces"] !== "positive-local-cut-face"
  ) {
    incompatible(resultIds, invalidReason);
  }
  return Object.freeze({
    coordinateSystem: "global-node-local-member",
    rotations: "radians-right-hand-rule",
    frameEndForces: "element-on-node",
    internalForces: "positive-local-cut-face",
  });
}

function normalizeCompatibility(
  value: unknown,
  resultIds: readonly string[],
): EnvelopeCompatibility {
  const captured = captureMetadata(
    value,
    COMPATIBILITY_KEYS,
    resultIds,
    "missing compatibility metadata",
  );
  const modelFingerprint = captured["modelFingerprint"];
  if (typeof modelFingerprint !== "string" || !MODEL_FINGERPRINT.test(modelFingerprint)) {
    incompatible(resultIds, "missing compatibility metadata");
  }
  return Object.freeze({
    modelFingerprint,
    unitSystem: normalizeUnitSystem(captured["unitSystem"], resultIds),
    conventions: normalizeConventions(captured["conventions"], resultIds),
    components: normalizeComponents(
      captured["components"],
      resultIds,
      "missing compatibility metadata",
    ),
  });
}

function sameUnitSystem(value: UnitSystem, expected: UnitSystem): boolean {
  for (const key of UNIT_SYSTEM_KEYS) if (value[key] !== expected[key]) return false;
  return true;
}

function sameConventions(value: ResultConventions, expected: ResultConventions): boolean {
  for (const key of CONVENTION_KEYS) if (value[key] !== expected[key]) return false;
  return true;
}

function sameComponents(
  value: readonly EnvelopeComponent[],
  expected: readonly EnvelopeComponent[],
): boolean {
  if (value.length !== expected.length) return false;
  for (let index = 0; index < expected.length; index += 1) {
    const actual = value[index]!;
    const wanted = expected[index]!;
    if (
      actual.component !== wanted.component ||
      actual.entityId !== wanted.entityId ||
      actual.location !== wanted.location
    ) {
      return false;
    }
  }
  return true;
}

function assertCompatibility(
  value: unknown,
  expected: EnvelopeCompatibility,
  suppliedComponents: readonly EnvelopeComponent[],
  resultIds: readonly string[],
): void {
  const captured = captureMetadata(
    value,
    COMPATIBILITY_KEYS,
    resultIds,
    "missing compatibility metadata",
  );
  if (captured["modelFingerprint"] !== expected.modelFingerprint)
    incompatible(resultIds, "model fingerprints differ");
  const unitSystem = normalizeUnitSystem(captured["unitSystem"], resultIds, "unit systems differ");
  if (!sameUnitSystem(unitSystem, expected.unitSystem))
    incompatible(resultIds, "unit systems differ");
  const conventions = normalizeConventions(
    captured["conventions"],
    resultIds,
    "result conventions differ",
  );
  if (!sameConventions(conventions, expected.conventions))
    incompatible(resultIds, "result conventions differ");
  const components = normalizeComponents(
    captured["components"],
    resultIds,
    "component layouts differ",
  );
  if (!sameComponents(components, expected.components))
    incompatible(resultIds, "component layouts differ");
  if (!sameComponents(components, suppliedComponents))
    incompatible(resultIds, "component layouts differ");
}

function captureRecordMetadata(record: EnvelopeInputRecord): RecordMetadata {
  if (!isRecord(record)) incompatible([], "malformed record");

  let resultIdValue: unknown;
  let resultKindValue: unknown;
  let hasCompatibility: boolean;
  try {
    if (!Object.hasOwn(record, "resultId")) incompatible([], "malformed record");
    resultIdValue = record.resultId;
    if (!Object.hasOwn(record, "resultKind")) incompatible([], "malformed record");
    resultKindValue = record.resultKind;
    hasCompatibility = Object.hasOwn(record, "compatibility");
  } catch {
    incompatible([], "malformed record");
  }

  let resultId: EntityId;
  try {
    resultId = parseIdentifier(resultIdValue, "envelope.resultId");
  } catch (error) {
    if (error instanceof XFrameError) throw error;
    incompatible([], "malformed record");
  }
  if (resultKindValue !== "case" && resultKindValue !== "combination") {
    incompatible([resultId], "resultKind must be case or combination");
  }
  if (!hasCompatibility) incompatible([resultId], "missing compatibility metadata");

  let compatibility: unknown;
  try {
    compatibility = record.compatibility;
  } catch {
    incompatible([resultId], "missing compatibility metadata");
  }
  return { resultId, resultKind: resultKindValue, compatibility };
}

function normalized(value: unknown, resultId: string, index: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    incompatible([resultId], `nonfinite value at index ${index}`);
  }
  return Object.is(value, -0) ? 0 : value;
}

function governor(
  resultId: EntityId,
  resultKind: StructuralResult["kind"],
  component: EnvelopeComponent,
  extremum: "minimum" | "maximum",
): EnvelopeGoverning {
  return Object.freeze({
    resultId,
    resultKind,
    component: component.component,
    entityId: component.entityId,
    ...(component.location === undefined ? {} : { location: component.location }),
    extremum,
  });
}

function frozen(
  values: readonly { readonly value: number; readonly governing: readonly EnvelopeGoverning[] }[],
): readonly EnvelopeExtreme[] {
  return Object.freeze(
    values.map(({ value, governing }) =>
      Object.freeze({ value, governing: Object.freeze([...governing]) }),
    ),
  );
}

export function createEnvelopeCompatibility(
  result: StructuralResult,
  components: readonly EnvelopeComponent[],
): EnvelopeCompatibility {
  const resultIds = [result.id];
  const modelFingerprint = result.modelFingerprint;
  if (typeof modelFingerprint !== "string" || !MODEL_FINGERPRINT.test(modelFingerprint)) {
    incompatible(resultIds, "missing compatibility metadata");
  }
  const unitSystem = result.unitSystem;
  const conventions = result.conventions;
  return Object.freeze({
    modelFingerprint,
    unitSystem: normalizeUnitSystem(unitSystem, resultIds),
    conventions: normalizeConventions(conventions, resultIds),
    components: normalizeComponents(components, resultIds),
  });
}

export function streamEnvelope(
  records: Iterable<EnvelopeInputRecord>,
  componentsInput: readonly EnvelopeComponent[],
): StreamingEnvelope {
  const components = normalizeComponents(componentsInput, [], "component layout is invalid");
  if (components.length === 0) incompatible([], "at least one component is required");
  const seen = new Set<string>();
  const minimum: { value: number; governing: EnvelopeGoverning[] }[] = [];
  const maximum: { value: number; governing: EnvelopeGoverning[] }[] = [];
  let firstCompatibility: EnvelopeCompatibility | undefined;
  let count = 0;
  for (const record of records) {
    const metadata = captureRecordMetadata(record);
    if (count === 0) {
      firstCompatibility = normalizeCompatibility(metadata.compatibility, [metadata.resultId]);
      if (!sameComponents(firstCompatibility.components, components))
        incompatible([metadata.resultId], "component layout differs from supplied components");
    } else {
      assertCompatibility(metadata.compatibility, firstCompatibility!, components, [
        metadata.resultId,
      ]);
    }
    if (seen.has(metadata.resultId))
      incompatible([metadata.resultId], "duplicate result identifier");
    seen.add(metadata.resultId);

    let values: ArrayLike<number>;
    try {
      values = record.values;
    } catch {
      incompatible([metadata.resultId], "values are invalid");
    }
    let valuesLength: number;
    try {
      valuesLength = values.length;
    } catch {
      incompatible([metadata.resultId], "values are invalid");
    }
    if (!Number.isSafeInteger(valuesLength) || valuesLength < 0) {
      incompatible([metadata.resultId], "values are invalid");
    }
    if (valuesLength !== components.length) {
      incompatible(
        [metadata.resultId],
        `expected ${components.length} values, received ${valuesLength}`,
      );
    }
    for (let index = 0; index < components.length; index += 1) {
      let rawValue: unknown;
      try {
        rawValue = values[index];
      } catch {
        incompatible([metadata.resultId], `nonfinite value at index ${index}`);
      }
      const value = normalized(rawValue, metadata.resultId, index);
      if (count === 0) {
        minimum.push({
          value,
          governing: [
            governor(metadata.resultId, metadata.resultKind, components[index]!, "minimum"),
          ],
        });
        maximum.push({
          value,
          governing: [
            governor(metadata.resultId, metadata.resultKind, components[index]!, "maximum"),
          ],
        });
        continue;
      }
      if (value < minimum[index]!.value) {
        minimum[index] = {
          value,
          governing: [
            governor(metadata.resultId, metadata.resultKind, components[index]!, "minimum"),
          ],
        };
      } else if (value === minimum[index]!.value) {
        minimum[index]!.governing.push(
          governor(metadata.resultId, metadata.resultKind, components[index]!, "minimum"),
        );
      }
      if (value > maximum[index]!.value) {
        maximum[index] = {
          value,
          governing: [
            governor(metadata.resultId, metadata.resultKind, components[index]!, "maximum"),
          ],
        };
      } else if (value === maximum[index]!.value) {
        maximum[index]!.governing.push(
          governor(metadata.resultId, metadata.resultKind, components[index]!, "maximum"),
        );
      }
    }
    count += 1;
  }
  if (count === 0) incompatible([], "empty source");
  return Object.freeze({ count, components, minimum: frozen(minimum), maximum: frozen(maximum) });
}
