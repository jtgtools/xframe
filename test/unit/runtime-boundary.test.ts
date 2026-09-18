import { describe, expect, it } from "vitest";
import { findRuntimeBoundaryViolations } from "../../scripts/runtime-boundary-utils.mjs";

describe("findRuntimeBoundaryViolations", () => {
  it("flags Node built-in imports", () => {
    expect(findRuntimeBoundaryViolations(`import { readFileSync } from "node:fs";`)).toEqual([
      "Node built-in import",
    ]);
  });

  it("flags process, Buffer, and CommonJS globals", () => {
    expect(findRuntimeBoundaryViolations(`process.exitCode = 1;`)).toEqual(["process global"]);
    expect(findRuntimeBoundaryViolations(`const copy = Buffer.from(data);`)).toEqual([
      "Buffer global",
    ]);
    expect(findRuntimeBoundaryViolations(`const loaded = require("./data.json");`)).toEqual([
      "CommonJS require",
    ]);
  });

  it("passes browser-safe ESM source without violations", () => {
    expect(
      findRuntimeBoundaryViolations(
        `import { canonicalJson } from "./canonical-json.js";\nexport const value = 1;\n`,
      ),
    ).toEqual([]);
  });
});
