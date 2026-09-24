import { expect, it } from "vitest";
import { XFrameError } from "../../src/errors/xframe-error.js";
import {
  arrayAt,
  booleanAt,
  deepFreezeCopy,
  finiteAt,
  finiteVector,
  integerAt,
  literalAt,
  objectAt,
  parseJsonValue,
  schemaError,
  stringAt,
  tupleAt,
  unitSystemAt,
} from "../../src/serialization/schema-validation.js";

const units = {
  version: "1",
  length: "m",
  force: "N",
  moment: "N*m",
  modulus: "Pa",
  distributedForce: "N/m",
  density: "kg/m^3",
  rotation: "rad",
} as const;

function failure(action: () => unknown): XFrameError {
  try {
    action();
  } catch (error) {
    if (error instanceof XFrameError) return error;
    throw error;
  }
  throw new Error("Expected a schema error.");
}

function schemaContext(error: XFrameError): Extract<XFrameError["context"], { kind: "schema" }> {
  expect(error.code).toBe("SCHEMA_INVALID");
  expect(error.context.kind).toBe("schema");
  if (error.context.kind !== "schema") throw new Error("Expected a schema context.");
  return error.context;
}

it("parses JSON text and reports malformed text at the root", () => {
  const object = { value: 1 };

  expect(parseJsonValue('{"value":1}')).toEqual(object);
  expect(parseJsonValue(object)).toBe(object);

  const context = schemaContext(failure(() => parseJsonValue("{")));
  expect(context).toMatchObject({ path: "$", expected: "valid JSON text" });
  expect(typeof context.actual).toBe("string");
});

it("preserves the JSON parse cause in the error summary", () => {
  const error = failure(() => parseJsonValue("{"));
  expect(error.causeSummary?.name).toBe("SyntaxError");
});

it("accepts only own plain-object fields and reports their paths", () => {
  const nullPrototype = Object.assign(Object.create(null), { allowed: 1 });
  expect(objectAt(nullPrototype, "$.entry", ["allowed"])).toBe(nullPrototype);

  const cases = [
    {
      action: () => objectAt(null, "$.entry", ["allowed"]),
      path: "$.entry",
      expected: "object",
    },
    {
      action: () => objectAt(Object.create({ allowed: 1 }), "$.entry", ["allowed"]),
      path: "$.entry",
      expected: "plain object",
    },
    {
      action: () => objectAt({ extra: true }, "$.entry", ["allowed"], []),
      path: "$.entry.extra",
      expected: "no additional property",
    },
    {
      action: () => objectAt({}, "$.entry", ["allowed"]),
      path: "$.entry.allowed",
      expected: "required property",
    },
  ];

  for (const { action, path, expected } of cases)
    expect(schemaContext(failure(action))).toMatchObject({ path, expected });
});

it("normalizes finite boundary primitives and rejects invalid JSON values", () => {
  expect(arrayAt([], "$.array")).toEqual([]);
  expect(stringAt("text", "$.text")).toBe("text");
  expect(literalAt("left", "$.side", ["left", "right"])).toBe("left");
  expect(finiteAt(-0, "$.number")).toBe(0);
  expect(integerAt(2, "$.integer", 0)).toBe(2);
  expect(booleanAt(true, "$.boolean")).toBe(true);
  expect(tupleAt([1, 2], "$.tuple", 2)).toEqual([1, 2]);
  expect(finiteVector([-0, 2], "$.vector", 2)).toEqual([0, 2]);

  const cases = [
    { action: () => arrayAt("array", "$.array"), expected: "array" },
    { action: () => stringAt(1, "$.text"), expected: "string" },
    { action: () => literalAt("up", "$.side", ["left", "right"]), expected: "left | right" },
    { action: () => finiteAt(Number.NaN, "$.number"), expected: "finite number" },
    { action: () => integerAt(1.5, "$.integer", 0), expected: "safe integer >= 0" },
    { action: () => booleanAt(1, "$.boolean"), expected: "boolean" },
    { action: () => tupleAt([1], "$.tuple", 2), expected: "array of exactly 2 items" },
  ];

  for (const { action, expected } of cases)
    expect(schemaContext(failure(action)).expected).toBe(expected);
});

it("validates complete units and reports the invalid unit field", () => {
  const parsed = unitSystemAt(units, "$.units");
  expect(parsed).toEqual(units);
  expect(Object.isFrozen(parsed)).toBe(true);

  const cases = [
    { value: { ...units, version: "2" }, path: "$.units.version" },
    { value: { ...units, force: "" }, path: "$.units.force" },
    { value: { ...units, rotation: "deg" }, path: "$.units.rotation" },
  ];
  for (const { value, path } of cases)
    expect(schemaContext(failure(() => unitSystemAt(value, "$.units"))).path).toBe(path);
});

it("deep-freezes acyclic JSON copies without retaining hostile values", () => {
  const source = Object.assign(Object.create(null), {
    nested: [-0, { value: 4 }],
  });
  const copy = deepFreezeCopy(source) as {
    readonly nested: readonly [number, { readonly value: number }];
  };

  expect(copy).toEqual({ nested: [0, { value: 4 }] });
  expect(Object.getPrototypeOf(copy)).toBeNull();
  expect(Object.isFrozen(copy)).toBe(true);
  expect(Object.isFrozen(copy.nested)).toBe(true);
  expect(Object.isFrozen(copy.nested[1])).toBe(true);

  const cycle: { self?: unknown } = {};
  cycle.self = cycle;
  const cases = [
    { value: undefined, expected: "JSON-compatible value" },
    { value: 1n, expected: "JSON-compatible value" },
    { value: () => undefined, expected: "JSON-compatible value" },
    { value: Symbol("value"), expected: "JSON-compatible value" },
    { value: cycle, expected: "acyclic JSON-compatible value" },
  ];
  for (const { value, expected } of cases)
    expect(schemaContext(failure(() => deepFreezeCopy(value))).expected).toBe(expected);
});

it("preserves schema diagnostic distinctions for actual values and versions", () => {
  const actuals = [
    [null, "null"],
    [[1], "array(length=1)"],
    [Number.POSITIVE_INFINITY, "Infinity"],
    [{ z: 1, a: 2 }, "object(keys=a,z)"],
  ] as const;
  for (const [actual, description] of actuals) {
    const context = schemaContext(failure(() => schemaError("$.value", "valid", actual)));
    expect(context.actual).toBe(description);
  }

  const unsupported = failure(() =>
    schemaError("$.schemaVersion", "schema version 2", undefined, "SCHEMA_UNSUPPORTED", "1"),
  );
  expect(unsupported.code).toBe("SCHEMA_UNSUPPORTED");
  expect(unsupported.context).toMatchObject({
    kind: "schema",
    path: "$.schemaVersion",
    expected: "schema version 2",
    schemaVersion: "1",
  });
  expect(unsupported.context).not.toHaveProperty("actual");
});
