import { expect, it } from "vitest";
import { createModelBuilder } from "../../src/model/model-builder.js";
import { prepareAnalysis } from "../../src/analysis/prepare-analysis.js";
import { XFrameError } from "../../src/errors/xframe-error.js";
import { artifactHash } from "../../src/serialization/artifact-hash.js";
import { canonicalJson } from "../../src/serialization/canonical-json.js";
import { parseResultJson } from "../../src/serialization/parse-result-json.js";
import { resultToJsonValue } from "../../src/serialization/result-schema.js";

function result() {
  const model = createModelBuilder()
    .setUnitSystem({ version: "1", length: "m", force: "N", moment: "N*m", modulus: "Pa", distributedForce: "N/m", density: "kg/m^3", rotation: "rad" })
    .addNode({ id: "n", coordinates: [0, 0, 0] })
    .addSpring({ id: "k", startNodeId: "n", stiffness: [100, 0, 0, 0, 0, 0] })
    .addLoadCase({ id: "P", loads: [{ kind: "nodal", nodeId: "n", force: [10, 0, 0] }] })
    .finalize();
  return prepareAnalysis(model).solveCase("P");
}

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
    { ...valid, schemaVersion: "2" },
    { ...valid, result: { ...body, diagnostics: undefined } },
    { ...valid, result: { ...body, extra: true } },
    { ...valid, result: { ...body, fullLoad: [Number.POSITIVE_INFINITY] } },
  ];
  for (const value of malformed) expect(() => parseResultJson(value)).toThrowError(XFrameError);
});

it("FR-JSON-003: rejects a null result with its exact field path", () => {
  try {
    parseResultJson({ schemaVersion: "1", result: null });
    throw new Error("expected schema failure");
  } catch (error) {
    expect(error).toBeInstanceOf(XFrameError);
    expect((error as XFrameError).code).toBe("SCHEMA_INVALID");
    const context = (error as XFrameError).context;
    expect(context.kind).toBe("schema");
    expect(context.kind === "schema" ? context.path : undefined).toBe("$.result");
  }
});

it("FR-JSON-003: reports malformed result unit metadata at the JSON field path", () => {
  const valid = resultToJsonValue(result()) as unknown as Record<string, unknown>;
  const body = valid["result"] as Record<string, unknown>;
  const unitSystem = body["unitSystem"] as Record<string, unknown>;
  try {
    parseResultJson({ ...valid, result: { ...body, unitSystem: { ...unitSystem, extra: true } } });
    throw new Error("expected schema failure");
  } catch (error) {
    expect(error).toBeInstanceOf(XFrameError);
    expect((error as XFrameError).code).toBe("SCHEMA_INVALID");
    const context = (error as XFrameError).context;
    expect(context.kind).toBe("schema");
    expect(context.kind === "schema" ? context.path : undefined).toBe("$.result.unitSystem.extra");
  }
});

it("FR-JSON-006: canonical JSON sorts keys, preserves arrays, rejects unsupported values, and hashes deterministically", async () => {
  expect(canonicalJson({ z: 1, a: -0, b: [3, 2, 1] })).toBe('{"a":0,"b":[3,2,1],"z":1}');
  expect(() => canonicalJson({ value: Number.NaN })).toThrowError(XFrameError);
  expect(() => canonicalJson({ value: undefined })).toThrowError(XFrameError);
  expect(await artifactHash({ a: 1 })).toBe("015abd7f5cc57a2dd94b7590f04ad8084273905ee33ec5cebeae62276a97f862");
});
