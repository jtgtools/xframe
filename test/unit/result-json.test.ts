import { expect, it } from "vitest";
import { createModelBuilder } from "../../src/model/model-builder.js";
import { prepareAnalysis } from "../../src/analysis/prepare-analysis.js";
import { XFrameError } from "../../src/errors/xframe-error.js";
import { artifactHash } from "../../src/serialization/artifact-hash.js";
import { canonicalJson } from "../../src/serialization/canonical-json.js";
import { parseResultJson } from "../../src/serialization/parse-result-json.js";
import { resultToJsonValue } from "../../src/serialization/result-schema.js";

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
  for (const dof of ["tx", "ty", "tz", "rx", "ry", "rz"] as const)
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

it("FR-SAFE-002/FR-SAFE-004: round trips the complete result schema v2", () => {
  const value = resultToJsonValue(result());

  expect(value.schemaVersion).toBe("2");
  expect(value.result.trusses[0]!.globalReferenceEndForces).toHaveLength(12);
  expect(value.result.frames[0]!.internalForceSegments.length).toBeGreaterThan(0);
  expect(parseResultJson(JSON.stringify(value))).toEqual(value.result);
});

it("FR-JSON-003/FR-JSON-005: validates and reconstructs a complete immutable result", () => {
  const source = result();
  const parsed = parseResultJson(resultToJsonValue(source));
  expect(parsed).toEqual(source);
  expect(parsed).not.toBe(source);
  expect(Object.isFrozen(parsed)).toBe(true);
  expect(Object.isFrozen(parsed.nodes)).toBe(true);
});

it("FR-JSON-006: result canonical output round-trips byte-for-byte", () => {
  const first = canonicalJson(resultToJsonValue(result()));
  const second = canonicalJson(resultToJsonValue(parseResultJson(first)));
  expect(second).toBe(first);
});

it("FR-JSON-003/FR-JSON-004: rejects incomplete, additional, unsupported, and non-finite results", () => {
  const valid = resultToJsonValue(result()) as unknown as Record<string, unknown>;
  const body = valid["result"] as Record<string, unknown>;
  const malformed = [
    { ...valid, schemaVersion: "1" },
    { ...valid, result: { ...body, diagnostics: undefined } },
    { ...valid, result: { ...body, extra: true } },
    { ...valid, result: { ...body, fullLoad: [Number.POSITIVE_INFINITY] } },
  ];
  for (const value of malformed) expect(() => parseResultJson(value)).toThrowError(XFrameError);
});

it("FR-SAFE-002/FR-SAFE-004: rejects every non-v2 artifact before interpreting its body", () => {
  const error = schemaFailure(() => parseResultJson({ schemaVersion: "1", result: null }));

  expect(error.code).toBe("SCHEMA_UNSUPPORTED");
  const context = error.context;
  expect(context.kind).toBe("schema");
  expect(context.kind === "schema" ? context.path : undefined).toBe("$.schemaVersion");
});

it("FR-SAFE-002/FR-SAFE-004: rejects malformed, noncontiguous, nonfinite segments and malformed fingerprints", () => {
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

it("FR-JSON-003: rejects a null result with its exact field path", () => {
  const error = schemaFailure(() => parseResultJson({ schemaVersion: "2", result: null }));

  expect(error.code).toBe("SCHEMA_INVALID");
  const context = error.context;
  expect(context.kind).toBe("schema");
  expect(context.kind === "schema" ? context.path : undefined).toBe("$.result");
});

it("FR-JSON-003: reports malformed result unit metadata at the JSON field path", () => {
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

it("FR-JSON-006: canonical JSON sorts keys, preserves arrays, rejects unsupported values, and hashes deterministically", async () => {
  expect(canonicalJson({ z: 1, a: -0, b: [3, 2, 1] })).toBe('{"a":0,"b":[3,2,1],"z":1}');
  expect(() => canonicalJson({ value: Number.NaN })).toThrowError(XFrameError);
  expect(() => canonicalJson({ value: undefined })).toThrowError(XFrameError);
  expect(await artifactHash({ a: 1 })).toBe(
    "015abd7f5cc57a2dd94b7590f04ad8084273905ee33ec5cebeae62276a97f862",
  );
});
