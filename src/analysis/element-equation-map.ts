import { XFrameError } from "../errors/xframe-error.js";
import type { DofName } from "../model/domain-records.js";
import { createDofKey } from "../model/dof-key.js";
import type { FinalizedModel, ResolvedFrameRecord, ResolvedSpringRecord, ResolvedTrussRecord } from "../model/finalized-model.js";

const ALL_DOFS = ["tx", "ty", "tz", "rx", "ry", "rz"] as const satisfies readonly DofName[];
const TRANSLATIONS = ["tx", "ty", "tz"] as const satisfies readonly DofName[];

function physicalIndex(model: FinalizedModel, nodeId: string, dof: DofName, elementId: string): number {
  const value = model.physicalDofs.get(createDofKey(nodeId, dof))?.physicalIndex;
  if (value === undefined) {
    throw new XFrameError("INPUT_INVALID", "Element requires a physically unavailable degree of freedom.", {
      kind: "analysis",
      stage: "element-equation-map",
      detail: `${nodeId}.${dof}`,
      entityId: elementId,
    });
  }
  return value;
}

function endpoint(model: FinalizedModel, nodeId: string, dofs: readonly DofName[], elementId: string): number[] {
  return dofs.map((dof) => physicalIndex(model, nodeId, dof, elementId));
}

export function frameEquationMap(model: FinalizedModel, frame: ResolvedFrameRecord): readonly number[] {
  return Object.freeze([
    ...endpoint(model, frame.record.startNodeId, ALL_DOFS, frame.record.id),
    ...endpoint(model, frame.record.endNodeId, ALL_DOFS, frame.record.id),
  ]);
}

export function trussEquationMap(model: FinalizedModel, truss: ResolvedTrussRecord): readonly number[] {
  return Object.freeze([
    ...endpoint(model, truss.record.startNodeId, TRANSLATIONS, truss.record.id),
    ...endpoint(model, truss.record.endNodeId, TRANSLATIONS, truss.record.id),
  ]);
}

export function springEquationMap(model: FinalizedModel, spring: ResolvedSpringRecord): readonly number[] {
  const active = ALL_DOFS.filter((_, index) => spring.record.stiffness[index]! > 0);
  const start = endpoint(model, spring.record.startNodeId, active, spring.record.id);
  if (spring.record.endNodeId === undefined) return Object.freeze(start);
  return Object.freeze([...start, ...endpoint(model, spring.record.endNodeId, active, spring.record.id)]);
}

export function activeSpringComponents(spring: ResolvedSpringRecord): readonly number[] {
  return Object.freeze(spring.record.stiffness.flatMap((value, index) => value > 0 ? [index] : []));
}
