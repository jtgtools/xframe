import { XFrameError } from "../errors/xframe-error.js";

function invalid(path: string, actual: unknown): never {
  throw new XFrameError("SCHEMA_INVALID", "Value cannot be represented as canonical JSON.", {
    kind: "schema",
    path,
    expected: "finite acyclic JSON value without undefined",
    actual: actual === null ? "null" : String(actual),
  });
}

function canonical(value: unknown, path: string, seen: Set<object>): unknown {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) invalid(path, value);
    return Object.is(value, -0) ? 0 : value;
  }
  if (typeof value !== "object") invalid(path, value);
  if (seen.has(value)) invalid(path, "cycle");
  seen.add(value);
  if (Array.isArray(value)) {
    const result = value.map((entry, index) => canonical(entry, `${path}[${index}]`, seen));
    seen.delete(value);
    return result;
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) invalid(path, "non-plain object");
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(value as object).toSorted()) {
    const entry = (value as Readonly<Record<string, unknown>>)[key];
    if (entry === undefined) invalid(`${path}.${key}`, entry);
    result[key] = canonical(entry, `${path}.${key}`, seen);
  }
  seen.delete(value);
  return result;
}

/** Serializes finite JSON data with lexicographically sorted object keys and normalized negative zero. */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonical(value, "$", new Set()));
}
