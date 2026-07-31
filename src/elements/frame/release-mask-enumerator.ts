import { XFrameError } from "../../errors/xframe-error.js";
import { condenseFrameEndReleases } from "./release-condensation.js";

export interface FrameReleaseMaskClassification {
  readonly mask: number;
  readonly status: "valid" | "local-mechanism";
}

export interface FrameReleaseMaskSummary {
  readonly validCount: number;
  readonly invalidCount: number;
  readonly classifications: readonly FrameReleaseMaskClassification[];
}

export function classifyAllFrameReleaseMasks(stiffness: ArrayLike<number>): FrameReleaseMaskSummary {
  const classifications: FrameReleaseMaskClassification[] = [];
  let validCount = 0;
  let invalidCount = 0;
  for (let mask = 0; mask < 4096; mask += 1) {
    try {
      condenseFrameEndReleases(stiffness, new Float64Array(12), mask);
      classifications.push(Object.freeze({ mask, status: "valid" }));
      validCount += 1;
    } catch (error) {
      if (!(error instanceof XFrameError) || error.code !== "ELEMENT_LOCAL_MECHANISM") throw error;
      classifications.push(Object.freeze({ mask, status: "local-mechanism" }));
      invalidCount += 1;
    }
  }
  return Object.freeze({ validCount, invalidCount, classifications: Object.freeze(classifications) });
}
