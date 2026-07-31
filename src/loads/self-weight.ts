import { parseIdentifier, type EntityId } from "../model/identifier.js";
import type { SelfWeightLoadInput, SelfWeightLoadRecord } from "./load-types.js";
import { exactObjectKeys, loadError, nonzero, vector3 } from "./load-validation.js";

const ALLOWED = new Set(["kind", "gravity", "frameIds", "trussIds"]);

function identifiers(value: readonly unknown[] | undefined, path: string): readonly EntityId[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) loadError(path, "array of unique identifiers", typeof value);
  const result = value.map((entry, index) => parseIdentifier(entry, `${path}[${index}]`));
  const unique = new Set(result);
  if (unique.size !== result.length) loadError(path, "unique identifiers", result.join(","));
  return Object.freeze([...result].sort());
}

export function createSelfWeightLoad(input: SelfWeightLoadInput): SelfWeightLoadRecord {
  exactObjectKeys(input, ALLOWED, "load");
  if (input.kind !== "self-weight") loadError("load.kind", "self-weight", input.kind);
  const gravity = vector3(input.gravity, "load.gravity");
  if (!nonzero(gravity)) loadError("load.gravity", "nonzero gravity vector", gravity.join(","));
  const frameIds = identifiers(input.frameIds, "load.frameIds");
  const trussIds = identifiers(input.trussIds, "load.trussIds");
  if (frameIds !== undefined && trussIds !== undefined && frameIds.length + trussIds.length === 0) {
    loadError("load", "at least one selected element or omitted selection for all elements", "empty selections");
  }
  return Object.freeze({
    kind: input.kind,
    gravity,
    ...(frameIds === undefined ? {} : { frameIds }),
    ...(trussIds === undefined ? {} : { trussIds }),
  });
}
