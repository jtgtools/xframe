import { parseIdentifier, type EntityId } from "../model/identifier.js";
import type {
  CaseDiagnostics,
  CaseResult,
  CombinationResult,
  DofValueResult,
  FrameInternalForceStation,
  FrameResult,
  NodeResult,
  ResultConventions,
  SpringElementResult,
  StructuralResult,
  TrussElementResult,
} from "../results/result-types.js";
import { RESULT_SCHEMA_VERSION } from "./result-schema.js";
import {
  arrayAt,
  booleanAt,
  finiteAt,
  finiteVector,
  integerAt,
  literalAt,
  objectAt,
  parseJsonValue,
  schemaError,
  stringAt,
  unitSystemAt,
} from "./schema-validation.js";

const DOFS = ["tx", "ty", "tz", "rx", "ry", "rz"] as const;

function id(value: unknown, path: string): EntityId {
  const text = stringAt(value, path);
  try {
    return parseIdentifier(text, path);
  } catch {
    schemaError(path, "valid structural identifier", text);
  }
}

function numberArray(value: unknown, path: string, length?: number): readonly number[] {
  const array = length === undefined ? arrayAt(value, path) : finiteVector(value, path, length);
  return Object.freeze(array.map((entry, index) => finiteAt(entry, `${path}[${index}]`)));
}

function uniqueIds<T extends { readonly id: EntityId }>(values: readonly T[], path: string): readonly T[] {
  const ids = new Set<EntityId>();
  for (let index = 0; index < values.length; index += 1) {
    if (ids.has(values[index]!.id)) schemaError(`${path}[${index}].id`, "unique identifier", values[index]!.id);
    ids.add(values[index]!.id);
  }
  return Object.freeze(values);
}

function dofValues(value: unknown, path: string): readonly DofValueResult[] {
  const seen = new Set<string>();
  return Object.freeze(arrayAt(value, path).map((entry, index) => {
    const itemPath = `${path}[${index}]`;
    const record = objectAt(entry, itemPath, ["dof", "value"]);
    const dof = literalAt(record["dof"], `${itemPath}.dof`, DOFS);
    if (seen.has(dof)) schemaError(`${itemPath}.dof`, "unique active DOF", dof);
    seen.add(dof);
    return Object.freeze({ dof, value: finiteAt(record["value"], `${itemPath}.value`) });
  }));
}

function nodes(value: unknown): readonly NodeResult[] {
  return uniqueIds(arrayAt(value, "$.result.nodes").map((entry, index) => {
    const path = `$.result.nodes[${index}]`;
    const record = objectAt(entry, path, ["id", "coordinates", "displacements", "reactions"]);
    const displacements = dofValues(record["displacements"], `${path}.displacements`);
    const reactions = dofValues(record["reactions"], `${path}.reactions`);
    if (displacements.length !== reactions.length || displacements.some(({ dof }, dofIndex) => reactions[dofIndex]?.dof !== dof)) {
      schemaError(path, "matching displacement and reaction DOF layouts", entry);
    }
    return Object.freeze({
      id: id(record["id"], `${path}.id`),
      coordinates: finiteVector(record["coordinates"], `${path}.coordinates`, 3) as readonly [number, number, number],
      displacements,
      reactions,
    });
  }), "$.result.nodes");
}

function station(value: unknown, path: string): FrameInternalForceStation {
  const record = objectAt(value, path, ["x", "side", "axial", "shearY", "shearZ", "torsion", "bendingY", "bendingZ"]);
  return Object.freeze({
    x: finiteAt(record["x"], `${path}.x`),
    side: literalAt(record["side"], `${path}.side`, ["single", "left", "right"]),
    axial: finiteAt(record["axial"], `${path}.axial`),
    shearY: finiteAt(record["shearY"], `${path}.shearY`),
    shearZ: finiteAt(record["shearZ"], `${path}.shearZ`),
    torsion: finiteAt(record["torsion"], `${path}.torsion`),
    bendingY: finiteAt(record["bendingY"], `${path}.bendingY`),
    bendingZ: finiteAt(record["bendingZ"], `${path}.bendingZ`),
  });
}

function frames(value: unknown): readonly FrameResult[] {
  return uniqueIds(arrayAt(value, "$.result.frames").map((entry, index) => {
    const path = `$.result.frames[${index}]`;
    const record = objectAt(entry, path, ["id", "localEndDisplacements", "globalEndDisplacements", "localEndForces", "globalEndForces", "internalForces"]);
    const internalForces = Object.freeze(arrayAt(record["internalForces"], `${path}.internalForces`).map((item, stationIndex) => station(item, `${path}.internalForces[${stationIndex}]`)));
    for (let stationIndex = 1; stationIndex < internalForces.length; stationIndex += 1) {
      if (internalForces[stationIndex]!.x < internalForces[stationIndex - 1]!.x) schemaError(`${path}.internalForces`, "nondecreasing station coordinates", entry);
    }
    return Object.freeze({
      id: id(record["id"], `${path}.id`),
      localEndDisplacements: numberArray(record["localEndDisplacements"], `${path}.localEndDisplacements`, 12),
      globalEndDisplacements: numberArray(record["globalEndDisplacements"], `${path}.globalEndDisplacements`, 12),
      localEndForces: numberArray(record["localEndForces"], `${path}.localEndForces`, 12),
      globalEndForces: numberArray(record["globalEndForces"], `${path}.globalEndForces`, 12),
      internalForces,
    });
  }), "$.result.frames");
}

function trusses(value: unknown): readonly TrussElementResult[] {
  return uniqueIds(arrayAt(value, "$.result.trusses").map((entry, index) => {
    const path = `$.result.trusses[${index}]`;
    const record = objectAt(entry, path, ["id", "extension", "strain", "axialForce", "globalEndForces"]);
    return Object.freeze({
      id: id(record["id"], `${path}.id`),
      extension: finiteAt(record["extension"], `${path}.extension`),
      strain: finiteAt(record["strain"], `${path}.strain`),
      axialForce: finiteAt(record["axialForce"], `${path}.axialForce`),
      globalEndForces: numberArray(record["globalEndForces"], `${path}.globalEndForces`, 6),
    });
  }), "$.result.trusses");
}

function springs(value: unknown): readonly SpringElementResult[] {
  return uniqueIds(arrayAt(value, "$.result.springs").map((entry, index) => {
    const path = `$.result.springs[${index}]`;
    const record = objectAt(entry, path, ["id", "grounded", "globalEndForces"]);
    const grounded = booleanAt(record["grounded"], `${path}.grounded`);
    return Object.freeze({
      id: id(record["id"], `${path}.id`),
      grounded,
      globalEndForces: numberArray(record["globalEndForces"], `${path}.globalEndForces`, grounded ? 6 : 12),
    });
  }), "$.result.springs");
}

function diagnostics(value: unknown): CaseDiagnostics {
  const path = "$.result.diagnostics";
  const keys = [
    "status", "maximumAbsoluteResidual", "normalizedResidual", "forceEquilibrium", "momentEquilibrium",
    "normalizedForceEquilibrium", "normalizedMomentEquilibrium", "strainEnergy", "externalWork", "relativeEnergyError",
    "minimumNormalizedPivot", "minimumPivotEquation", "equationCount", "fullEquationCount", "fullNonzeros",
    "reducedNonzeros", "skylineStorage", "skylineMaximumRowWidth", "skylineBandwidth", "assemblyReused", "factorizationReused",
  ];
  const record = objectAt(value, path, keys);
  return Object.freeze({
    status: literalAt(record["status"], `${path}.status`, ["pass", "warn", "fail", "not-applicable"]),
    maximumAbsoluteResidual: finiteAt(record["maximumAbsoluteResidual"], `${path}.maximumAbsoluteResidual`),
    normalizedResidual: finiteAt(record["normalizedResidual"], `${path}.normalizedResidual`),
    forceEquilibrium: finiteVector(record["forceEquilibrium"], `${path}.forceEquilibrium`, 3) as readonly [number, number, number],
    momentEquilibrium: finiteVector(record["momentEquilibrium"], `${path}.momentEquilibrium`, 3) as readonly [number, number, number],
    normalizedForceEquilibrium: finiteAt(record["normalizedForceEquilibrium"], `${path}.normalizedForceEquilibrium`),
    normalizedMomentEquilibrium: finiteAt(record["normalizedMomentEquilibrium"], `${path}.normalizedMomentEquilibrium`),
    strainEnergy: finiteAt(record["strainEnergy"], `${path}.strainEnergy`),
    externalWork: finiteAt(record["externalWork"], `${path}.externalWork`),
    relativeEnergyError: finiteAt(record["relativeEnergyError"], `${path}.relativeEnergyError`),
    minimumNormalizedPivot: finiteAt(record["minimumNormalizedPivot"], `${path}.minimumNormalizedPivot`),
    minimumPivotEquation: integerAt(record["minimumPivotEquation"], `${path}.minimumPivotEquation`, -1),
    equationCount: integerAt(record["equationCount"], `${path}.equationCount`, 0),
    fullEquationCount: integerAt(record["fullEquationCount"], `${path}.fullEquationCount`, 0),
    fullNonzeros: integerAt(record["fullNonzeros"], `${path}.fullNonzeros`, 0),
    reducedNonzeros: integerAt(record["reducedNonzeros"], `${path}.reducedNonzeros`, 0),
    skylineStorage: integerAt(record["skylineStorage"], `${path}.skylineStorage`, 0),
    skylineMaximumRowWidth: integerAt(record["skylineMaximumRowWidth"], `${path}.skylineMaximumRowWidth`, 0),
    skylineBandwidth: integerAt(record["skylineBandwidth"], `${path}.skylineBandwidth`, 0),
    assemblyReused: booleanAt(record["assemblyReused"], `${path}.assemblyReused`),
    factorizationReused: booleanAt(record["factorizationReused"], `${path}.factorizationReused`),
  });
}

function conventions(value: unknown): ResultConventions {
  const path = "$.result.conventions";
  const record = objectAt(value, path, ["coordinateSystem", "rotations", "frameEndForces", "internalForces"]);
  return Object.freeze({
    coordinateSystem: literalAt(record["coordinateSystem"], `${path}.coordinateSystem`, ["global-node-local-member"]),
    rotations: literalAt(record["rotations"], `${path}.rotations`, ["radians-right-hand-rule"]),
    frameEndForces: literalAt(record["frameEndForces"], `${path}.frameEndForces`, ["element-on-node"]),
    internalForces: literalAt(record["internalForces"], `${path}.internalForces`, ["positive-local-cut-face"]),
  });
}

function common(record: Readonly<Record<string, unknown>>) {
  const fullDisplacements = numberArray(record["fullDisplacements"], "$.result.fullDisplacements");
  const fullLoad = numberArray(record["fullLoad"], "$.result.fullLoad");
  const fullResidual = numberArray(record["fullResidual"], "$.result.fullResidual");
  if (fullLoad.length !== fullDisplacements.length || fullResidual.length !== fullDisplacements.length) {
    schemaError("$.result", "matching full vector lengths", record);
  }
  return {
    id: id(record["id"], "$.result.id"),
    modelFingerprint: stringAt(record["modelFingerprint"], "$.result.modelFingerprint"),
    unitSystem: unitSystemAt(record["unitSystem"], "$.result.unitSystem"),
    conventions: conventions(record["conventions"]),
    fullDisplacements,
    reducedDisplacements: numberArray(record["reducedDisplacements"], "$.result.reducedDisplacements"),
    fullLoad,
    fullResidual,
    nodes: nodes(record["nodes"]),
    frames: frames(record["frames"]),
    trusses: trusses(record["trusses"]),
    springs: springs(record["springs"]),
    diagnostics: diagnostics(record["diagnostics"]),
  };
}

/** Parses JSON text or an unknown JSON value into a fully validated immutable result. */
export function parseResultJson(input: unknown): StructuralResult {
  const value = parseJsonValue(input);
  const root = objectAt(value, "$", ["schemaVersion", "result"]);
  if (root["schemaVersion"] !== RESULT_SCHEMA_VERSION) {
    schemaError("$.schemaVersion", `schema version ${RESULT_SCHEMA_VERSION}`, root["schemaVersion"], "SCHEMA_UNSUPPORTED", String(root["schemaVersion"]));
  }
  const kindValue = objectAt(
    root["result"],
    "$.result",
    [
      "kind",
      "id",
      "modelFingerprint",
      "unitSystem",
      "conventions",
      "fullDisplacements",
      "reducedDisplacements",
      "fullLoad",
      "fullResidual",
      "nodes",
      "frames",
      "trusses",
      "springs",
      "diagnostics",
      "provenance",
      "factors",
    ],
    ["kind"],
  );
  const kind = literalAt(kindValue["kind"], "$.result.kind", ["case", "combination"]);
  const commonKeys = ["kind", "id", "modelFingerprint", "unitSystem", "conventions", "fullDisplacements", "reducedDisplacements", "fullLoad", "fullResidual", "nodes", "frames", "trusses", "springs", "diagnostics"];
  if (kind === "case") {
    const record = objectAt(root["result"], "$.result", [...commonKeys, "provenance"]);
    const provenance = Object.freeze(arrayAt(record["provenance"], "$.result.provenance").map((entry, index) => {
      const path = `$.result.provenance[${index}]`;
      const item = objectAt(entry, path, ["loadIndex", "kind", "targetIds"]);
      return Object.freeze({
        loadIndex: integerAt(item["loadIndex"], `${path}.loadIndex`, 0),
        kind: literalAt(item["kind"], `${path}.kind`, ["nodal", "member-point-force", "member-point-moment", "member-distributed", "self-weight"]),
        targetIds: Object.freeze(arrayAt(item["targetIds"], `${path}.targetIds`).map((target, targetIndex) => id(target, `${path}.targetIds[${targetIndex}]`))),
      });
    }));
    return Object.freeze({ kind, ...common(record), provenance }) as CaseResult;
  }
  const record = objectAt(root["result"], "$.result", [...commonKeys, "factors"]);
  const seen = new Set<EntityId>();
  const factors = Object.freeze(arrayAt(record["factors"], "$.result.factors").map((entry, index) => {
    const path = `$.result.factors[${index}]`;
    const item = objectAt(entry, path, ["resultId", "factor"]);
    const resultId = id(item["resultId"], `${path}.resultId`);
    if (seen.has(resultId)) schemaError(`${path}.resultId`, "unique source result identifier", resultId);
    seen.add(resultId);
    return Object.freeze({ resultId, factor: finiteAt(item["factor"], `${path}.factor`) });
  }));
  if (factors.length === 0) schemaError("$.result.factors", "nonempty factor array", factors);
  return Object.freeze({ kind, ...common(record), factors }) as CombinationResult;
}
