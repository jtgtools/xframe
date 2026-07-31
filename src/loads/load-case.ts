import { XFrameError } from "../errors/xframe-error.js";
import type { FinalizedLoadCaseRecord, ResolvedFrameRecord, ResolvedTrussRecord } from "../model/finalized-model.js";
import { parseIdentifier, type EntityId } from "../model/identifier.js";
import type { LoadCaseInput, LoadCaseRecord } from "../model/domain-records.js";
import { createDistributedLoad } from "./distributed-load.js";
import type { LoadContributionProvenance, LoadInput, LoadRecord, NodalLoadInput, ResolvedLoadRecord } from "./load-types.js";
import { createMemberPointLoad } from "./member-point-load.js";
import { createNodalLoad } from "./nodal-load.js";
import { createSelfWeightLoad } from "./self-weight.js";
import { loadError } from "./load-validation.js";

const ALLOWED = new Set(["id", "loads"]);

function parseLoad(value: unknown, index: number): LoadRecord {
  if (value === null || typeof value !== "object" || Array.isArray(value)) loadError(`loadCase.loads[${index}]`, "load object", value === null ? "null" : typeof value);
  const kind = (value as Readonly<Record<string, unknown>>)["kind"];
  switch (kind) {
    case "nodal": return createNodalLoad(value as NodalLoadInput);
    case "member-point-force":
    case "member-point-moment": return createMemberPointLoad(value as LoadInput & { readonly kind: typeof kind });
    case "member-distributed": return createDistributedLoad(value as LoadInput & { readonly kind: typeof kind });
    case "self-weight": return createSelfWeightLoad(value as LoadInput & { readonly kind: typeof kind });
    default: loadError(`loadCase.loads[${index}].kind`, "recognized load kind", kind);
  }
}

export function createLoadCase(input: LoadCaseInput): LoadCaseRecord {
  for (const key of Object.keys(input)) if (!ALLOWED.has(key)) loadError(`loadCase.${key}`, "recognized load-case property", key);
  if (input.loads !== undefined && !Array.isArray(input.loads)) loadError("loadCase.loads", "array", typeof input.loads);
  const loads = Object.freeze((input.loads ?? []).map((load, index) => parseLoad(load, index)));
  return Object.freeze({ id: parseIdentifier(input.id, "loadCase.id"), loads });
}

function coordinateError(loadCaseId: EntityId, loadIndex: number, actual: number, length: number): never {
  throw new XFrameError("LOAD_INVALID", "Member-load coordinate is outside the deformable member.", {
    kind: "input",
    path: `loadCases[${loadCaseId}].loads[${loadIndex}]`,
    expected: `coordinate within [0,${length}]`,
    actual: String(actual),
  });
}

function targetIds(load: ResolvedLoadRecord): readonly EntityId[] {
  switch (load.kind) {
    case "nodal": return Object.freeze([load.nodeId]);
    case "member-point-force":
    case "member-point-moment":
    case "member-distributed": return Object.freeze([load.frameId]);
    case "self-weight": return Object.freeze([...load.frameIds, ...load.trussIds]);
  }
}

export function finalizeLoadCases(
  cases: readonly LoadCaseRecord[],
  frames: readonly ResolvedFrameRecord[],
  trusses: readonly ResolvedTrussRecord[],
  nodeIds: ReadonlySet<EntityId>,
  compatibilityKey: string,
): readonly FinalizedLoadCaseRecord[] {
  const frameById = new Map(frames.map((frame) => [frame.record.id, frame]));
  const trussById = new Map(trusses.map((truss) => [truss.record.id, truss]));
  const result: FinalizedLoadCaseRecord[] = [];

  for (const loadCase of cases) {
    const resolved: ResolvedLoadRecord[] = [];
    const provenance: LoadContributionProvenance[] = [];
    for (let index = 0; index < loadCase.loads.length; index += 1) {
      const load = loadCase.loads[index]!;
      let value: ResolvedLoadRecord;
      if (load.kind === "nodal") {
        if (!nodeIds.has(load.nodeId)) {
          throw new XFrameError("REFERENCE_NOT_FOUND", "Nodal load references a missing node.", {
            kind: "reference",
            issues: [{ entityType: "load case", id: loadCase.id, path: `loads[${index}].nodeId`, referencedId: load.nodeId, expectedType: "node" }],
          });
        }
        value = load;
      } else if (load.kind === "member-point-force" || load.kind === "member-point-moment") {
        const frame = frameById.get(load.frameId);
        if (frame === undefined) {
          throw new XFrameError("REFERENCE_NOT_FOUND", "Member point load references a missing frame.", {
            kind: "reference",
            issues: [{ entityType: "load case", id: loadCase.id, path: `loads[${index}].frameId`, referencedId: load.frameId, expectedType: "frame" }],
          });
        }
        const length = frame.geometry.elasticLength;
        const distance = load.location.kind === "distance" ? load.location.distanceFromElasticStart : load.location.positionRatio * length;
        if (distance < 0 || distance > length) coordinateError(loadCase.id, index, distance, length);
        value = load.kind === "member-point-force"
          ? Object.freeze({ kind: load.kind, frameId: load.frameId, coordinateSystem: load.coordinateSystem, distanceFromElasticStart: distance, force: load.force, sourceLocation: load.location })
          : Object.freeze({ kind: load.kind, frameId: load.frameId, coordinateSystem: load.coordinateSystem, distanceFromElasticStart: distance, moment: load.moment, sourceLocation: load.location });
      } else if (load.kind === "member-distributed") {
        const frame = frameById.get(load.frameId);
        if (frame === undefined) {
          throw new XFrameError("REFERENCE_NOT_FOUND", "Distributed load references a missing frame.", {
            kind: "reference",
            issues: [{ entityType: "load case", id: loadCase.id, path: `loads[${index}].frameId`, referencedId: load.frameId, expectedType: "frame" }],
          });
        }
        const length = frame.geometry.elasticLength;
        const start = load.span.kind === "full" ? 0 : load.span.kind === "distance" ? load.span.startDistanceFromElasticStart : load.span.startPositionRatio * length;
        const end = load.span.kind === "full" ? length : load.span.kind === "distance" ? load.span.endDistanceFromElasticStart : load.span.endPositionRatio * length;
        if (start < 0 || end > length || end <= start) coordinateError(loadCase.id, index, end > length ? end : start, length);
        value = Object.freeze({
          kind: load.kind,
          frameId: load.frameId,
          coordinateSystem: load.coordinateSystem,
          startDistanceFromElasticStart: start,
          endDistanceFromElasticStart: end,
          startIntensity: load.startIntensity,
          endIntensity: load.endIntensity,
          sourceSpan: load.span,
          discontinuities: Object.freeze([start, end]) as readonly [number, number],
        });
      } else {
        const hasExplicitSelection = load.frameIds !== undefined || load.trussIds !== undefined;
        const selectedFrames = load.frameIds === undefined ? (hasExplicitSelection ? [] : frames) : load.frameIds.map((id) => {
          const frame = frameById.get(id);
          if (frame === undefined) {
            throw new XFrameError("REFERENCE_NOT_FOUND", "Self-weight references a missing frame.", {
              kind: "reference",
              issues: [{ entityType: "load case", id: loadCase.id, path: `loads[${index}].frameIds`, referencedId: id, expectedType: "frame" }],
            });
          }
          return frame;
        });
        const selectedTrusses = load.trussIds === undefined ? (hasExplicitSelection ? [] : trusses) : load.trussIds.map((id) => {
          const truss = trussById.get(id);
          if (truss === undefined) {
            throw new XFrameError("REFERENCE_NOT_FOUND", "Self-weight references a missing truss.", {
              kind: "reference",
              issues: [{ entityType: "load case", id: loadCase.id, path: `loads[${index}].trussIds`, referencedId: id, expectedType: "truss" }],
            });
          }
          return truss;
        });
        if (selectedFrames.length + selectedTrusses.length === 0) loadError(`loadCases[${loadCase.id}].loads[${index}]`, "at least one affected frame or truss", "none");
        const missing = [...selectedFrames.map((entry) => entry.material), ...selectedTrusses.map((entry) => entry.material)]
          .filter((material) => material.density === undefined)
          .map(({ id }) => id);
        if (missing.length > 0) {
          throw new XFrameError("MATERIAL_INVALID", "Self-weight requires density for every affected material.", {
            kind: "material-dependency",
            loadCaseId: loadCase.id,
            missingMaterialIds: Object.freeze([...new Set(missing)].sort()),
            affectedElementIds: Object.freeze([...selectedFrames.map(({ record }) => record.id), ...selectedTrusses.map(({ record }) => record.id)].sort()),
            reason: "self-weight requires density",
          });
        }
        value = Object.freeze({
          kind: load.kind,
          gravity: load.gravity,
          frameIds: Object.freeze(selectedFrames.map(({ record }) => record.id).sort()),
          trussIds: Object.freeze(selectedTrusses.map(({ record }) => record.id).sort()),
        });
      }
      resolved.push(value);
      provenance.push(Object.freeze({ loadCaseId: loadCase.id, loadIndex: index, kind: value.kind, targetIds: targetIds(value) }));
    }
    result.push(Object.freeze({
      id: loadCase.id,
      loads: Object.freeze(resolved),
      provenance: Object.freeze(provenance),
      compatibilityKey,
    }));
  }
  return Object.freeze(result);
}
