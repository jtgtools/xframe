import { execFileSync } from "node:child_process";
import { cpSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const binary = process.env.FRAME3DD_BIN;
if (!binary) throw new Error("FRAME3DD_BIN must point to the supplied Frame3DD executable.");

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  }
  return value;
}

const sourceRoot = join(root, "verification/reference-data/frame3dd");
const temporaryRoot = mkdtempSync(join(tmpdir(), "xframe-frame3dd-verify-"));
try {
  mkdirSync(join(temporaryRoot, "scripts"), { recursive: true });
  mkdirSync(join(temporaryRoot, "verification/reference-data/frame3dd"), { recursive: true });
  cpSync(join(root, "scripts/regenerate-frame3dd-reference.mjs"), join(temporaryRoot, "scripts/regenerate-frame3dd-reference.mjs"));
  for (const name of readdirSync(sourceRoot).filter((name) => name.endsWith(".3dd"))) {
    cpSync(join(sourceRoot, name), join(temporaryRoot, "verification/reference-data/frame3dd", name));
  }
  execFileSync(process.execPath, [join(temporaryRoot, "scripts/regenerate-frame3dd-reference.mjs")], {
    cwd: temporaryRoot,
    env: { ...process.env, FRAME3DD_BIN: resolve(binary) },
    stdio: "inherit",
  });

  const referenceDirectories = readdirSync(sourceRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => {
      try {
        readFileSync(join(sourceRoot, name, "reference.json"));
        return true;
      } catch {
        return false;
      }
    })
    .sort();

  for (const name of referenceDirectories) {
    const committed = canonical(JSON.parse(readFileSync(join(sourceRoot, name, "reference.json"), "utf8")));
    const regeneratedPath = join(temporaryRoot, "verification/reference-data/frame3dd", name, "reference.json");
    const regenerated = canonical(JSON.parse(readFileSync(regeneratedPath, "utf8")));
    if (JSON.stringify(committed) !== JSON.stringify(regenerated)) {
      throw new Error(`Frame3DD numerical reference differs for ${name}.`);
    }
  }
  console.log(`Frame3DD references verified non-destructively: ${referenceDirectories.length} datasets.`);
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}
