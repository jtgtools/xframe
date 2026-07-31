import { XFrameError } from "../errors/xframe-error.js";

export const UNIT_SYSTEM_VERSION = "1" as const;

const UNIT_KEYS = [
  "version",
  "length",
  "force",
  "moment",
  "modulus",
  "distributedForce",
  "density",
  "rotation",
] as const;

export interface UnitSystem {
  readonly version: typeof UNIT_SYSTEM_VERSION;
  readonly length: string;
  readonly force: string;
  readonly moment: string;
  readonly modulus: string;
  readonly distributedForce: string;
  readonly density: string;
  readonly rotation: "rad";
}

function unitsError(reason: string, actual?: string, actualKeys?: readonly string[]): never {
  throw new XFrameError("UNITS_INVALID", "Unit-system metadata is invalid.", {
    kind: "units",
    path: "units",
    reason,
    expectedKeys: UNIT_KEYS,
    ...(actualKeys === undefined ? {} : { actualKeys }),
    ...(actual === undefined ? {} : { actual }),
  });
}

export function parseUnitSystem(value: unknown): UnitSystem {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    unitsError("expected an object", value === null ? "null" : typeof value);
  }

  const record = value as Readonly<Record<string, unknown>>;
  const actualKeys = Object.keys(record).sort();
  const expectedKeys = [...UNIT_KEYS].sort();
  if (actualKeys.length !== expectedKeys.length || actualKeys.some((key, index) => key !== expectedKeys[index])) {
    unitsError("keys must match the exact version-one schema", undefined, actualKeys);
  }

  if (record["version"] !== UNIT_SYSTEM_VERSION) {
    unitsError("unsupported unit-system version", String(record["version"]));
  }

  for (const key of UNIT_KEYS.slice(1)) {
    const entry = record[key];
    if (typeof entry !== "string" || entry.length === 0) {
      unitsError(`unit label ${key} must be a non-empty string`, String(entry));
    }
  }

  if (record["rotation"] !== "rad") {
    unitsError("rotation must be rad", String(record["rotation"]));
  }

  return Object.freeze({
    version: UNIT_SYSTEM_VERSION,
    length: record["length"] as string,
    force: record["force"] as string,
    moment: record["moment"] as string,
    modulus: record["modulus"] as string,
    distributedForce: record["distributedForce"] as string,
    density: record["density"] as string,
    rotation: "rad",
  });
}
