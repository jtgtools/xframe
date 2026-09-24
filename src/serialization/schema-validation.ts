import { XFrameError } from "../errors/xframe-error.js";
import { UNIT_SYSTEM_VERSION, type UnitSystem } from "../units/unit-system.js";

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

export function schemaError(
  path: string,
  expected: string,
  actual?: unknown,
  code: "SCHEMA_INVALID" | "SCHEMA_UNSUPPORTED" = "SCHEMA_INVALID",
  schemaVersion?: string,
  options: { readonly cause?: unknown } = {},
): never {
  throw new XFrameError(
    code,
    code === "SCHEMA_UNSUPPORTED"
      ? "JSON schema version is unsupported."
      : "JSON schema validation failed.",
    {
      kind: "schema",
      path,
      expected,
      ...(actual === undefined ? {} : { actual: describe(actual) }),
      ...(schemaVersion === undefined ? {} : { schemaVersion }),
    },
    options.cause === undefined ? undefined : { cause: options.cause },
  );
}

function describe(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return `array(length=${value.length})`;
  if (typeof value === "number" && !Number.isFinite(value)) return String(value);
  return typeof value === "object"
    ? `object(keys=${Object.keys(value as object)
        .toSorted()
        .join(",")})`
    : String(value);
}

export function parseJsonValue(input: unknown): unknown {
  if (typeof input !== "string") return input;
  try {
    return JSON.parse(input) as unknown;
  } catch (error) {
    schemaError(
      "$",
      "valid JSON text",
      error instanceof Error ? error.message : String(error),
      "SCHEMA_INVALID",
      undefined,
      { cause: error },
    );
  }
}

export function objectAt(
  value: unknown,
  path: string,
  allowed: readonly string[],
  required: readonly string[] = allowed,
): Readonly<Record<string, unknown>> {
  if (value === null || typeof value !== "object" || Array.isArray(value))
    schemaError(path, "object", value);
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null)
    schemaError(path, "plain object", value);
  const record = value as Readonly<Record<string, unknown>>;
  const allowedSet = new Set(allowed);
  for (const key of Object.keys(record))
    if (!allowedSet.has(key)) schemaError(`${path}.${key}`, "no additional property", key);
  for (const key of required)
    if (!Object.hasOwn(record, key) || record[key] === undefined)
      schemaError(`${path}.${key}`, "required property", record[key]);
  return record;
}

export function arrayAt(value: unknown, path: string): readonly unknown[] {
  if (!Array.isArray(value)) schemaError(path, "array", value);
  return value;
}

export function stringAt(value: unknown, path: string): string {
  if (typeof value !== "string") schemaError(path, "string", value);
  return value;
}

export function literalAt<T extends string>(value: unknown, path: string, values: readonly T[]): T {
  if (typeof value !== "string" || !values.includes(value as T))
    schemaError(path, values.join(" | "), value);
  return value as T;
}

export function finiteAt(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isFinite(value))
    schemaError(path, "finite number", value);
  return Object.is(value, -0) ? 0 : value;
}

export function integerAt(value: unknown, path: string, minimum = Number.MIN_SAFE_INTEGER): number {
  const number = finiteAt(value, path);
  if (!Number.isSafeInteger(number) || number < minimum)
    schemaError(path, `safe integer >= ${minimum}`, value);
  return number;
}

export function booleanAt(value: unknown, path: string): boolean {
  if (typeof value !== "boolean") schemaError(path, "boolean", value);
  return value;
}

export function tupleAt(value: unknown, path: string, length: number): readonly unknown[] {
  const array = arrayAt(value, path);
  if (array.length !== length) schemaError(path, `array of exactly ${length} items`, value);
  return array;
}

export function finiteVector(value: unknown, path: string, length: number): readonly number[] {
  return Object.freeze(
    tupleAt(value, path, length).map((entry, index) => finiteAt(entry, `${path}[${index}]`)),
  );
}

export function unitSystemAt(value: unknown, path: string): UnitSystem {
  const record = objectAt(value, path, UNIT_SYSTEM_KEYS);
  literalAt(record["version"], `${path}.version`, [UNIT_SYSTEM_VERSION]);
  for (const key of UNIT_SYSTEM_KEYS.slice(1, -1)) {
    const label = stringAt(record[key], `${path}.${key}`);
    if (label.length === 0) schemaError(`${path}.${key}`, "nonempty string", label);
  }
  literalAt(record["rotation"], `${path}.rotation`, ["rad"]);
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

export function deepFreezeCopy<T>(value: T, path = "$", seen = new Set<object>()): T {
  if (typeof value === "number") return finiteAt(value, path) as T;
  if (value === null || typeof value !== "object") {
    if (
      value === undefined ||
      typeof value === "bigint" ||
      typeof value === "function" ||
      typeof value === "symbol"
    ) {
      schemaError(path, "JSON-compatible value", value);
    }
    return value;
  }
  if (seen.has(value)) schemaError(path, "acyclic JSON-compatible value", "cycle");
  seen.add(value);
  if (Array.isArray(value)) {
    const result = value.map((entry, index) => deepFreezeCopy(entry, `${path}[${index}]`, seen));
    seen.delete(value);
    return Object.freeze(result) as T;
  }
  const record = objectAt(value, path, Object.keys(value as object), []);
  const copy: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
  for (const key of Object.keys(record))
    copy[key] = deepFreezeCopy(record[key], `${path}.${key}`, seen);
  seen.delete(value);
  return Object.freeze(copy) as T;
}
