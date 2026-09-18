import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? sourceFiles(path) : path.endsWith(".ts") ? [path] : [];
  });
}

it("production code contains no obvious dense global allocation", () => {
  const findings = sourceFiles("src").flatMap((path) => {
    const source = readFileSync(path, "utf8");
    return /new\s+(?:Float64Array|Array)\s*\([^\n)]*(?:size|equationCount|dofCount)\s*\*\s*(?:size|equationCount|dofCount)/u.test(
      source,
    )
      ? [path]
      : [];
  });
  expect(findings).toEqual([]);
});
