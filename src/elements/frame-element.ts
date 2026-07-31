import { XFrameError } from "../errors/xframe-error.js";
import { createVector3, normVector3 } from "../geometry/vector-3.js";
import type {
  DofName,
  FrameInput,
  FrameRecord,
  FrameReleaseInput,
  RigidOffsetInput,
} from "../model/domain-records.js";
import { parseIdentifier } from "../model/identifier.js";
import { parseFrameTheory } from "./frame-theory.js";

const DOF_ORDER: readonly DofName[] = ["tx", "ty", "tz", "rx", "ry", "rz"];
const DOF_INDEX = new Map(DOF_ORDER.map((dof, index) => [dof, index]));

type FrozenVector3 = readonly [number, number, number];

function inputError(path: string, expected: string, actual: unknown): never {
  throw new XFrameError("INPUT_INVALID", "Frame element data is invalid.", {
    kind: "input",
    path,
    expected,
    actual: String(actual),
  });
}

function frozenVector(value: ArrayLike<unknown>, path: string, allowZero: boolean): FrozenVector3 {
  const vector = createVector3(value, path);
  if (!allowZero && normVector3(vector) === 0) {
    throw new XFrameError("GEOMETRY_INVALID", "Frame orientation vector cannot be zero.", {
      kind: "geometry",
      path,
      reason: "orientation vector is zero",
      value: "0",
    });
  }
  return Object.freeze([vector[0]!, vector[1]!, vector[2]!]);
}

function normalizedReleaseEnd(value: unknown, path: string): readonly DofName[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) inputError(path, "array of unique frame DOF names", typeof value);
  const seen = new Set<DofName>();
  for (const entry of value) {
    if (typeof entry !== "string" || !DOF_INDEX.has(entry as DofName)) {
      inputError(path, "array containing tx, ty, tz, rx, ry, or rz", entry);
    }
    const dof = entry as DofName;
    if (seen.has(dof)) inputError(path, "unique release components", dof);
    seen.add(dof);
  }
  return Object.freeze([...seen].sort((left, right) => DOF_INDEX.get(left)! - DOF_INDEX.get(right)!));
}

function normalizedReleases(value: FrameReleaseInput | undefined): FrameReleaseInput | undefined {
  if (value === undefined) return undefined;
  const start = normalizedReleaseEnd(value.start, "frame.releases.start");
  const end = normalizedReleaseEnd(value.end, "frame.releases.end");
  return Object.freeze({
    ...(start === undefined ? {} : { start }),
    ...(end === undefined ? {} : { end }),
  });
}

function normalizedOffsets(value: RigidOffsetInput | undefined): RigidOffsetInput | undefined {
  if (value === undefined) return undefined;
  const start = value.start === undefined ? undefined : frozenVector(value.start, "frame.rigidOffsets.start", true);
  const end = value.end === undefined ? undefined : frozenVector(value.end, "frame.rigidOffsets.end", true);
  return Object.freeze({
    ...(start === undefined ? {} : { start }),
    ...(end === undefined ? {} : { end }),
  });
}

export function createFrameElement(input: FrameInput): FrameRecord {
  const startNodeId = parseIdentifier(input.startNodeId, "frame.startNodeId");
  const endNodeId = parseIdentifier(input.endNodeId, "frame.endNodeId");
  if (startNodeId === endNodeId) {
    inputError("frame.endNodeId", "identifier different from startNodeId", endNodeId);
  }
  const orientation = input.orientation === undefined ? undefined : frozenVector(input.orientation, "frame.orientation", false);
  const releases = normalizedReleases(input.releases);
  const rigidOffsets = normalizedOffsets(input.rigidOffsets);
  return Object.freeze({
    id: parseIdentifier(input.id, "frame.id"),
    startNodeId,
    endNodeId,
    materialId: parseIdentifier(input.materialId, "frame.materialId"),
    sectionId: parseIdentifier(input.sectionId, "frame.sectionId"),
    theory: parseFrameTheory(input.theory),
    ...(orientation === undefined ? {} : { orientation }),
    ...(releases === undefined ? {} : { releases }),
    ...(rigidOffsets === undefined ? {} : { rigidOffsets }),
  });
}
