import { XFrameError } from "../errors/xframe-error.js";
import type { LoadVector } from "./load-types.js";

export function loadError(path: string, expected: string, actual: unknown): never {
  throw new XFrameError("LOAD_INVALID", "Load data is invalid.", {
    kind: "input",
    path,
    expected,
    actual: String(actual),
  });
}

export function exactObjectKeys(value: object, allowed: ReadonlySet<string>, path: string): void {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) loadError(`${path}.${key}`, "recognized load property", key);
  }
}

export function vector3(value: unknown, path: string): LoadVector {
  if (!Array.isArray(value) || value.length !== 3) loadError(path, "array of exactly three finite numbers", Array.isArray(value) ? value.length : typeof value);
  const entries = value.map((entry, index) => {
    if (typeof entry !== "number" || !Number.isFinite(entry)) loadError(`${path}[${index}]`, "finite number", entry);
    return Object.is(entry, -0) ? 0 : entry;
  });
  return Object.freeze(entries) as LoadVector;
}

export function nonzero(value: LoadVector): boolean {
  return value.some((entry) => entry !== 0);
}

export function coordinateSystem(value: unknown, path: string): "local" | "global" {
  if (value !== "local" && value !== "global") loadError(path, "local or global", value);
  return value;
}

export function finite(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) loadError(path, "finite number", value);
  return Object.is(value, -0) ? 0 : value;
}
