import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

function schema(name: string): Record<string, unknown> {
  return JSON.parse(readFileSync(`schemas/${name}.schema.json`, "utf8")) as Record<string, unknown>;
}

it("FR-JSON-001/FR-JSON-002: publishes a strict complete model JSON Schema", () => {
  const value = schema("model");
  expect(value["$schema"]).toBe("https://json-schema.org/draft/2020-12/schema");
  expect(value["additionalProperties"]).toBe(false);
  expect(value["required"]).toEqual([
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
  ]);
  const definitions = value["$defs"] as Record<string, Record<string, unknown>>;
  expect((definitions["load"]!["oneOf"] as unknown[]).length).toBe(5);
  expect(definitions["pointLocation"]!["oneOf"]).toBeDefined();
});

it("FR-JSON-001/FR-JSON-002: publishes a strict complete result JSON Schema", () => {
  const value = schema("result");
  expect(value["$schema"]).toBe("https://json-schema.org/draft/2020-12/schema");
  expect(value["additionalProperties"]).toBe(false);
  expect(value["required"]).toEqual(["schemaVersion", "result"]);
  const definitions = value["$defs"] as Record<string, Record<string, unknown>>;
  expect((definitions["structuralResult"]!["oneOf"] as unknown[]).length).toBe(2);
  expect(definitions["caseResult"]!["additionalProperties"]).toBe(false);
  expect(definitions["combinationResult"]!["additionalProperties"]).toBe(false);
});
