import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { findRuntimeBoundaryViolations } from "./runtime-boundary-utils.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const sourceRoot = join(root, "src");
const distRoot = join(root, "dist");

function files(directory) {
  return readdirSync(directory)
    .map((name) => join(directory, name))
    .flatMap((path) => (statSync(path).isDirectory() ? files(path) : [path]));
}

const violations = [];
for (const path of files(sourceRoot).filter((entry) => entry.endsWith(".ts"))) {
  for (const reason of findRuntimeBoundaryViolations(readFileSync(path, "utf8"))) {
    violations.push(`${relative(root, path)}: ${reason}`);
  }
}
const builtEntry = join(distRoot, "index.js");
if (existsSync(builtEntry)) {
  for (const reason of findRuntimeBoundaryViolations(readFileSync(builtEntry, "utf8"))) {
    violations.push(`${relative(root, builtEntry)}: ${reason}`);
  }
  const stray = files(distRoot).filter((entry) => entry.endsWith(".js") && entry !== builtEntry);
  if (stray.length > 0) {
    violations.push(
      `dist is not a single-file bundle: ${stray.map((entry) => relative(root, entry)).join(", ")}`,
    );
  }
}
if (violations.length > 0) {
  console.error("Browser runtime boundary violations:\n" + violations.join("\n"));
  process.exitCode = 1;
} else {
  if (existsSync(builtEntry)) await import(pathToFileURL(builtEntry).href);
  console.log(
    `Browser runtime boundary clean (${files(sourceRoot).filter((entry) => entry.endsWith(".ts")).length} source modules).`,
  );
}
