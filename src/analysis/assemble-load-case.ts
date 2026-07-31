import { computeFrameLocalStiffness } from "../elements/frame/local-stiffness.js";
import { computeFrameEquivalentLoad, type FrameMemberLoad, type LocalLoadVector } from "../elements/frame/member-load-vector.js";
import { condenseFrameEndReleases, frameReleaseMask } from "../elements/frame/release-condensation.js";
import { createFrameRigidOffsetTransform } from "../elements/frame/rigid-offset-transform.js";
import { XFrameError } from "../errors/xframe-error.js";
import { multiplyMatrix3Vector3 } from "../geometry/matrix-3.js";
import type { ResolvedLoadRecord } from "../loads/load-types.js";
import { createDofKey, DOF_NAMES } from "../model/dof-key.js";
import type { FinalizedLoadCaseRecord, FinalizedModel, ResolvedFrameRecord } from "../model/finalized-model.js";
import type { EntityId } from "../model/identifier.js";
import type { CompiledConstraints } from "../constraints/compile-constraints.js";
import type { SymmetricCoordinateMatrix } from "../linalg/symmetric-coordinate-matrix.js";
import { frameEquationMap, trussEquationMap } from "./element-equation-map.js";

function addAt(vector: Float64Array, index: number, value: number): void {
  vector[index] = vector[index]! + value;
}

function dofIndex(model: FinalizedModel, nodeId: EntityId, dofIndex: number, value: number): number | undefined {
  const dof = DOF_NAMES[dofIndex]!;
  const index = model.physicalDofs.get(createDofKey(nodeId, dof))?.physicalIndex;
  if (index === undefined && value !== 0) {
    throw new XFrameError("LOAD_INVALID", "Nodal load targets a physically unavailable degree of freedom.", {
      kind: "input",
      path: `load.node[${nodeId}].${dof}`,
      expected: "physically available DOF",
      actual: String(value),
    });
  }
  return index;
}

function localVector(frame: ResolvedFrameRecord, vector: readonly [number, number, number], system: "local" | "global"): LocalLoadVector {
  if (system === "local") return vector;
  const value = multiplyMatrix3Vector3(frame.axes.globalToLocal, vector);
  return [value[0]!, value[1]!, value[2]!];
}

export function resolvedFrameMemberLoad(frame: ResolvedFrameRecord, load: ResolvedLoadRecord): FrameMemberLoad | undefined {
  if (load.kind === "member-point-force" && load.frameId === frame.record.id) {
    return { kind: "point-force", distance: load.distanceFromElasticStart, vector: localVector(frame, load.force, load.coordinateSystem) };
  }
  if (load.kind === "member-point-moment" && load.frameId === frame.record.id) {
    return { kind: "point-moment", distance: load.distanceFromElasticStart, vector: localVector(frame, load.moment, load.coordinateSystem) };
  }
  if (load.kind === "member-distributed" && load.frameId === frame.record.id) {
    return {
      kind: "distributed",
      start: load.startDistanceFromElasticStart,
      end: load.endDistanceFromElasticStart,
      startIntensity: localVector(frame, load.startIntensity, load.coordinateSystem),
      endIntensity: localVector(frame, load.endIntensity, load.coordinateSystem),
    };
  }
  if (load.kind === "self-weight" && load.frameIds.includes(frame.record.id)) {
    const density = frame.material.density!;
    const intensityGlobal: readonly [number, number, number] = [
      density * frame.section.area * load.gravity[0],
      density * frame.section.area * load.gravity[1],
      density * frame.section.area * load.gravity[2],
    ];
    const intensity = localVector(frame, intensityGlobal, "global");
    return { kind: "distributed", start: 0, end: frame.geometry.elasticLength, startIntensity: intensity, endIntensity: intensity };
  }
  return undefined;
}

function equivalentLoadInput(frame: ResolvedFrameRecord) {
  return {
    length: frame.geometry.elasticLength,
    elasticModulus: frame.material.elasticModulus,
    shearModulus: frame.material.shearModulus,
    momentOfInertiaY: frame.section.momentOfInertiaY,
    momentOfInertiaZ: frame.section.momentOfInertiaZ,
    theory: frame.record.theory,
    ...(frame.section.shearAreaY === undefined ? {} : { shearAreaY: frame.section.shearAreaY }),
    ...(frame.section.shearAreaZ === undefined ? {} : { shearAreaZ: frame.section.shearAreaZ }),
  } as const;
}

export function assembleFrameLocalLoad(frame: ResolvedFrameRecord, loads: readonly ResolvedLoadRecord[]): Float64Array {
  const result = new Float64Array(12);
  for (const load of loads) {
    const memberLoad = resolvedFrameMemberLoad(frame, load);
    if (memberLoad === undefined) continue;
    const contribution = computeFrameEquivalentLoad({ ...equivalentLoadInput(frame), load: memberLoad });
    for (let index = 0; index < 12; index += 1) result[index] = result[index]! + contribution[index]!;
  }
  return result;
}

function assembleFullLoad(model: FinalizedModel, loadCase: FinalizedLoadCaseRecord): Float64Array {
  const full = new Float64Array(model.physicalDofs.size);
  for (const load of loadCase.loads) {
    if (load.kind !== "nodal") continue;
    for (let component = 0; component < 3; component += 1) {
      const force = load.force?.[component] ?? 0;
      const moment = load.moment?.[component] ?? 0;
      const translation = dofIndex(model, load.nodeId, component, force);
      const rotation = dofIndex(model, load.nodeId, component + 3, moment);
      if (translation !== undefined) addAt(full, translation, force);
      if (rotation !== undefined) addAt(full, rotation, moment);
    }
  }

  for (const frame of model.resolvedFrames) {
    const localLoad = assembleFrameLocalLoad(frame, loadCase.loads);
    if (!localLoad.some((value) => value !== 0)) continue;
    const localStiffness = computeFrameLocalStiffness({
      length: frame.geometry.elasticLength,
      elasticModulus: frame.material.elasticModulus,
      shearModulus: frame.material.shearModulus,
      area: frame.section.area,
      torsionalConstant: frame.section.torsionalConstant,
      momentOfInertiaY: frame.section.momentOfInertiaY,
      momentOfInertiaZ: frame.section.momentOfInertiaZ,
      theory: frame.record.theory,
      ...(frame.section.shearAreaY === undefined ? {} : { shearAreaY: frame.section.shearAreaY }),
      ...(frame.section.shearAreaZ === undefined ? {} : { shearAreaZ: frame.section.shearAreaZ }),
    });
    const condensed = condenseFrameEndReleases(localStiffness, localLoad, frameReleaseMask(frame.record.releases));
    const transform = createFrameRigidOffsetTransform(frame.axes.globalToLocal, frame.geometry.startOffset, frame.geometry.endOffset);
    const global = transform.forceToGlobal(condensed.load);
    const equations = frameEquationMap(model, frame);
    for (let index = 0; index < equations.length; index += 1) addAt(full, equations[index]!, global[index]!);
  }

  for (const load of loadCase.loads) {
    if (load.kind !== "self-weight") continue;
    for (const truss of model.resolvedTrusses) {
      if (!load.trussIds.includes(truss.record.id)) continue;
      const scale = 0.5 * truss.material.density! * truss.section.area * truss.geometry.elasticLength;
      const equations = trussEquationMap(model, truss);
      for (let component = 0; component < 3; component += 1) {
        addAt(full, equations[component]!, scale * load.gravity[component]!);
        addAt(full, equations[component + 3]!, scale * load.gravity[component]!);
      }
    }
  }
  return full;
}

export interface AssembledLoadCase {
  readonly fullLoad: Float64Array;
  readonly reducedLoad: Float64Array;
}

export function assembleLoadCase(
  model: FinalizedModel,
  loadCase: FinalizedLoadCaseRecord,
  fullStiffness: SymmetricCoordinateMatrix,
  constraints: CompiledConstraints,
): AssembledLoadCase {
  const fullLoad = assembleFullLoad(model, loadCase);
  const offsets = Float64Array.from(constraints.rows, ({ offset }) => offset);
  const stiffnessOffset = fullStiffness.multiply(offsets);
  const reducedLoad = new Float64Array(constraints.reducedDofCount);
  for (let full = 0; full < constraints.fullDofCount; full += 1) {
    const adjusted = fullLoad[full]! - stiffnessOffset[full]!;
    for (const term of constraints.rows[full]!.terms) {
      reducedLoad[term.reducedDof] = reducedLoad[term.reducedDof]! + term.coefficient * adjusted;
    }
  }
  return Object.freeze({ fullLoad, reducedLoad });
}
