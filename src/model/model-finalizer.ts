import { XFrameError } from "../errors/xframe-error.js";
import { buildLocalAxes, type LocalAxes } from "../geometry/local-axes.js";
import { resolveElasticGeometry, type ElasticGeometry } from "../geometry/rigid-offset.js";
import { subtractVector3, normalizeVector3 } from "../geometry/vector-3.js";
import { assertFrameSectionSupportsTheory } from "../sections/frame-section.js";
import { finalizeLoadCases } from "../loads/load-case.js";
import { validateResultGraph } from "../loads/result-id-registry.js";
import type { ModelSnapshot } from "./domain-records.js";
import { derivePhysicalDofTopology } from "./dof-topology.js";
import type {
  FinalizedModel,
  FrozenElasticGeometry,
  FrozenLocalAxes,
  ResolvedFrameRecord,
  ResolvedSpringRecord,
  ResolvedTrussRecord,
} from "./finalized-model.js";
import { compareIdentifiers, type EntityId } from "./identifier.js";
import { computeModelFingerprint } from "./model-fingerprint.js";
import { resolveModelReferences } from "./reference-resolution.js";

function sortedById<T extends { readonly id: EntityId }>(values: readonly T[]): readonly T[] {
  return Object.freeze(values.toSorted((left, right) => compareIdentifiers(left.id, right.id)));
}

function canonicalSnapshot(snapshot: ModelSnapshot): ModelSnapshot {
  return Object.freeze({
    ...(snapshot.unitSystem === undefined ? {} : { unitSystem: snapshot.unitSystem }),
    nodes: sortedById(snapshot.nodes),
    materials: sortedById(snapshot.materials),
    frameSections: sortedById(snapshot.frameSections),
    trussSections: sortedById(snapshot.trussSections),
    frames: sortedById(snapshot.frames),
    trusses: sortedById(snapshot.trusses),
    springs: sortedById(snapshot.springs),
    constraints: sortedById(snapshot.constraints),
    loadCases: sortedById(snapshot.loadCases),
    combinations: sortedById(snapshot.combinations),
  });
}

function tuple3(value: ArrayLike<number>): readonly [number, number, number] {
  return Object.freeze([value[0]!, value[1]!, value[2]!]);
}

function tuple9(
  value: ArrayLike<number>,
): readonly [number, number, number, number, number, number, number, number, number] {
  return Object.freeze([
    value[0]!,
    value[1]!,
    value[2]!,
    value[3]!,
    value[4]!,
    value[5]!,
    value[6]!,
    value[7]!,
    value[8]!,
  ]);
}

function frozenGeometry(value: ElasticGeometry): FrozenElasticGeometry {
  return Object.freeze({
    referenceStart: tuple3(value.referenceStart),
    referenceEnd: tuple3(value.referenceEnd),
    startOffset: tuple3(value.startOffset),
    endOffset: tuple3(value.endOffset),
    elasticStart: tuple3(value.elasticStart),
    elasticEnd: tuple3(value.elasticEnd),
    referenceLength: value.referenceLength,
    elasticLength: value.elasticLength,
  });
}

function frozenAxes(value: LocalAxes): FrozenLocalAxes {
  return Object.freeze({
    x: tuple3(value.x),
    y: tuple3(value.y),
    z: tuple3(value.z),
    globalToLocal: tuple9(value.globalToLocal),
    localToGlobal: tuple9(value.localToGlobal),
  });
}

function validateCompleteness(model: ModelSnapshot): void {
  if (model.unitSystem === undefined) {
    throw new XFrameError(
      "UNITS_INVALID",
      "A model cannot be finalized without exact unit metadata.",
      {
        kind: "units",
        path: "units",
        reason: "unit system is missing",
      },
    );
  }
  if (model.nodes.length === 0) {
    throw new XFrameError("INPUT_INVALID", "A model cannot be finalized without nodes.", {
      kind: "input",
      path: "nodes",
      expected: "at least one node",
      actual: "0",
    });
  }
  if (model.frames.length + model.trusses.length + model.springs.length === 0) {
    throw new XFrameError(
      "INPUT_INVALID",
      "A model cannot be finalized without structural elements or springs.",
      {
        kind: "input",
        path: "elements",
        expected: "at least one frame, truss, or spring",
        actual: "0",
      },
    );
  }
}

export function finalizeModel(snapshotInput: ModelSnapshot): FinalizedModel {
  const snapshot = canonicalSnapshot(snapshotInput);
  validateCompleteness(snapshot);
  const references = resolveModelReferences(snapshot);

  const resolvedFrames: ResolvedFrameRecord[] = references.frames.map(
    ({ record, startNode, endNode, material, section }) => {
      assertFrameSectionSupportsTheory(section, record.theory);
      const geometry = resolveElasticGeometry(
        startNode.coordinates,
        endNode.coordinates,
        record.rigidOffsets?.start,
        record.rigidOffsets?.end,
      );
      const axes = buildLocalAxes(geometry.elasticStart, geometry.elasticEnd, record.orientation);
      return Object.freeze({
        record,
        startNode,
        endNode,
        material,
        section,
        geometry: frozenGeometry(geometry),
        axes: frozenAxes(axes),
      });
    },
  );

  const resolvedTrusses: ResolvedTrussRecord[] = references.trusses.map(
    ({ record, startNode, endNode, material, section }) => {
      const geometry = resolveElasticGeometry(
        startNode.coordinates,
        endNode.coordinates,
        record.rigidOffsets?.start,
        record.rigidOffsets?.end,
      );
      const direction = tuple3(
        normalizeVector3(subtractVector3(geometry.elasticEnd, geometry.elasticStart)),
      );
      return Object.freeze({
        record,
        startNode,
        endNode,
        material,
        section,
        geometry: frozenGeometry(geometry),
        direction,
      });
    },
  );

  const resolvedSprings: ResolvedSpringRecord[] = references.springs.map(
    ({ record, startNode, endNode }) =>
      Object.freeze({ record, startNode, ...(endNode === undefined ? {} : { endNode }) }),
  );

  const physicalDofs = derivePhysicalDofTopology(snapshot);
  const structuralFingerprint = computeModelFingerprint({
    ...snapshot,
    loadCases: [],
    combinations: [],
  });
  const loadCases = finalizeLoadCases(
    snapshot.loadCases,
    resolvedFrames,
    resolvedTrusses,
    new Set(snapshot.nodes.map(({ id }) => id)),
    `stiffness:${structuralFingerprint}`,
  );
  const resultGraph = validateResultGraph(snapshot.loadCases, snapshot.combinations);
  const fingerprint = computeModelFingerprint(snapshot);
  return Object.freeze({
    ...snapshot,
    unitSystem: snapshot.unitSystem!,
    finalized: true,
    loadCases,
    resolvedFrames: Object.freeze(resolvedFrames),
    resolvedTrusses: Object.freeze(resolvedTrusses),
    resolvedSprings: Object.freeze(resolvedSprings),
    physicalDofs,
    fingerprint,
    combinationEvaluationOrder: resultGraph.evaluationOrder,
  });
}
