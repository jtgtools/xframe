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
    frameSections: [
      {
        id: "beam",
        area: 0.02,
        torsionalConstant: 1e-5,
        momentOfInertiaY: 2e-5,
        momentOfInertiaZ: 3e-5,
        shearAreaY: 0.015,
        shearAreaZ: 0.014,
      },
    ],
    trussSections: [{ id: "bar", area: 0.001 }],
    frames: [
      {
        id: "f",
        startNodeId: "a",
        endNodeId: "b",
        materialId: "steel",
        sectionId: "beam",
        theory: { kind: "timoshenko" },
        orientation: [0, 1, 0],
        releases: { end: ["rz"] },
        rigidOffsets: { start: [0.1, 0, 0], end: [-0.1, 0, 0] },
      },
    ],
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
      {
        id: "L",
        loads: [
          { kind: "nodal", nodeId: "c", force: [1, -2, 3], moment: [4, 5, 6] },
          {
            kind: "member-point-force",
            frameId: "f",
            coordinateSystem: "local",
            positionRatio: 0.25,
            force: [0, -10, 0],
          },
          {
            kind: "member-point-moment",
            frameId: "f",
            coordinateSystem: "global",
            distanceFromElasticStart: 1,
            moment: [0, 0, 2],
          },
          {
            kind: "member-distributed",
            frameId: "f",
            coordinateSystem: "local",
            startPositionRatio: 0.2,
            endPositionRatio: 0.8,
            startIntensity: [0, -1, 0],
            endIntensity: [0, -2, 0],
          },
          { kind: "self-weight", gravity: [0, -9.81, 0], frameIds: ["f"], trussIds: ["t"] },
        ],
      },
    ],
    combinations: [{ id: "U", factors: [{ resultId: "L", factor: 1.5 }] }],
  };
}

function xframeFailure(action: () => unknown): XFrameError {
  try {
    action();
  } catch (error) {
    if (error instanceof XFrameError) return error;
    throw error;
  }
  throw new Error("Expected an XFrame error.");
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
  (input["nodes"] as { coordinates: number[] }[])[0]!.coordinates[0] = -0;
  const model = parseModelJson(input);
  const first = canonicalJson(modelToJsonValue(model));
  const second = canonicalJson(modelToJsonValue(parseModelJson(first)));
  expect(second).toBe(first);
  expect(first).toContain('"coordinates":[0,0,0]');
});

it("FR-JSON-002/FR-JSON-003/FR-JSON-004: rejects malformed, ambiguous, hostile, and non-finite model values", () => {
  const valid = completeModelJson() as Record<string, unknown>;
  const malformed: unknown[] = [
    { ...valid, schemaVersion: "2" },
    { ...valid, nodes: undefined },
    { ...valid, csv: "nodes.csv" },
    { ...valid, nodes: [{ id: "a", coordinates: [0, 0] }] },
    { ...valid, nodes: [{ id: "__proto__", coordinates: [0, 0, Number.NaN] }] },
    {
      ...valid,
      loadCases: [
        {
          id: "L",
          loads: [
            {
              kind: "member-point-force",
              frameId: "f",
              coordinateSystem: "local",
              position: 1,
              force: [0, -1, 0],
            },
          ],
        },
      ],
    },
    JSON.parse(
      '{"schemaVersion":"1","unitSystem":{},"nodes":[],"materials":[],"frameSections":[],"trussSections":[],"frames":[],"trusses":[],"springs":[],"constraints":[],"loadCases":[],"combinations":[],"__proto__":{}}',
    ),
  ];
  for (const value of malformed) expect(() => parseModelJson(value)).toThrowError(XFrameError);
});

it("FR-JSON-003: rejects a null load with its exact array path", () => {
  const value = completeModelJson() as Record<string, unknown>;
  value["loadCases"] = [{ id: "L", loads: [null] }];
  let caught: unknown;
  try {
    parseModelJson(value);
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(XFrameError);
  if (!(caught instanceof XFrameError)) throw new Error("Expected schema failure.");
  expect(caught.code).toBe("SCHEMA_INVALID");
  const context = caught.context;
  expect(context.kind).toBe("schema");
  if (context.kind !== "schema") throw new Error("Expected schema context.");
  expect(context.path).toBe("$.loadCases[0].loads[0]");
});

it("FR-JSON-003: reports an exact schema field path", () => {
  const value = completeModelJson() as Record<string, unknown>;
  value["nodes"] = [{ id: "a", coordinates: [0, 0] }];
  let caught: unknown;
  try {
    parseModelJson(value);
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(XFrameError);
  if (!(caught instanceof XFrameError)) throw new Error("Expected schema failure.");
  expect(caught.code).toBe("SCHEMA_INVALID");
  const context = caught.context;
  expect(context.kind).toBe("schema");
  if (context.kind !== "schema") throw new Error("Expected schema context.");
  expect(context.path).toBe("$.nodes[0].coordinates");
});

it("FR-JSON-001/FR-JSON-003: preserves omitted optional model forms without materializing them", () => {
  const input = completeModelJson() as Record<string, unknown>;
  input["materials"] = [{ id: "steel", elasticModulus: 200e9, poissonRatio: 0.3 }];
  input["frameSections"] = [
    {
      id: "beam",
      area: 0.02,
      torsionalConstant: 1e-5,
      momentOfInertiaY: 2e-5,
      momentOfInertiaZ: 3e-5,
    },
  ];
  input["frames"] = [
    {
      id: "f",
      startNodeId: "a",
      endNodeId: "b",
      materialId: "steel",
      sectionId: "beam",
      theory: { kind: "euler-bernoulli" },
    },
  ];
  input["trusses"] = [
    { id: "t", startNodeId: "b", endNodeId: "c", materialId: "steel", sectionId: "bar" },
  ];
  input["loadCases"] = [
    {
      id: "L",
      loads: [
        { kind: "nodal", nodeId: "c", force: [1, -2, 3] },
        {
          kind: "member-point-force",
          frameId: "f",
          coordinateSystem: "local",
          distanceFromElasticStart: 1,
          force: [0, -10, 0],
        },
        {
          kind: "member-point-moment",
          frameId: "f",
          coordinateSystem: "global",
          positionRatio: 0.25,
          moment: [0, 0, 2],
        },
        {
          kind: "member-distributed",
          frameId: "f",
          coordinateSystem: "local",
          startIntensity: [0, -1, 0],
          endIntensity: [0, -2, 0],
        },
      ],
    },
  ];

  const serialized = modelToJsonValue(parseModelJson(input));
  const frame = serialized.frames[0]!;
  const truss = serialized.trusses[0]!;
  const loads = serialized.loadCases[0]?.loads;
  if (loads === undefined) throw new Error("Expected the serialized load case.");

  expect(frame).not.toHaveProperty("orientation");
  expect(frame).not.toHaveProperty("releases");
  expect(frame).not.toHaveProperty("rigidOffsets");
  expect(truss).not.toHaveProperty("rigidOffsets");
  expect(serialized.frameSections[0]).not.toHaveProperty("shearAreaY");
  expect(serialized.frameSections[0]).not.toHaveProperty("shearAreaZ");
  expect(serialized.materials[0]).not.toHaveProperty("density");
  expect(serialized.springs[0]).not.toHaveProperty("endNodeId");
  expect(loads[0]).not.toHaveProperty("moment");
  expect(loads[1]).toMatchObject({ kind: "member-point-force", distanceFromElasticStart: 1 });
  expect(loads[1]).not.toHaveProperty("positionRatio");
  expect(loads[2]).toMatchObject({ kind: "member-point-moment", positionRatio: 0.25 });
  expect(loads[2]).not.toHaveProperty("distanceFromElasticStart");
  expect(loads[3]).toMatchObject({ kind: "member-distributed" });
  expect(loads[3]).not.toHaveProperty("startDistanceFromElasticStart");
  expect(loads[3]).not.toHaveProperty("startPositionRatio");
});

it("FR-JSON-003: rejects contradictory member-load location forms at the model boundary", () => {
  const input = completeModelJson() as Record<string, unknown>;
  input["loadCases"] = [
    {
      id: "L",
      loads: [
        {
          kind: "member-point-force",
          frameId: "f",
          coordinateSystem: "local",
          distanceFromElasticStart: 1,
          positionRatio: 0.25,
          force: [0, -1, 0],
        },
      ],
    },
  ];

  expect(xframeFailure(() => parseModelJson(input))).toMatchObject({
    code: "LOAD_INVALID",
    context: {
      kind: "input",
      path: "load",
      expected: "exactly one of distanceFromElasticStart or positionRatio",
      actual: "true,true",
    },
  });
});

it("FR-JSON-001: round trips partial optional model forms at every supported load boundary", () => {
  const input = completeModelJson() as Record<string, unknown>;
  input["materials"] = [{ id: "steel", elasticModulus: 200e9, shearModulus: 80e9, density: 7850 }];
  input["frames"] = [
    {
      id: "f",
      startNodeId: "a",
      endNodeId: "b",
      materialId: "steel",
      sectionId: "beam",
      theory: { kind: "timoshenko" },
      orientation: [0, 1, 0],
      releases: { start: ["ry"] },
      rigidOffsets: { start: [0.1, 0, 0] },
    },
  ];
  input["trusses"] = [
    {
      id: "t",
      startNodeId: "b",
      endNodeId: "c",
      materialId: "steel",
      sectionId: "bar",
      rigidOffsets: { end: [0, 0.1, 0] },
    },
  ];
  input["springs"] = [
    { id: "k", startNodeId: "c", endNodeId: "a", stiffness: [1000, 2000, 3000, 0, 0, 0] },
  ];
  input["loadCases"] = [
    {
      id: "L",
      loads: [
        { kind: "nodal", nodeId: "c", moment: [4, 5, 6] },
        {
          kind: "member-point-force",
          frameId: "f",
          coordinateSystem: "local",
          distanceFromElasticStart: 1,
          force: [0, -10, 0],
        },
        {
          kind: "member-point-moment",
          frameId: "f",
          coordinateSystem: "global",
          positionRatio: 0.25,
          moment: [0, 0, 2],
        },
        {
          kind: "member-distributed",
          frameId: "f",
          coordinateSystem: "local",
          startDistanceFromElasticStart: 0.5,
          endDistanceFromElasticStart: 1.5,
          startIntensity: [0, -1, 0],
          endIntensity: [0, -2, 0],
        },
        { kind: "self-weight", gravity: [0, -9.81, 0], frameIds: ["f"] },
      ],
    },
  ];

  const serialized = modelToJsonValue(parseModelJson(input));
  const frame = serialized.frames[0]!;
  const truss = serialized.trusses[0]!;
  const spring = serialized.springs[0]!;
  const loads = serialized.loadCases[0]?.loads;
  if (loads === undefined) throw new Error("Expected the serialized load case.");

  expect(serialized.materials[0]).toMatchObject({
    elasticModulus: 200e9,
    shearModulus: 80e9,
    poissonRatio: 0.25,
  });
  expect(frame.releases).toEqual({ start: ["ry"] });
  expect(frame.rigidOffsets).toEqual({ start: [0.1, 0, 0] });
  expect(truss.rigidOffsets).toEqual({ end: [0, 0.1, 0] });
  expect(spring.endNodeId).toBe("a");
  expect(loads[0]).toMatchObject({ kind: "nodal", moment: [4, 5, 6] });
  expect(loads[0]).not.toHaveProperty("force");
  expect(loads[1]).toMatchObject({ kind: "member-point-force", distanceFromElasticStart: 1 });
  expect(loads[2]).toMatchObject({ kind: "member-point-moment", positionRatio: 0.25 });
  expect(loads[3]).toMatchObject({
    kind: "member-distributed",
    startDistanceFromElasticStart: 0.5,
    endDistanceFromElasticStart: 1.5,
  });
  expect(loads[3]).not.toHaveProperty("startPositionRatio");
  expect(loads[4]).toMatchObject({ kind: "self-weight", frameIds: ["f"], trussIds: [] });
});

it("FR-JSON-001: preserves each one-ended rigid offset and expands omitted self-weight selections", () => {
  const input = completeModelJson() as Record<string, unknown>;
  input["frames"] = [
    {
      id: "f",
      startNodeId: "a",
      endNodeId: "b",
      materialId: "steel",
      sectionId: "beam",
      theory: { kind: "euler-bernoulli" },
      orientation: [0, 1, 0],
      rigidOffsets: { end: [-0.1, 0, 0] },
    },
  ];
  input["trusses"] = [
    {
      id: "t",
      startNodeId: "b",
      endNodeId: "c",
      materialId: "steel",
      sectionId: "bar",
      rigidOffsets: { start: [0, 0.1, 0] },
    },
  ];
  input["loadCases"] = [
    {
      id: "L",
      loads: [{ kind: "self-weight", gravity: [0, -9.81, 0] }],
    },
  ];

  const serialized = modelToJsonValue(parseModelJson(input));
  expect(serialized.frames[0]!.rigidOffsets).toEqual({ end: [-0.1, 0, 0] });
  expect(serialized.trusses[0]!.rigidOffsets).toEqual({ start: [0, 0.1, 0] });
  const selfWeight = serialized.loadCases[0]?.loads?.[0];
  if (selfWeight === undefined) throw new Error("Expected the serialized self-weight load.");
  expect(selfWeight).toMatchObject({
    kind: "self-weight",
    frameIds: ["f"],
    trussIds: ["t"],
  });
});
