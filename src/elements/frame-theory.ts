import { XFrameError } from "../errors/xframe-error.js";
import type { FrameTheoryInput } from "../model/domain-records.js";

export type FrameTheory = FrameTheoryInput;

export function parseFrameTheory(value: unknown): FrameTheory {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new XFrameError("INPUT_INVALID", "Frame theory must be an object.", {
      kind: "input",
      path: "frame.theory",
      expected: "{ kind: 'euler-bernoulli' | 'timoshenko' }",
      actual: value === null ? "null" : typeof value,
    });
  }
  const kind = (value as Readonly<Record<string, unknown>>)["kind"];
  if (kind !== "euler-bernoulli" && kind !== "timoshenko") {
    throw new XFrameError("INPUT_INVALID", "Frame theory is unsupported.", {
      kind: "input",
      path: "frame.theory.kind",
      expected: "euler-bernoulli or timoshenko",
      actual: String(kind),
    });
  }
  return Object.freeze({ kind });
}
