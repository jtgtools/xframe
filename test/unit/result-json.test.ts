import { expect, it } from "vitest";
import { createModelBuilder } from "../../src/model/model-builder.js";
import { prepareAnalysis } from "../../src/analysis/prepare-analysis.js";
import { XFrameError } from "../../src/errors/xframe-error.js";
import { artifactHash } from "../../src/serialization/artifact-hash.js";
import { canonicalJson } from "../../src/serialization/canonical-json.js";
import { parseResultJson } from "../../src/serialization/parse-result-json.js";
import { resultToJsonValue } from "../../src/serialization/result-schema.js";
import { combineResults } from "../../src/results/combine-results.js";

function result() {
  const builder = createModelBuilder()
    .setUnitSystem({
      version: "1",
      length: "m",
      force: "N",
      moment: "N*m",
      modulus: "Pa",
      distributedForce: "N/m",
      density: "kg/m^3",
      rotation: "rad",
    })
    .addNode({ id: "a", coordinates: [0, 0, 0] })
    .addNode({ id: "b", coordinates: [2, 0, 0] })
    .addMaterial({ id: "m", elasticModulus: 200e9, poissonRatio: 0.3 })
    .addFrameSection({
      id: "fs",
      area: 0.02,
      torsionalConstant: 1e-5,
      momentOfInertiaY: 2e-5,
      momentOfInertiaZ: 2e-5,
    })
    .addTrussSection({ id: "ts", area: 0.01 })
    .addFrame({
      id: "f",
      startNodeId: "a",
      endNodeId: "b",
      materialId: "m",
      sectionId: "fs",
      theory: { kind: "euler-bernoulli" },
      orientation: [0, 1, 0],
    })
    .addTruss({ id: "t", startNodeId: "a", endNodeId: "b", materialId: "m", sectionId: "ts" });
  for (const dof of ["ux", "uy", "uz", "rx", "ry", "rz"] as const)
    builder.addConstraint({
      id: `a:${dof}`,
      terms: [{ nodeId: "a", dof, coefficient: 1 }],
      rightHandSide: 0,
    });
  return prepareAnalysis(
    builder
      .addLoadCase({ id: "P", loads: [{ kind: "nodal", nodeId: "b", force: [10, 0, 0] }] })
      .finalize(),
  ).solveCase("P");
}

function schemaFailure(action: () => unknown): XFrameError {
  try {
    action();
  } catch (error) {
    if (error instanceof XFrameError) return error;
    throw error;
  }
  throw new Error("expected schema failure");
}

it("round trips the complete result schema v2", () => {
  const value = resultToJsonValue(result());

  expect(value.schemaVersion).toBe("3");
  expect(value.result.trusses[0]!.globalReferenceEndForces).toHaveLength(12);
  expect(value.result.frames[0]!.internalForceSegments.length).toBeGreaterThan(0);
  expect(parseResultJson(JSON.stringify(value))).toEqual(value.result);
});

it("validates and reconstructs a complete immutable result", () => {
  const source = result();
  const parsed = parseResultJson(resultToJsonValue(source));
  expect(parsed).toEqual(source);
  expect(parsed).not.toBe(source);
  expect(Object.isFrozen(parsed)).toBe(true);
  expect(Object.isFrozen(parsed.nodes)).toBe(true);
});

it("result canonical output round-trips byte-for-byte", () => {
  const first = canonicalJson(resultToJsonValue(result()));
  const second = canonicalJson(resultToJsonValue(parseResultJson(first)));
  expect(second).toBe(first);
});

it("rejects incomplete, additional, unsupported, and non-finite results", () => {
  const valid = resultToJsonValue(result()) as unknown as Record<string, unknown>;
  const body = valid["result"] as Record<string, unknown>;
  const malformed = [
    { ...valid, schemaVersion: "2" },
    { ...valid, result: { ...body, diagnostics: undefined } },
    { ...valid, result: { ...body, extra: true } },
    { ...valid, result: { ...body, fullLoad: [Number.POSITIVE_INFINITY] } },
  ];
  for (const value of malformed) expect(() => parseResultJson(value)).toThrowError(XFrameError);
});

it("rejects every non-v3 artifact before interpreting its body", () => {
  const error = schemaFailure(() => parseResultJson({ schemaVersion: "2", result: null }));

  expect(error.code).toBe("SCHEMA_UNSUPPORTED");
  const context = error.context;
  expect(context.kind).toBe("schema");
  expect(context.kind === "schema" ? context.path : undefined).toBe("$.schemaVersion");
});

it("rejects malformed, noncontiguous, nonfinite segments and malformed fingerprints", () => {
  const valid = resultToJsonValue(result()) as unknown as Record<string, unknown>;
  const body = valid["result"] as Record<string, unknown>;
  const frame = (body["frames"] as readonly Record<string, unknown>[])[0]!;
  const segment = (frame["internalForceSegments"] as readonly Record<string, unknown>[])[0]!;
  const coefficients = segment["coefficients"] as readonly unknown[];
  const firstCoefficients = coefficients[0] as readonly unknown[];
  const malformed = [
    {
      ...valid,
      result: {
        ...body,
        modelFingerprint: `sha256:${"A".repeat(64)}`,
      },
    },
    {
      ...valid,
      result: {
        ...body,
        frames: [
          {
            ...frame,
            internalForceSegments: [{ ...segment, coefficients: coefficients.slice(1) }],
          },
        ],
      },
    },
    {
      ...valid,
      result: {
        ...body,
        frames: [
          {
            ...frame,
            internalForceSegments: [
              { ...segment, end: 1 },
              { ...segment, start: 1.5, end: 2 },
            ],
          },
        ],
      },
    },
    {
      ...valid,
      result: {
        ...body,
        frames: [
          {
            ...frame,
            internalForceSegments: [
              {
                ...segment,
                coefficients: [
                  [Number.POSITIVE_INFINITY, ...firstCoefficients.slice(1)],
                  ...coefficients.slice(1),
                ],
              },
            ],
          },
        ],
      },
    },
  ];

  expect(body["modelFingerprint"]).toMatch(/^sha256:[0-9a-f]{64}$/u);
  for (const value of malformed) expect(() => parseResultJson(value)).toThrowError(XFrameError);
});

it("rejects a null result with its exact field path", () => {
  const error = schemaFailure(() => parseResultJson({ schemaVersion: "3", result: null }));

  expect(error.code).toBe("SCHEMA_INVALID");
  const context = error.context;
  expect(context.kind).toBe("schema");
  expect(context.kind === "schema" ? context.path : undefined).toBe("$.result");
});

it("reports malformed result unit metadata at the JSON field path", () => {
  const valid = resultToJsonValue(result()) as unknown as Record<string, unknown>;
  const body = valid["result"] as Record<string, unknown>;
  const unitSystem = body["unitSystem"] as Record<string, unknown>;
  const error = schemaFailure(() =>
    parseResultJson({ ...valid, result: { ...body, unitSystem: { ...unitSystem, extra: true } } }),
  );

  expect(error.code).toBe("SCHEMA_INVALID");
  const context = error.context;
  expect(context.kind).toBe("schema");
  expect(context.kind === "schema" ? context.path : undefined).toBe("$.result.unitSystem.extra");
});

it("canonical JSON sorts keys, preserves arrays, rejects unsupported values, and hashes deterministically", async () => {
  expect(canonicalJson({ z: 1, a: -0, b: [3, 2, 1] })).toBe('{"a":0,"b":[3,2,1],"z":1}');
  expect(() => canonicalJson({ value: Number.NaN })).toThrowError(XFrameError);
  expect(() => canonicalJson({ value: undefined })).toThrowError(XFrameError);
  expect(await artifactHash({ a: 1 })).toBe(
    "015abd7f5cc57a2dd94b7590f04ad8084273905ee33ec5cebeae62276a97f862",
  );
});

it("round trips valid combinations and rejects invalid factor provenance", () => {
  const source = result();
  const second = { ...source, id: "Q" as typeof source.id };
  const combination = combineResults("U", [
    { result: source, factor: 1 },
    { result: second, factor: -0.5 },
  ]);
  const json = resultToJsonValue(combination) as unknown as Record<string, unknown>;
  const body = json["result"] as Record<string, unknown>;
  const factor = (body["factors"] as readonly Record<string, unknown>[])[0]!;

  expect(parseResultJson(json)).toEqual(combination);
  const malformed = [
    {
      value: { ...json, result: { ...body, factors: [] } },
      path: "$.result.factors",
      expected: "nonempty factor array",
    },
    {
      value: { ...json, result: { ...body, factors: [factor, { ...factor }] } },
      path: "$.result.factors[1].resultId",
      expected: "unique source result identifier",
    },
    {
      value: {
        ...json,
        result: { ...body, factors: [{ ...factor, factor: Number.POSITIVE_INFINITY }] },
      },
      path: "$.result.factors[0].factor",
      expected: "finite number",
    },
  ];
  for (const { value, path, expected } of malformed)
    expect(schemaFailure(() => parseResultJson(value))).toMatchObject({
      code: "SCHEMA_INVALID",
      context: { kind: "schema", path, expected },
    });
});

it("rejects invalid result layouts at their structural boundary", () => {
  const json = resultToJsonValue(result()) as unknown as Record<string, unknown>;
  const body = json["result"] as Record<string, unknown>;
  const node = (body["nodes"] as readonly Record<string, unknown>[])[0]!;
  const frame = (body["frames"] as readonly Record<string, unknown>[])[0]!;
  const segment = (frame["internalForceSegments"] as readonly Record<string, unknown>[])[0]!;
  const station = (frame["internalForces"] as readonly Record<string, unknown>[])[0]!;
  const displacement = (node["displacements"] as readonly Record<string, unknown>[])[0]!;
  const reaction = (node["reactions"] as readonly Record<string, unknown>[])[0]!;

  const malformed = [
    {
      value: { ...json, result: { ...body, nodes: [{ ...node, id: "" }] } },
      path: "$.result.nodes[0].id",
      expected: "valid structural identifier",
    },
    {
      value: { ...json, result: { ...body, nodes: [node, { ...node }] } },
      path: "$.result.nodes[1].id",
      expected: "unique identifier",
    },
    {
      value: {
        ...json,
        result: {
          ...body,
          nodes: [{ ...node, displacements: [displacement, { ...displacement }] }],
        },
      },
      path: "$.result.nodes[0].displacements[1].dof",
      expected: "unique active DOF",
    },
    {
      value: {
        ...json,
        result: {
          ...body,
          nodes: [{ ...node, reactions: [reaction, { ...reaction }] }],
        },
      },
      path: "$.result.nodes[0].reactions[1].dof",
      expected: "unique active DOF",
    },
    {
      value: {
        ...json,
        result: {
          ...body,
          nodes: [
            {
              ...node,
              reactions: (node["reactions"] as readonly Record<string, unknown>[]).slice(1),
            },
          ],
        },
      },
      path: "$.result.nodes[0]",
      expected: "matching displacement and reaction DOF layouts",
    },
    {
      value: {
        ...json,
        result: {
          ...body,
          frames: [{ ...frame, internalForceSegments: [{ ...segment, end: segment["start"] }] }],
        },
      },
      path: "$.result.frames[0].internalForceSegments[0]",
      expected: "segment with finite end greater than start",
    },
    {
      value: { ...json, result: { ...body, frames: [{ ...frame, internalForceSegments: [] }] } },
      path: "$.result.frames[0].internalForceSegments",
      expected: "nonempty segment array",
    },
    {
      value: {
        ...json,
        result: {
          ...body,
          frames: [{ ...frame, internalForces: [{ ...station, x: 2 }, station] }],
        },
      },
      path: "$.result.frames[0].internalForces",
      expected: "nondecreasing station coordinates",
    },
    {
      value: { ...json, result: { ...body, fullLoad: [] } },
      path: "$.result",
      expected: "matching full vector lengths",
    },
  ];
  for (const { value, path, expected } of malformed)
    expect(schemaFailure(() => parseResultJson(value))).toMatchObject({
      code: "SCHEMA_INVALID",
      context: { kind: "schema", path, expected },
    });
});

it("accepts contiguous segment metadata without optional side limits and both spring layouts", () => {
  const json = resultToJsonValue(result()) as unknown as Record<string, unknown>;
  const body = json["result"] as Record<string, unknown>;
  const frame = (body["frames"] as readonly Record<string, unknown>[])[0]!;
  const segment = (frame["internalForceSegments"] as readonly Record<string, unknown>[])[0]!;
  const start = segment["start"] as number;
  const end = segment["end"] as number;
  const middle = (start + end) / 2;
  const parsed = parseResultJson({
    ...json,
    result: {
      ...body,
      frames: [
        {
          ...frame,
          internalForceSegments: [
            { start, end: middle, coefficients: segment["coefficients"] },
            { start: middle, end, coefficients: segment["coefficients"] },
          ],
        },
      ],
      springs: [
        { id: "grounded", grounded: true, globalEndForces: [0, 0, 0, 0, 0, 0] },
        {
          id: "between",
          grounded: false,
          globalEndForces: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        },
      ],
    },
  });

  expect(parsed.frames[0]!.internalForceSegments).toHaveLength(2);
  expect(parsed.frames[0]!.internalForceSegments[0]).not.toHaveProperty("startLeft");
  expect(parsed.frames[0]!.internalForceSegments[1]).not.toHaveProperty("endRight");
  expect(
    parsed.springs.map(({ grounded, globalEndForces }) => [grounded, globalEndForces.length]),
  ).toEqual([
    [true, 6],
    [false, 12],
  ]);
});
