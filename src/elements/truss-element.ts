import { XFrameError } from "../errors/xframe-error.js";
import { createVector3 } from "../geometry/vector-3.js";
import type { RigidOffsetInput, TrussInput, TrussRecord } from "../model/domain-records.js";
import { parseIdentifier } from "../model/identifier.js";

type FrozenVector3 = readonly [number, number, number];

function frozenVector(value: ArrayLike<unknown>, path: string): FrozenVector3 {
  const vector = createVector3(value, path);
  return Object.freeze([vector[0]!, vector[1]!, vector[2]!]);
}

function normalizedOffsets(value: RigidOffsetInput | undefined): RigidOffsetInput | undefined {
  if (value === undefined) return undefined;
  const start = value.start === undefined ? undefined : frozenVector(value.start, "truss.rigidOffsets.start");
  const end = value.end === undefined ? undefined : frozenVector(value.end, "truss.rigidOffsets.end");
  return Object.freeze({
    ...(start === undefined ? {} : { start }),
    ...(end === undefined ? {} : { end }),
  });
}

export function createTrussElement(input: TrussInput): TrussRecord {
  const startNodeId = parseIdentifier(input.startNodeId, "truss.startNodeId");
  const endNodeId = parseIdentifier(input.endNodeId, "truss.endNodeId");
  if (startNodeId === endNodeId) {
    throw new XFrameError("INPUT_INVALID", "Truss endpoint identifiers must differ.", {
      kind: "input",
      path: "truss.endNodeId",
      expected: "identifier different from startNodeId",
      actual: endNodeId,
    });
  }
  const rigidOffsets = normalizedOffsets(input.rigidOffsets);
  return Object.freeze({
    id: parseIdentifier(input.id, "truss.id"),
    startNodeId,
    endNodeId,
    materialId: parseIdentifier(input.materialId, "truss.materialId"),
    sectionId: parseIdentifier(input.sectionId, "truss.sectionId"),
    ...(rigidOffsets === undefined ? {} : { rigidOffsets }),
  });
}
