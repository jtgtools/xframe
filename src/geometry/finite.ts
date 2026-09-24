import { XFrameError } from "../errors/xframe-error.js";

/**
 * Validates a finite number. Negative zero is normalized to +0 so canonical
 * JSON, fingerprints, and result equality are stable across runtimes
 * (-0 serializes as 0 and Object.is(-0, 0) is false).
 */
export function finiteNumber(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new XFrameError("NON_FINITE_VALUE", `Expected a finite number at ${path}.`, {
      kind: "numeric",
      path,
      value: String(value),
      expected: "finite number",
    });
  }
  return Object.is(value, -0) ? 0 : value;
}

export function finiteFloat64Array(values: ArrayLike<unknown>, path: string): Float64Array {
  const result = new Float64Array(values.length);
  for (let index = 0; index < values.length; index += 1) {
    result[index] = finiteNumber(values[index], `${path}[${index}]`);
  }
  return result;
}

export function assertFiniteFloat64Array(values: ArrayLike<unknown>, path: string): void {
  for (let index = 0; index < values.length; index += 1) {
    finiteNumber(values[index], `${path}[${index}]`);
  }
}
