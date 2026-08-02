import { XFrameError } from "../errors/xframe-error.js";
import { createTrussRigidOffsetKinematics } from "../elements/truss/rigid-offset-kinematics.js";
import type { DofName } from "../model/domain-records.js";
import { createDofKey } from "../model/dof-key.js";
import type {
  FinalizedModel,
  ResolvedFrameRecord,
  ResolvedSpringRecord,
  ResolvedTrussRecord,
} from "../model/finalized-model.js";

const ALL_DOFS = ["tx", "ty", "tz", "rx", "ry", "rz"] as const satisfies readonly DofName[];

function physicalIndex(
  model: FinalizedModel,
  nodeId: string,
  dof: DofName,
  elementId: string,
): number {
  const value = model.physicalDofs.get(createDofKey(nodeId, dof))?.physicalIndex;
  if (value === undefined) {
    throw new XFrameError(
      "INPUT_INVALID",
      "Element requires a physically unavailable degree of freedom.",
      {
        kind: "analysis",
        stage: "element-equation-map",
        detail: `${nodeId}.${dof}`,
        entityId: elementId,
      },
    );
  }
  return value;
}

function endpoint(
  model: FinalizedModel,
  nodeId: string,
  dofs: readonly DofName[],
  elementId: string,
): number[] {
  return dofs.map((dof) => physicalIndex(model, nodeId, dof, elementId));
}

export function frameEquationMap(
  model: FinalizedModel,
  frame: ResolvedFrameRecord,
): readonly number[] {
  return Object.freeze([
    ...endpoint(model, frame.record.startNodeId, ALL_DOFS, frame.record.id),
    ...endpoint(model, frame.record.endNodeId, ALL_DOFS, frame.record.id),
  ]);
}

export function trussEquationMap(
  model: FinalizedModel,
  truss: ResolvedTrussRecord,
): readonly number[] {
  const kinematics = createTrussRigidOffsetKinematics(
    truss.direction,
    truss.geometry.startOffset,
    truss.geometry.endOffset,
  );
  return Object.freeze(
    kinematics.activeReferenceComponents.map((component) => {
      const nodeId = component < 6 ? truss.record.startNodeId : truss.record.endNodeId;
      return physicalIndex(model, nodeId, ALL_DOFS[component % 6]!, truss.record.id);
    }),
  );
}

export function springEquationMap(
  model: FinalizedModel,
  spring: ResolvedSpringRecord,
): readonly number[] {
  const active = ALL_DOFS.filter((_, index) => spring.record.stiffness[index]! > 0);
  const start = endpoint(model, spring.record.startNodeId, active, spring.record.id);
  if (spring.record.endNodeId === undefined) return Object.freeze(start);
  return Object.freeze([
    ...start,
    ...endpoint(model, spring.record.endNodeId, active, spring.record.id),
  ]);
}

export function activeSpringComponents(spring: ResolvedSpringRecord): readonly number[] {
  return Object.freeze(
    spring.record.stiffness.flatMap((value, index) => (value > 0 ? [index] : [])),
  );
}
