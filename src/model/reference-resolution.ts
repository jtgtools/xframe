import { XFrameError } from "../errors/xframe-error.js";
import type {
  FrameRecord,
  FrameSectionRecord,
  MaterialRecord,
  ModelSnapshot,
  NodeRecord,
  SpringRecord,
  TrussRecord,
  TrussSectionRecord,
} from "./domain-records.js";
import type { EntityId } from "./identifier.js";

export interface ReferenceIssue {
  readonly entityType: string;
  readonly id: string;
  readonly path: string;
  readonly referencedId: string;
  readonly expectedType: string;
}

export interface ResolvedFrameReferences {
  readonly record: FrameRecord;
  readonly startNode: NodeRecord;
  readonly endNode: NodeRecord;
  readonly material: MaterialRecord;
  readonly section: FrameSectionRecord;
}

export interface ResolvedTrussReferences {
  readonly record: TrussRecord;
  readonly startNode: NodeRecord;
  readonly endNode: NodeRecord;
  readonly material: MaterialRecord;
  readonly section: TrussSectionRecord;
}

export interface ResolvedSpringReferences {
  readonly record: SpringRecord;
  readonly startNode: NodeRecord;
  readonly endNode?: NodeRecord;
}

export interface ResolvedReferences {
  readonly frames: readonly ResolvedFrameReferences[];
  readonly trusses: readonly ResolvedTrussReferences[];
  readonly springs: readonly ResolvedSpringReferences[];
}

function indexById<T extends { readonly id: EntityId }>(values: readonly T[]): Map<EntityId, T> {
  return new Map(values.map((value) => [value.id, value]));
}

function addIssue(
  issues: ReferenceIssue[],
  entityType: string,
  id: EntityId,
  path: string,
  referencedId: EntityId,
  expectedType: string,
): void {
  issues.push(Object.freeze({ entityType, id, path, referencedId, expectedType }));
}

function required<T>(
  map: ReadonlyMap<EntityId, T>,
  issues: ReferenceIssue[],
  entityType: string,
  id: EntityId,
  path: string,
  referencedId: EntityId,
  expectedType: string,
): T | undefined {
  const value = map.get(referencedId);
  if (value === undefined) addIssue(issues, entityType, id, path, referencedId, expectedType);
  return value;
}

function sortIssues(issues: ReferenceIssue[]): readonly ReferenceIssue[] {
  return Object.freeze(
    [...issues].sort((left, right) =>
      left.entityType.localeCompare(right.entityType) || left.id.localeCompare(right.id) || left.path.localeCompare(right.path),
    ),
  );
}

export function resolveModelReferences(model: ModelSnapshot): ResolvedReferences {
  const nodes = indexById(model.nodes);
  const materials = indexById(model.materials);
  const frameSections = indexById(model.frameSections);
  const trussSections = indexById(model.trussSections);
  const issues: ReferenceIssue[] = [];

  const frames: ResolvedFrameReferences[] = [];
  for (const record of model.frames) {
    const startNode = required(nodes, issues, "frame", record.id, "startNodeId", record.startNodeId, "node");
    const endNode = required(nodes, issues, "frame", record.id, "endNodeId", record.endNodeId, "node");
    const material = required(materials, issues, "frame", record.id, "materialId", record.materialId, "material");
    const section = required(frameSections, issues, "frame", record.id, "sectionId", record.sectionId, "frame section");
    if (startNode !== undefined && endNode !== undefined && material !== undefined && section !== undefined) {
      frames.push(Object.freeze({ record, startNode, endNode, material, section }));
    }
  }

  const trusses: ResolvedTrussReferences[] = [];
  for (const record of model.trusses) {
    const startNode = required(nodes, issues, "truss", record.id, "startNodeId", record.startNodeId, "node");
    const endNode = required(nodes, issues, "truss", record.id, "endNodeId", record.endNodeId, "node");
    const material = required(materials, issues, "truss", record.id, "materialId", record.materialId, "material");
    const section = required(trussSections, issues, "truss", record.id, "sectionId", record.sectionId, "truss section");
    if (startNode !== undefined && endNode !== undefined && material !== undefined && section !== undefined) {
      trusses.push(Object.freeze({ record, startNode, endNode, material, section }));
    }
  }

  const springs: ResolvedSpringReferences[] = [];
  for (const record of model.springs) {
    const startNode = required(nodes, issues, "spring", record.id, "startNodeId", record.startNodeId, "node");
    const endNode = record.endNodeId === undefined
      ? undefined
      : required(nodes, issues, "spring", record.id, "endNodeId", record.endNodeId, "node");
    if (startNode !== undefined && (record.endNodeId === undefined || endNode !== undefined)) {
      springs.push(Object.freeze({ record, startNode, ...(endNode === undefined ? {} : { endNode }) }));
    }
  }

  for (const constraint of model.constraints) {
    for (let index = 0; index < constraint.terms.length; index += 1) {
      const term = constraint.terms[index]!;
      required(nodes, issues, "constraint", constraint.id, `terms[${index}].nodeId`, term.nodeId, "node");
    }
  }

  if (issues.length > 0) {
    throw new XFrameError("REFERENCE_NOT_FOUND", "One or more model references could not be resolved.", {
      kind: "reference",
      issues: sortIssues(issues),
    });
  }

  return Object.freeze({
    frames: Object.freeze(frames),
    trusses: Object.freeze(trusses),
    springs: Object.freeze(springs),
  });
}
