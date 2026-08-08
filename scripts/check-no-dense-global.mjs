import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

function sourceFiles(directory) {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? sourceFiles(path) : path.endsWith(".ts") ? [path] : [];
  });
}

const pattern =
  /new\s+(?:Float64Array|Array)\s*\([^\n)]*(?:size|equationCount|dofCount)\s*\*\s*(?:size|equationCount|dofCount)/u;
const findings = sourceFiles("src").filter((path) => pattern.test(readFileSync(path, "utf8")));
if (findings.length) {
  console.error(`Dense global allocation candidates:\n${findings.join("\n")}`);
  process.exitCode = 1;
} else {
  console.log("Dense global allocation guard: pass");
}
