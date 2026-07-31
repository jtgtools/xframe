import { XFrameError } from "../errors/xframe-error.js";
import type { DofName } from "./domain-records.js";
import type { EntityId } from "./identifier.js";

export const DOF_NAMES = ["tx", "ty", "tz", "rx", "ry", "rz"] as const satisfies readonly DofName[];
export const TRANSLATIONAL_DOF_NAMES = ["tx", "ty", "tz"] as const satisfies readonly DofName[];
const DOF_SET = new Set<string>(DOF_NAMES);
const KEY_SEPARATOR = "\u001f";

export type DofKey = string & { readonly __dofKey: unique symbol };

export function isDofName(value: unknown): value is DofName {
  return typeof value === "string" && DOF_SET.has(value);
}

export function parseDofName(value: unknown, path: string): DofName {
  if (!isDofName(value)) {
    throw new XFrameError("INPUT_INVALID", "Degree-of-freedom name is invalid.", {
      kind: "input",
      path,
      expected: "tx, ty, tz, rx, ry, or rz",
      actual: String(value),
    });
  }
  return value;
}

export function createDofKey(nodeId: EntityId | string, dof: DofName): DofKey {
  return `${nodeId}${KEY_SEPARATOR}${dof}` as DofKey;
}
