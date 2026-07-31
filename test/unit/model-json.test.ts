import { expect, it } from "vitest";
import { XFrameError } from "../../src/errors/xframe-error.js";
import { canonicalJson } from "../../src/serialization/canonical-json.js";
import { modelToJsonValue } from "../../src/serialization/model-schema.js";
import { parseModelJson } from "../../src/serialization/parse-model-json.js";

const unitSystem = {
  version: "1",
  length: "m",
  force: "N",
  moment: "N*m",
  modulus: "Pa",
  distributedForce: "N/m",
  density: "kg/m^3",
  rotation: "rad",
} as const;

function completeModelJson(): unknown {
  return {
    schemaVersion: "1",
    unitSystem,
    nodes: [
      { id: "a", coordinates: [0, 0, 0] },
      { id: "b", coordinates: [4, 0, 0] },
      { id: "c", coordinates: [4, 3, 0] },
    ],
    materials: [{ id: "steel", elasticModulus: 200e9, poissonRatio: 0.3, density: 7850 }],
    frameSections: [{ id: "beam", area: 0.02, torsionalConstant: 1e-5, momentOfInertiaY: 2e-5, momentOfInertiaZ: 3e-5, shearAreaY: 0.015, shearAreaZ: 0.014 }],
    trussSections: [{ id: "bar", area: 0.001 }],
    frames: [{ id: "f", startNodeId: "a", endNodeId: "b", materialId: "steel", sectionId: "beam", theory: { kind: "timoshenko" }, orientation: [0, 1, 0], releases: { end: ["rz"] }, rigidOffsets: { start: [0.1, 0, 0], end: [-0.1, 0, 0] } }],
    trusses: [{ id: "t", startNodeId: "b", endNodeId: "c", materialId: "steel", sectionId: "bar" }],
    springs: [{ id: "k", startNodeId: "c", stiffness: [1000, 2000, 3000, 0, 0, 0] }],
    constraints: [
      { id: "ax", terms: [{ nodeId: "a", dof: "tx", coefficient: 1 }], rightHandSide: 0 },
      { id: "ay", terms: [{ nodeId: "a", dof: "ty", coefficient: 1 }], rightHandSide: 0 },
      { id: "az", terms: [{ nodeId: "a", dof: "tz", coefficient: 1 }], rightHandSide: 0 },
      { id: "arx", terms: [{ nodeId: "a", dof: "rx", coefficient: 1 }], rightHandSide: 0 },
      { id: "ary", terms: [{ nodeId: "a", dof: "ry", coefficient: 1 }], rightHandSide: 0 },
      { id: "arz", terms: [{ nodeId: "a", dof: "rz", coefficient: 1 }], rightHandSide: 0 },
    ],
    loadCases: [
      { id: "L", loads: [
        { kind: "nodal", nodeId: "c", force: [1, -2, 3], moment: [4, 5, 6] },
        { kind: "member-point-force", frameId: "f", coordinateSystem: "local", positionRatio: 0.25, force: [0, -10, 0] },
        { kind: "member-point-moment", frameId: "f", coordinateSystem: "global", distanceFromElasticStart: 1, moment: [0, 0, 2] },
        { kind: "member-distributed", frameId: "f", coordinateSystem: "local", startPositionRatio: 0.2, endPositionRatio: 0.8, startIntensity: [0, -1, 0], endIntensity: [0, -2, 0] },
        { kind: "self-weight", gravity: [0, -9.81, 0], frameIds: ["f"], trussIds: ["t"] },
      ] },
    ],
    combinations: [{ id: "U", factors: [{ resultId: "L", factor: 1.5 }] }],
  };
}

it("FR-JSON-001/FR-JSON-003/FR-JSON-005: parses the complete version-one model boundary", () => {
  const model = parseModelJson(completeModelJson());
  expect(model.finalized).toBe(true);
  expect(model.frames[0]!.theory.kind).toBe("timoshenko");
  expect(model.loadCases[0]!.loads.map(({ kind }) => kind)).toEqual([
    "nodal",
    "member-point-force",
    "member-point-moment",
    "member-distributed",
    "self-weight",
  ]);
  expect(model.combinationEvaluationOrder).toEqual(["U"]);
});

it("FR-JSON-006: model canonical output round-trips byte-for-byte and normalizes negative zero", () => {
  const input = completeModelJson() as Record<string, unknown>;
  ((input["nodes"] as { coordinates: number[] }[])[0]!.coordinates)[0] = -0;
  const model = parseModelJson(input);
  const first = canonicalJson(modelToJsonValue(model));
  const second = canonicalJson(modelToJsonValue(parseModelJson(first)));
  expect(second).toBe(first);
  expect(first).toContain("\"coordinates\":[0,0,0]");
});

it("FR-JSON-002/FR-JSON-003/FR-JSON-004: rejects malformed, ambiguous, hostile, and non-finite model values", () => {
  const valid = completeModelJson() as Record<string, unknown>;
  const malformed: unknown[] = [
    { ...valid, schemaVersion: "2" },
    { ...valid, nodes: undefined },
    { ...valid, csv: "nodes.csv" },
    { ...valid, nodes: [{ id: "a", coordinates: [0, 0] }] },
    { ...valid, nodes: [{ id: "__proto__", coordinates: [0, 0, Number.NaN] }] },
    { ...valid, loadCases: [{ id: "L", loads: [{ kind: "member-point-force", frameId: "f", coordinateSystem: "local", position: 1, force: [0, -1, 0] }] }] },
    JSON.parse('{"schemaVersion":"1","unitSystem":{},"nodes":[],"materials":[],"frameSections":[],"trussSections":[],"frames":[],"trusses":[],"springs":[],"constraints":[],"loadCases":[],"combinations":[],"__proto__":{}}'),
  ];
  for (const value of malformed) expect(() => parseModelJson(value)).toThrowError(XFrameError);
});

it("FR-JSON-003: rejects a null load with its exact array path", () => {
  const value = completeModelJson() as Record<string, unknown>;
  value["loadCases"] = [{ id: "L", loads: [null] }];
  try {
    parseModelJson(value);
    throw new Error("expected schema failure");
  } catch (error) {
    expect(error).toBeInstanceOf(XFrameError);
    expect((error as XFrameError).code).toBe("SCHEMA_INVALID");
    const context = (error as XFrameError).context;
    expect(context.kind).toBe("schema");
    expect(context.kind === "schema" ? context.path : undefined).toBe("$.loadCases[0].loads[0]");
  }
});

it("FR-JSON-003: reports an exact schema field path", () => {
  const value = completeModelJson() as Record<string, unknown>;
  value["nodes"] = [{ id: "a", coordinates: [0, 0] }];
  try {
    parseModelJson(value);
    throw new Error("expected schema failure");
  } catch (error) {
    expect(error).toBeInstanceOf(XFrameError);
    expect((error as XFrameError).code).toBe("SCHEMA_INVALID");
    const context = (error as XFrameError).context;
    expect(context.kind).toBe("schema");
    expect(context.kind === "schema" ? context.path : undefined).toBe("$.nodes[0].coordinates");
  }
});
