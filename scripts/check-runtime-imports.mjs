import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const sourceRoot = join(root, "src");
const forbidden = [
  { pattern: /(?:from\s+|import\s*\()\s*["']node:/u, reason: "Node built-in import" },
  { pattern: /\bprocess\s*\./u, reason: "process global" },
  { pattern: /\bBuffer\b/u, reason: "Buffer global" },
  { pattern: /\b__dirname\b|\b__filename\b/u, reason: "CommonJS path global" },
  { pattern: /\brequire\s*\(/u, reason: "CommonJS require" },
];

function files(directory) {
  return readdirSync(directory)
    .map((name) => join(directory, name))
    .flatMap((path) => (statSync(path).isDirectory() ? files(path) : [path]));
}

const violations = [];
for (const path of files(sourceRoot).filter((entry) => entry.endsWith(".ts"))) {
  const source = readFileSync(path, "utf8");
  for (const rule of forbidden) {
    if (rule.pattern.test(source)) violations.push(`${relative(root, path)}: ${rule.reason}`);
  }
}
if (violations.length > 0) {
  console.error("Browser runtime boundary violations:\n" + violations.join("\n"));
  process.exitCode = 1;
} else {
  const builtEntry = join(root, "dist", "index.js");
  if (existsSync(builtEntry)) await import(pathToFileURL(builtEntry).href);
  console.log(
    `Browser runtime boundary clean (${files(sourceRoot).filter((entry) => entry.endsWith(".ts")).length} source modules).`,
  );
}
