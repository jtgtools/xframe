import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import * as api from "../../src/index.js";

it("NFR-API-001: exposes only the intentional public runtime API", () => {
  expect(Object.keys(api).toSorted()).toEqual([
    "MODEL_SCHEMA_VERSION",
    "PreparedAnalysis",
    "RESULT_SCHEMA_VERSION",
    "XFRAME_ERROR_CODES",
    "XFRAME_VERSION",
    "XFrameError",
    "artifactHash",
    "canonicalJson",
    "combineResults",
    "createEnvelopeCompatibility",
    "createModelBuilder",
    "modelToJsonValue",
    "parseModelJson",
    "parseResultJson",
    "prepareAnalysis",
    "resultToJsonValue",
    "streamEnvelope",
  ]);
});

it("NFR-API-002/NFR-PKG-001: declares a narrow ESM package boundary", () => {
  const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as Record<string, unknown>;
  expect(packageJson["main"]).toBe("./dist/index.js");
  expect(packageJson["types"]).toBe("./dist/index.d.ts");
  expect(packageJson["exports"]).toEqual({
    ".": { types: "./dist/index.d.ts", import: "./dist/index.js" },
  });
  expect(packageJson["files"]).toEqual(["dist", "schemas", "README.md", "LICENSE"]);
  expect(packageJson["sideEffects"]).toBe(false);
});
