import { XFrameError } from "../errors/xframe-error.js";
import { parseIdentifier } from "../model/identifier.js";
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

type MetadataRecord = Readonly<Record<string, unknown>>;

function incompatible(resultIds: readonly string[], reason: string): never {
  throw new XFrameError("RESULT_INCOMPATIBLE", "Envelope input is incompatible.", {
    kind: "result",
    resultIds: Object.freeze([...resultIds]),
    reason,
  });
}

function isRecord(value: unknown): value is MetadataRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasExactKeys(value: MetadataRecord, keys: readonly string[]): boolean {
  const actual = Object.keys(value);
  if (actual.length !== keys.length) return false;
  for (const key of keys) if (!Object.hasOwn(value, key)) return false;
  return true;
}

function normalizeComponents(
  input: unknown,
  resultIds: readonly string[],
  invalidReason = "component layout is invalid",
): readonly EnvelopeComponent[] {
  if (!Array.isArray(input)) incompatible(resultIds, invalidReason);
  return Object.freeze(
    input.map((component, index) => {
      if (
        !isRecord(component) ||
        typeof component["component"] !== "string" ||
        component["component"].length === 0
      ) {
        incompatible(resultIds, invalidReason);
      }
      const entityId = parseIdentifier(
        component["entityId"],
        `envelope.components[${index}].entityId`,
      );
      if (
        component["location"] !== undefined &&
        (typeof component["location"] !== "number" || !Number.isFinite(component["location"]))
      ) {
        incompatible(resultIds, invalidReason);
      }
      return Object.freeze({
        component: component["component"],
        entityId,
        ...(component["location"] === undefined
          ? {}
          : { location: Object.is(component["location"], -0) ? 0 : component["location"] }),
      });
    }),
  );
}

function normalizeUnitSystem(value: unknown, resultIds: readonly string[]): UnitSystem {
  if (!isRecord(value) || !hasExactKeys(value, UNIT_SYSTEM_KEYS))
    incompatible(resultIds, "missing compatibility metadata");
  if (value["version"] !== "1" || value["rotation"] !== "rad")
    incompatible(resultIds, "missing compatibility metadata");
  for (const key of UNIT_SYSTEM_KEYS.slice(1, -1)) {
    if (typeof value[key] !== "string" || value[key]!.length === 0)
      incompatible(resultIds, "missing compatibility metadata");
  }
  return Object.freeze({
    version: "1",
    length: value["length"] as string,
    force: value["force"] as string,
    moment: value["moment"] as string,
    modulus: value["modulus"] as string,
    distributedForce: value["distributedForce"] as string,
    density: value["density"] as string,
    rotation: "rad",
  });
}

function normalizeConventions(value: unknown, resultIds: readonly string[]): ResultConventions {
  if (!isRecord(value) || !hasExactKeys(value, CONVENTION_KEYS))
    incompatible(resultIds, "missing compatibility metadata");
  for (const key of CONVENTION_KEYS) {
    if (typeof value[key] !== "string" || value[key]!.length === 0)
      incompatible(resultIds, "missing compatibility metadata");
  }
  return Object.freeze({
    coordinateSystem: value["coordinateSystem"] as ResultConventions["coordinateSystem"],
    rotations: value["rotations"] as ResultConventions["rotations"],
    frameEndForces: value["frameEndForces"] as ResultConventions["frameEndForces"],
    internalForces: value["internalForces"] as ResultConventions["internalForces"],
  });
}

function normalizeCompatibility(
  value: unknown,
  resultIds: readonly string[],
): EnvelopeCompatibility {
  if (!isRecord(value)) incompatible(resultIds, "missing compatibility metadata");
  for (const key of COMPATIBILITY_KEYS)
    if (!Object.hasOwn(value, key)) incompatible(resultIds, "missing compatibility metadata");
  if (typeof value["modelFingerprint"] !== "string" || value["modelFingerprint"].length === 0)
    incompatible(resultIds, "missing compatibility metadata");
  return Object.freeze({
    modelFingerprint: value["modelFingerprint"],
    unitSystem: normalizeUnitSystem(value["unitSystem"], resultIds),
    conventions: normalizeConventions(value["conventions"], resultIds),
    components: normalizeComponents(
      value["components"],
      resultIds,
      "missing compatibility metadata",
    ),
  });
}

function sameUnitSystem(value: unknown, expected: UnitSystem): boolean {
  if (!isRecord(value) || !hasExactKeys(value, UNIT_SYSTEM_KEYS)) return false;
  for (const key of UNIT_SYSTEM_KEYS) if (value[key] !== expected[key]) return false;
  return true;
}

function sameConventions(value: unknown, expected: ResultConventions): boolean {
  if (!isRecord(value) || !hasExactKeys(value, CONVENTION_KEYS)) return false;
  for (const key of CONVENTION_KEYS) if (value[key] !== expected[key]) return false;
  return true;
}

function normalizedIdentifier(value: unknown, path: string): string | undefined {
  if (typeof value !== "string") return undefined;
  try {
    return parseIdentifier(value, path);
  } catch {
    return undefined;
  }
}

function sameComponents(value: unknown, expected: readonly EnvelopeComponent[]): boolean {
  if (!Array.isArray(value) || value.length !== expected.length) return false;
  for (let index = 0; index < expected.length; index += 1) {
    const actual = value[index];
    const wanted = expected[index]!;
    if (!isRecord(actual) || actual["component"] !== wanted.component) return false;
    if (
      normalizedIdentifier(
        actual["entityId"],
        `envelope.compatibility.components[${index}].entityId`,
      ) !== wanted.entityId
    )
      return false;
    if (wanted.location === undefined) {
      if (actual["location"] !== undefined) return false;
    } else if (
      typeof actual["location"] !== "number" ||
      !Number.isFinite(actual["location"]) ||
      (Object.is(actual["location"], -0) ? 0 : actual["location"]) !== wanted.location
    ) {
      return false;
    }
  }
  return true;
}

function assertCompatibility(
  value: unknown,
  expected: EnvelopeCompatibility,
  resultIds: readonly string[],
): void {
  if (!isRecord(value)) incompatible(resultIds, "missing compatibility metadata");
  for (const key of COMPATIBILITY_KEYS)
    if (!Object.hasOwn(value, key)) incompatible(resultIds, "missing compatibility metadata");
  if (value["modelFingerprint"] !== expected.modelFingerprint)
    incompatible(resultIds, "model fingerprints differ");
  if (!sameUnitSystem(value["unitSystem"], expected.unitSystem))
    incompatible(resultIds, "unit systems differ");
  if (!sameConventions(value["conventions"], expected.conventions))
    incompatible(resultIds, "result conventions differ");
  if (!sameComponents(value["components"], expected.components))
    incompatible(resultIds, "component layouts differ");
}

function normalized(value: number, resultId: string, index: number): number {
  if (!Number.isFinite(value)) incompatible([resultId], `nonfinite value at index ${index}`);
  return Object.is(value, -0) ? 0 : value;
}

function governor(
  record: EnvelopeInputRecord,
  component: EnvelopeComponent,
  extremum: "minimum" | "maximum",
): EnvelopeGoverning {
  return Object.freeze({
    resultId: parseIdentifier(record.resultId, "envelope.resultId"),
    resultKind: record.resultKind,
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
  if (typeof result.modelFingerprint !== "string" || result.modelFingerprint.length === 0)
    incompatible(resultIds, "missing compatibility metadata");
  return Object.freeze({
    modelFingerprint: result.modelFingerprint,
    unitSystem: normalizeUnitSystem(result.unitSystem, resultIds),
    conventions: normalizeConventions(result.conventions, resultIds),
    components: normalizeComponents(components, resultIds),
  });
}

export function streamEnvelope(
  records: Iterable<EnvelopeInputRecord>,
  componentsInput: readonly EnvelopeComponent[],
): StreamingEnvelope {
  if (componentsInput.length === 0) incompatible([], "at least one component is required");
  const components = normalizeComponents(componentsInput, [], "component layout is invalid");
  const seen = new Set<string>();
  const minimum: { value: number; governing: EnvelopeGoverning[] }[] = [];
  const maximum: { value: number; governing: EnvelopeGoverning[] }[] = [];
  let firstCompatibility: EnvelopeCompatibility | undefined;
  let count = 0;
  for (const record of records) {
    const resultId = parseIdentifier(record.resultId, "envelope.resultId");
    if (record.resultKind !== "case" && record.resultKind !== "combination") {
      incompatible([resultId], "resultKind must be case or combination");
    }
    if (count === 0) {
      firstCompatibility = normalizeCompatibility(record.compatibility, [resultId]);
      if (!sameComponents(firstCompatibility.components, components))
        incompatible([resultId], "component layout differs from supplied components");
    } else {
      assertCompatibility(record.compatibility, firstCompatibility!, [resultId]);
    }
    if (seen.has(resultId)) incompatible([resultId], "duplicate result identifier");
    seen.add(resultId);
    if (record.values.length !== components.length) {
      incompatible(
        [resultId],
        `expected ${components.length} values, received ${record.values.length}`,
      );
    }
    for (let index = 0; index < components.length; index += 1) {
      const value = normalized(record.values[index]!, resultId, index);
      if (count === 0) {
        minimum.push({ value, governing: [governor(record, components[index]!, "minimum")] });
        maximum.push({ value, governing: [governor(record, components[index]!, "maximum")] });
        continue;
      }
      if (value < minimum[index]!.value) {
        minimum[index] = { value, governing: [governor(record, components[index]!, "minimum")] };
      } else if (value === minimum[index]!.value) {
        minimum[index]!.governing.push(governor(record, components[index]!, "minimum"));
      }
      if (value > maximum[index]!.value) {
        maximum[index] = { value, governing: [governor(record, components[index]!, "maximum")] };
      } else if (value === maximum[index]!.value) {
        maximum[index]!.governing.push(governor(record, components[index]!, "maximum"));
      }
    }
    count += 1;
  }
  if (count === 0) incompatible([], "empty source");
  return Object.freeze({ count, components, minimum: frozen(minimum), maximum: frozen(maximum) });
}
