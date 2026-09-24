import { describe, expect, it } from "vitest";
import { XFRAME_ERROR_CODES } from "../../src/errors/error-code.js";
import { XFrameError } from "../../src/errors/xframe-error.js";

function unsafeCause(): Error & { secret: object; code: string } {
  const cause = new Error("database exploded") as Error & { secret: object; code: string };
  cause.name = "DatabaseError";
  cause.code = "E_DB";
  cause.secret = { token: "do-not-expose" };
  return cause;
}

describe("XFrameError", () => {
  it("exposes a stable code and immutable structured context", () => {
    const context = {
      kind: "input",
      path: "nodes[0].x",
      expected: "finite number",
      actual: "NaN",
    } as const;
    const error = new XFrameError("INPUT_INVALID", "Node coordinate is invalid.", context);

    expect(error.code).toBe("INPUT_INVALID");
    expect(error.context).toEqual(context);
    expect(Object.isFrozen(error.context)).toBe(true);
    expect(error.toJSON()).toEqual({
      name: "XFrameError",
      code: "INPUT_INVALID",
      message: "Node coordinate is invalid.",
      context,
    });
  });

  it("summarizes causes without exposing arbitrary cause properties", () => {
    const error = new XFrameError(
      "INPUT_INVALID",
      "Input failed.",
      { kind: "input", path: "model", expected: "valid model" },
      { cause: unsafeCause() },
    );

    expect(error.causeSummary).toEqual({
      name: "DatabaseError",
      message: "database exploded",
      code: "E_DB",
    });
    expect(JSON.stringify(error)).not.toContain("do-not-expose");
  });
});

it("copies nested context before freezing it", () => {
  const resultIds = ["case-a"];
  const context = { kind: "result", resultIds, reason: "incompatible models" } as const;
  const error = new XFrameError("RESULT_INCOMPATIBLE", "Results are incompatible.", context);
  resultIds[0] = "mutated";

  expect(error.context).toEqual({
    kind: "result",
    resultIds: ["case-a"],
    reason: "incompatible models",
  });
  expect(Object.isFrozen((error.context as typeof context).resultIds)).toBe(true);
});

it("pins the stable error-code vocabulary", () => {
  expect([...XFRAME_ERROR_CODES]).toEqual([
    "INPUT_INVALID",
    "IDENTIFIER_INVALID",
    "DUPLICATE_IDENTIFIER",
    "REFERENCE_NOT_FOUND",
    "UNITS_INVALID",
    "GEOMETRY_INVALID",
    "MATERIAL_INVALID",
    "SECTION_INVALID",
    "LOAD_INVALID",
    "CONSTRAINT_CONTRADICTION",
    "CONSTRAINT_CYCLE",
    "CONSTRAINT_RANK_DEFICIENT",
    "CONSTRAINT_SEMANTIC_VIOLATION",
    "ELEMENT_LOCAL_MECHANISM",
    "GLOBAL_MECHANISM",
    "FACTORIZATION_FAILED",
    "NON_FINITE_VALUE",
    "MEMORY_LIMIT_EXCEEDED",
    "SCHEMA_UNSUPPORTED",
    "SCHEMA_INVALID",
    "RESULT_INCOMPATIBLE",
    "UNSUPPORTED_FEATURE",
  ]);
});
