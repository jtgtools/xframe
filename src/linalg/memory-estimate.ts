import { XFrameError } from "../errors/xframe-error.js";

export const DEFAULT_SKYLINE_MEMORY_LIMIT_BYTES = 512 * 1024 * 1024;

export interface SkylineMemoryEstimate {
  readonly storageCount: number;
  readonly estimatedBytes: number;
}

export function estimateSkylineMemory(
  firstColumns: readonly number[],
  limitBytes = DEFAULT_SKYLINE_MEMORY_LIMIT_BYTES,
): SkylineMemoryEstimate {
  if (!Number.isSafeInteger(limitBytes) || limitBytes <= 0) {
    throw new XFrameError("INPUT_INVALID", "Skyline memory limit must be a positive safe integer.", {
      kind: "input",
      path: "limitBytes",
      expected: "positive safe integer",
      actual: String(limitBytes),
    });
  }

  let storageCount = 0;
  for (let row = 0; row < firstColumns.length; row += 1) {
    const firstColumn = firstColumns[row];
    if (!Number.isSafeInteger(firstColumn) || firstColumn! < 0 || firstColumn! > row) {
      throw new XFrameError("INPUT_INVALID", "Invalid skyline first-column index.", {
        kind: "input",
        path: `firstColumns[${row}]`,
        expected: `integer in [0, ${row}]`,
        actual: String(firstColumn),
      });
    }
    storageCount += row - firstColumn! + 1;
    if (!Number.isSafeInteger(storageCount)) {
      throw new XFrameError("MEMORY_LIMIT_EXCEEDED", "Skyline storage count exceeds safe integer arithmetic.", {
        kind: "memory",
        operation: "skyline-allocation",
        estimatedBytes: Number.MAX_SAFE_INTEGER,
        limitBytes,
      });
    }
  }

  const estimatedBytes = storageCount * Float64Array.BYTES_PER_ELEMENT
    + firstColumns.length * Uint32Array.BYTES_PER_ELEMENT
    + (firstColumns.length + 1) * Float64Array.BYTES_PER_ELEMENT;
  if (!Number.isSafeInteger(estimatedBytes) || estimatedBytes > limitBytes) {
    throw new XFrameError("MEMORY_LIMIT_EXCEEDED", "Skyline allocation exceeds the configured memory limit.", {
      kind: "memory",
      operation: "skyline-allocation",
      estimatedBytes: Number.isSafeInteger(estimatedBytes) ? estimatedBytes : Number.MAX_SAFE_INTEGER,
      limitBytes,
    });
  }
  return Object.freeze({ storageCount, estimatedBytes });
}
