import type { LoadInput } from "../loads/load-types.js";
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
import { createModelBuilder, type ModelBatchInput } from "../model/model-builder.js";
import type { FinalizedModel } from "../model/finalized-model.js";
import { MODEL_SCHEMA_VERSION } from "./model-schema.js";
import {
  arrayAt,
  finiteAt,
  finiteVector,
  literalAt,
  objectAt,
  parseJsonValue,
  schemaError,
  stringAt,
  unitSystemAt,
} from "./schema-validation.js";

const TOP_KEYS = [
  "schemaVersion",
  "unitSystem",
  "nodes",
  "materials",
  "frameSections",
  "trussSections",
  "frames",
  "trusses",
  "springs",
  "constraints",
  "loadCases",
  "combinations",
] as const;
const DOFS = ["ux", "uy", "uz", "rx", "ry", "rz"] as const;

function id(value: unknown, path: string): string {
  return stringAt(value, path);
}

function nodes(value: unknown): readonly NodeInput[] {
  return arrayAt(value, "$.nodes").map((entry, index) => {
    const path = `$.nodes[${index}]`;
    const record = objectAt(entry, path, ["id", "coordinates"]);
    return {
      id: id(record["id"], `${path}.id`),
      coordinates: finiteVector(record["coordinates"], `${path}.coordinates`, 3),
    };
  });
}

function materials(value: unknown): readonly MaterialInput[] {
  return arrayAt(value, "$.materials").map((entry, index) => {
    const path = `$.materials[${index}]`;
    const record = objectAt(
      entry,
      path,
      ["id", "elasticModulus", "shearModulus", "poissonRatio", "density"],
      ["id"],
    );
    return {
      id: id(record["id"], `${path}.id`),
      ...(record["elasticModulus"] === undefined
        ? {}
        : { elasticModulus: finiteAt(record["elasticModulus"], `${path}.elasticModulus`) }),
      ...(record["shearModulus"] === undefined
        ? {}
        : { shearModulus: finiteAt(record["shearModulus"], `${path}.shearModulus`) }),
      ...(record["poissonRatio"] === undefined
        ? {}
        : { poissonRatio: finiteAt(record["poissonRatio"], `${path}.poissonRatio`) }),
      ...(record["density"] === undefined
        ? {}
        : { density: finiteAt(record["density"], `${path}.density`) }),
    };
  });
}

function frameSections(value: unknown): readonly FrameSectionInput[] {
  const required = ["id", "area", "torsionalConstant", "momentOfInertiaY", "momentOfInertiaZ"];
  return arrayAt(value, "$.frameSections").map((entry, index) => {
    const path = `$.frameSections[${index}]`;
    const record = objectAt(entry, path, [...required, "shearAreaY", "shearAreaZ"], required);
    return {
      id: id(record["id"], `${path}.id`),
      area: finiteAt(record["area"], `${path}.area`),
      torsionalConstant: finiteAt(record["torsionalConstant"], `${path}.torsionalConstant`),
      momentOfInertiaY: finiteAt(record["momentOfInertiaY"], `${path}.momentOfInertiaY`),
      momentOfInertiaZ: finiteAt(record["momentOfInertiaZ"], `${path}.momentOfInertiaZ`),
      ...(record["shearAreaY"] === undefined
        ? {}
        : { shearAreaY: finiteAt(record["shearAreaY"], `${path}.shearAreaY`) }),
      ...(record["shearAreaZ"] === undefined
        ? {}
        : { shearAreaZ: finiteAt(record["shearAreaZ"], `${path}.shearAreaZ`) }),
    };
  });
}

function trussSections(value: unknown): readonly TrussSectionInput[] {
  return arrayAt(value, "$.trussSections").map((entry, index) => {
    const path = `$.trussSections[${index}]`;
    const record = objectAt(entry, path, ["id", "area"]);
    return { id: id(record["id"], `${path}.id`), area: finiteAt(record["area"], `${path}.area`) };
  });
}

function rigidOffsets(value: unknown, path: string): NonNullable<FrameInput["rigidOffsets"]> {
  const record = objectAt(value, path, ["start", "end"], []);
  return {
    ...(record["start"] === undefined
      ? {}
      : { start: finiteVector(record["start"], `${path}.start`, 3) }),
    ...(record["end"] === undefined ? {} : { end: finiteVector(record["end"], `${path}.end`, 3) }),
  };
}

function frames(value: unknown): readonly FrameInput[] {
  const required = ["id", "startNodeId", "endNodeId", "materialId", "sectionId", "theory"];
  return arrayAt(value, "$.frames").map((entry, index) => {
    const path = `$.frames[${index}]`;
    const record = objectAt(
      entry,
      path,
      [...required, "orientation", "releases", "rigidOffsets"],
      required,
    );
    const theory = objectAt(record["theory"], `${path}.theory`, ["kind"]);
    let releases: FrameInput["releases"];
    if (record["releases"] !== undefined) {
      const releaseRecord = objectAt(record["releases"], `${path}.releases`, ["start", "end"], []);
      const parseEnd = (key: "start" | "end") =>
        releaseRecord[key] === undefined
          ? undefined
          : arrayAt(releaseRecord[key], `${path}.releases.${key}`).map((dof, dofIndex) =>
              literalAt(dof, `${path}.releases.${key}[${dofIndex}]`, DOFS),
            );
      const start = parseEnd("start");
      const end = parseEnd("end");
      releases = {
        ...(start === undefined ? {} : { start }),
        ...(end === undefined ? {} : { end }),
      };
    }
    return {
      id: id(record["id"], `${path}.id`),
      startNodeId: id(record["startNodeId"], `${path}.startNodeId`),
      endNodeId: id(record["endNodeId"], `${path}.endNodeId`),
      materialId: id(record["materialId"], `${path}.materialId`),
      sectionId: id(record["sectionId"], `${path}.sectionId`),
      theory: {
        kind: literalAt(theory["kind"], `${path}.theory.kind`, ["euler-bernoulli", "timoshenko"]),
      },
      ...(record["orientation"] === undefined
        ? {}
        : { orientation: finiteVector(record["orientation"], `${path}.orientation`, 3) }),
      ...(releases === undefined ? {} : { releases }),
      ...(record["rigidOffsets"] === undefined
        ? {}
        : { rigidOffsets: rigidOffsets(record["rigidOffsets"], `${path}.rigidOffsets`) }),
    };
  });
}

function trusses(value: unknown): readonly TrussInput[] {
  const required = ["id", "startNodeId", "endNodeId", "materialId", "sectionId"];
  return arrayAt(value, "$.trusses").map((entry, index) => {
    const path = `$.trusses[${index}]`;
    const record = objectAt(entry, path, [...required, "rigidOffsets"], required);
    return {
      id: id(record["id"], `${path}.id`),
      startNodeId: id(record["startNodeId"], `${path}.startNodeId`),
      endNodeId: id(record["endNodeId"], `${path}.endNodeId`),
      materialId: id(record["materialId"], `${path}.materialId`),
      sectionId: id(record["sectionId"], `${path}.sectionId`),
      ...(record["rigidOffsets"] === undefined
        ? {}
        : { rigidOffsets: rigidOffsets(record["rigidOffsets"], `${path}.rigidOffsets`) }),
    };
  });
}

function springs(value: unknown): readonly SpringInput[] {
  return arrayAt(value, "$.springs").map((entry, index) => {
    const path = `$.springs[${index}]`;
    const record = objectAt(
      entry,
      path,
      ["id", "startNodeId", "endNodeId", "stiffness"],
      ["id", "startNodeId", "stiffness"],
    );
    return {
      id: id(record["id"], `${path}.id`),
      startNodeId: id(record["startNodeId"], `${path}.startNodeId`),
      ...(record["endNodeId"] === undefined
        ? {}
        : { endNodeId: id(record["endNodeId"], `${path}.endNodeId`) }),
      stiffness: finiteVector(record["stiffness"], `${path}.stiffness`, 6),
    };
  });
}

function constraints(value: unknown): readonly ConstraintInput[] {
  return arrayAt(value, "$.constraints").map((entry, index) => {
    const path = `$.constraints[${index}]`;
    const record = objectAt(entry, path, ["id", "terms", "rightHandSide"]);
    const terms = arrayAt(record["terms"], `${path}.terms`).map((term, termIndex) => {
      const termPath = `${path}.terms[${termIndex}]`;
      const termRecord = objectAt(term, termPath, ["nodeId", "dof", "coefficient"]);
      return {
        nodeId: id(termRecord["nodeId"], `${termPath}.nodeId`),
        dof: literalAt(termRecord["dof"], `${termPath}.dof`, DOFS),
        coefficient: finiteAt(termRecord["coefficient"], `${termPath}.coefficient`),
      };
    });
    return {
      id: id(record["id"], `${path}.id`),
      terms,
      rightHandSide: finiteAt(record["rightHandSide"], `${path}.rightHandSide`),
    };
  });
}

function vectorProperty(
  record: Readonly<Record<string, unknown>>,
  key: string,
  path: string,
): readonly number[] | undefined {
  return record[key] === undefined ? undefined : finiteVector(record[key], `${path}.${key}`, 3);
}

function load(value: unknown, path: string): LoadInput {
  const kindRecord = objectAt(
    value,
    path,
    [
      "kind",
      "nodeId",
      "force",
      "moment",
      "frameId",
      "coordinateSystem",
      "distanceFromElasticStart",
      "positionRatio",
      "startDistanceFromElasticStart",
      "endDistanceFromElasticStart",
      "startPositionRatio",
      "endPositionRatio",
      "startIntensity",
      "endIntensity",
      "gravity",
      "frameIds",
      "trussIds",
    ],
    ["kind"],
  );
  const kind = literalAt(kindRecord["kind"], `${path}.kind`, [
    "nodal",
    "member-point-force",
    "member-point-moment",
    "member-distributed",
    "self-weight",
  ]);
  if (kind === "nodal") {
    const record = objectAt(value, path, ["kind", "nodeId", "force", "moment"], ["kind", "nodeId"]);
    return {
      kind,
      nodeId: id(record["nodeId"], `${path}.nodeId`),
      ...(vectorProperty(record, "force", path) === undefined
        ? {}
        : { force: vectorProperty(record, "force", path)! }),
      ...(vectorProperty(record, "moment", path) === undefined
        ? {}
        : { moment: vectorProperty(record, "moment", path)! }),
    };
  }
  if (kind === "member-point-force" || kind === "member-point-moment") {
    const vectorKey = kind === "member-point-force" ? "force" : "moment";
    const record = objectAt(
      value,
      path,
      [
        "kind",
        "frameId",
        "coordinateSystem",
        "distanceFromElasticStart",
        "positionRatio",
        vectorKey,
      ],
      ["kind", "frameId", "coordinateSystem", vectorKey],
    );
    const common = {
      kind,
      frameId: id(record["frameId"], `${path}.frameId`),
      coordinateSystem: literalAt(record["coordinateSystem"], `${path}.coordinateSystem`, [
        "local",
        "global",
      ]),
      ...(record["distanceFromElasticStart"] === undefined
        ? {}
        : {
            distanceFromElasticStart: finiteAt(
              record["distanceFromElasticStart"],
              `${path}.distanceFromElasticStart`,
            ),
          }),
      ...(record["positionRatio"] === undefined
        ? {}
        : { positionRatio: finiteAt(record["positionRatio"], `${path}.positionRatio`) }),
    };
    return kind === "member-point-force"
      ? { ...common, kind, force: finiteVector(record[vectorKey], `${path}.${vectorKey}`, 3) }
      : { ...common, kind, moment: finiteVector(record[vectorKey], `${path}.${vectorKey}`, 3) };
  }
  if (kind === "member-distributed") {
    const record = objectAt(
      value,
      path,
      [
        "kind",
        "frameId",
        "coordinateSystem",
        "startDistanceFromElasticStart",
        "endDistanceFromElasticStart",
        "startPositionRatio",
        "endPositionRatio",
        "startIntensity",
        "endIntensity",
      ],
      ["kind", "frameId", "coordinateSystem", "startIntensity", "endIntensity"],
    );
    return {
      kind,
      frameId: id(record["frameId"], `${path}.frameId`),
      coordinateSystem: literalAt(record["coordinateSystem"], `${path}.coordinateSystem`, [
        "local",
        "global",
      ]),
      ...(record["startDistanceFromElasticStart"] === undefined
        ? {}
        : {
            startDistanceFromElasticStart: finiteAt(
              record["startDistanceFromElasticStart"],
              `${path}.startDistanceFromElasticStart`,
            ),
          }),
      ...(record["endDistanceFromElasticStart"] === undefined
        ? {}
        : {
            endDistanceFromElasticStart: finiteAt(
              record["endDistanceFromElasticStart"],
              `${path}.endDistanceFromElasticStart`,
            ),
          }),
      ...(record["startPositionRatio"] === undefined
        ? {}
        : {
            startPositionRatio: finiteAt(
              record["startPositionRatio"],
              `${path}.startPositionRatio`,
            ),
          }),
      ...(record["endPositionRatio"] === undefined
        ? {}
        : { endPositionRatio: finiteAt(record["endPositionRatio"], `${path}.endPositionRatio`) }),
      startIntensity: finiteVector(record["startIntensity"], `${path}.startIntensity`, 3),
      endIntensity: finiteVector(record["endIntensity"], `${path}.endIntensity`, 3),
    };
  }
  const record = objectAt(
    value,
    path,
    ["kind", "gravity", "frameIds", "trussIds"],
    ["kind", "gravity"],
  );
  const ids = (key: "frameIds" | "trussIds") =>
    record[key] === undefined
      ? undefined
      : arrayAt(record[key], `${path}.${key}`).map((entry, index) =>
          id(entry, `${path}.${key}[${index}]`),
        );
  const frameIds = ids("frameIds");
  const trussIds = ids("trussIds");
  return {
    kind,
    gravity: finiteVector(record["gravity"], `${path}.gravity`, 3),
    ...(frameIds === undefined ? {} : { frameIds }),
    ...(trussIds === undefined ? {} : { trussIds }),
  };
}

function loadCases(value: unknown): readonly LoadCaseInput[] {
  return arrayAt(value, "$.loadCases").map((entry, index) => {
    const path = `$.loadCases[${index}]`;
    const record = objectAt(entry, path, ["id", "loads"]);
    return {
      id: id(record["id"], `${path}.id`),
      loads: arrayAt(record["loads"], `${path}.loads`).map((loadEntry, loadIndex) =>
        load(loadEntry, `${path}.loads[${loadIndex}]`),
      ),
    };
  });
}

function combinations(value: unknown): readonly CombinationInput[] {
  return arrayAt(value, "$.combinations").map((entry, index) => {
    const path = `$.combinations[${index}]`;
    const record = objectAt(entry, path, ["id", "factors"]);
    return {
      id: id(record["id"], `${path}.id`),
      factors: arrayAt(record["factors"], `${path}.factors`).map((factor, factorIndex) => {
        const factorPath = `${path}.factors[${factorIndex}]`;
        const factorRecord = objectAt(factor, factorPath, ["resultId", "factor"]);
        return {
          resultId: id(factorRecord["resultId"], `${factorPath}.resultId`),
          factor: finiteAt(factorRecord["factor"], `${factorPath}.factor`),
        };
      }),
    };
  });
}

/** Parses JSON text or an unknown JSON value into a fully validated finalized model. */
export function parseModelJson(input: unknown): FinalizedModel {
  const value = parseJsonValue(input);
  const root = objectAt(value, "$", TOP_KEYS);
  if (root["schemaVersion"] !== MODEL_SCHEMA_VERSION) {
    schemaError(
      "$.schemaVersion",
      `schema version ${MODEL_SCHEMA_VERSION}`,
      root["schemaVersion"],
      "SCHEMA_UNSUPPORTED",
      String(root["schemaVersion"]),
    );
  }
  const batch: ModelBatchInput = {
    unitSystem: unitSystemAt(root["unitSystem"], "$.unitSystem"),
    nodes: nodes(root["nodes"]),
    materials: materials(root["materials"]),
    frameSections: frameSections(root["frameSections"]),
    trussSections: trussSections(root["trussSections"]),
    frames: frames(root["frames"]),
    trusses: trusses(root["trusses"]),
    springs: springs(root["springs"]),
    constraints: constraints(root["constraints"]),
    loadCases: loadCases(root["loadCases"]),
    combinations: combinations(root["combinations"]),
  };
  return createModelBuilder().addBatch(batch).finalize();
}
