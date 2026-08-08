import type { LoadInput } from "../loads/load-types.js";
import type { FinalizedModel } from "../model/finalized-model.js";
import type {
  CombinationInput,
  ConstraintInput,
  FrameInput,
  FrameSectionInput,
  LoadCaseInput,
  MaterialInput,
  NodeInput,
  SpringInput,
  TrussInput,
  TrussSectionInput,
} from "../model/domain-records.js";
import type { UnitSystem } from "../units/unit-system.js";

export const MODEL_SCHEMA_VERSION = "1" as const;

export interface ModelJsonV1 {
  readonly schemaVersion: typeof MODEL_SCHEMA_VERSION;
  readonly unitSystem: UnitSystem;
  readonly nodes: readonly NodeInput[];
  readonly materials: readonly MaterialInput[];
  readonly frameSections: readonly FrameSectionInput[];
  readonly trussSections: readonly TrussSectionInput[];
  readonly frames: readonly FrameInput[];
  readonly trusses: readonly TrussInput[];
  readonly springs: readonly SpringInput[];
  readonly constraints: readonly ConstraintInput[];
  readonly loadCases: readonly LoadCaseInput[];
  readonly combinations: readonly CombinationInput[];
}

function pointLocation(
  load: Extract<
    FinalizedModel["loadCases"][number]["loads"][number],
    { readonly kind: "member-point-force" | "member-point-moment" }
  >,
): Record<string, number> {
  return load.sourceLocation.kind === "distance"
    ? { distanceFromElasticStart: load.sourceLocation.distanceFromElasticStart }
    : { positionRatio: load.sourceLocation.positionRatio };
}

function distributedSpan(
  load: Extract<
    FinalizedModel["loadCases"][number]["loads"][number],
    { readonly kind: "member-distributed" }
  >,
): Record<string, number> {
  if (load.sourceSpan.kind === "full") return {};
  return load.sourceSpan.kind === "distance"
    ? {
        startDistanceFromElasticStart: load.sourceSpan.startDistanceFromElasticStart,
        endDistanceFromElasticStart: load.sourceSpan.endDistanceFromElasticStart,
      }
    : {
        startPositionRatio: load.sourceSpan.startPositionRatio,
        endPositionRatio: load.sourceSpan.endPositionRatio,
      };
}

function loadToJson(load: FinalizedModel["loadCases"][number]["loads"][number]): LoadInput {
  switch (load.kind) {
    case "nodal":
      return {
        kind: load.kind,
        nodeId: load.nodeId,
        ...(load.force === undefined ? {} : { force: [...load.force] }),
        ...(load.moment === undefined ? {} : { moment: [...load.moment] }),
      };
    case "member-point-force":
      return {
        kind: load.kind,
        frameId: load.frameId,
        coordinateSystem: load.coordinateSystem,
        ...pointLocation(load),
        force: [...load.force],
      };
    case "member-point-moment":
      return {
        kind: load.kind,
        frameId: load.frameId,
        coordinateSystem: load.coordinateSystem,
        ...pointLocation(load),
        moment: [...load.moment],
      };
    case "member-distributed":
      return {
        kind: load.kind,
        frameId: load.frameId,
        coordinateSystem: load.coordinateSystem,
        ...distributedSpan(load),
        startIntensity: [...load.startIntensity],
        endIntensity: [...load.endIntensity],
      };
    case "self-weight":
      return {
        kind: load.kind,
        gravity: [...load.gravity],
        frameIds: [...load.frameIds],
        trussIds: [...load.trussIds],
      };
  }
}

/** Converts a finalized model to the complete version-one JSON model representation. */
export function modelToJsonValue(model: FinalizedModel): ModelJsonV1 {
  return {
    schemaVersion: MODEL_SCHEMA_VERSION,
    unitSystem: { ...model.unitSystem },
    nodes: model.nodes.map(({ id, coordinates }) => ({ id, coordinates: [...coordinates] })),
    materials: model.materials.map((material) => ({
      id: material.id,
      elasticModulus: material.elasticModulus,
      shearModulus: material.shearModulus,
      poissonRatio: material.poissonRatio,
      ...(material.density === undefined ? {} : { density: material.density }),
    })),
    frameSections: model.frameSections.map((section) => ({
      id: section.id,
      area: section.area,
      torsionalConstant: section.torsionalConstant,
      momentOfInertiaY: section.momentOfInertiaY,
      momentOfInertiaZ: section.momentOfInertiaZ,
      ...(section.shearAreaY === undefined ? {} : { shearAreaY: section.shearAreaY }),
      ...(section.shearAreaZ === undefined ? {} : { shearAreaZ: section.shearAreaZ }),
    })),
    trussSections: model.trussSections.map(({ id, area }) => ({ id, area })),
    frames: model.frames.map((frame) => ({
      id: frame.id,
      startNodeId: frame.startNodeId,
      endNodeId: frame.endNodeId,
      materialId: frame.materialId,
      sectionId: frame.sectionId,
      theory: { ...frame.theory },
      ...(frame.orientation === undefined ? {} : { orientation: [...frame.orientation] }),
      ...(frame.releases === undefined
        ? {}
        : {
            releases: {
              ...(frame.releases.start === undefined ? {} : { start: [...frame.releases.start] }),
              ...(frame.releases.end === undefined ? {} : { end: [...frame.releases.end] }),
            },
          }),
      ...(frame.rigidOffsets === undefined
        ? {}
        : {
            rigidOffsets: {
              ...(frame.rigidOffsets.start === undefined
                ? {}
                : { start: [...frame.rigidOffsets.start] }),
              ...(frame.rigidOffsets.end === undefined ? {} : { end: [...frame.rigidOffsets.end] }),
            },
          }),
    })),
    trusses: model.trusses.map((truss) => ({
      id: truss.id,
      startNodeId: truss.startNodeId,
      endNodeId: truss.endNodeId,
      materialId: truss.materialId,
      sectionId: truss.sectionId,
      ...(truss.rigidOffsets === undefined
        ? {}
        : {
            rigidOffsets: {
              ...(truss.rigidOffsets.start === undefined
                ? {}
                : { start: [...truss.rigidOffsets.start] }),
              ...(truss.rigidOffsets.end === undefined ? {} : { end: [...truss.rigidOffsets.end] }),
            },
          }),
    })),
    springs: model.springs.map((spring) => ({
      id: spring.id,
      startNodeId: spring.startNodeId,
      ...(spring.endNodeId === undefined ? {} : { endNodeId: spring.endNodeId }),
      stiffness: [...spring.stiffness],
    })),
    constraints: model.constraints.map((constraint) => ({
      id: constraint.id,
      terms: constraint.terms.map((term) => ({ ...term })),
      rightHandSide: constraint.rightHandSide,
    })),
    loadCases: model.loadCases.map((loadCase) => ({
      id: loadCase.id,
      loads: loadCase.loads.map(loadToJson),
    })),
    combinations: model.combinations.map((combination) => ({
      id: combination.id,
      factors: combination.factors.map((factor) => ({ ...factor })),
    })),
  };
}
