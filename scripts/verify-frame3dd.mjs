import { execFileSync } from "node:child_process";
import {
  cpSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const approvedBinaryHashes = new Set([
  "53b1dc6628424b156e491e3205f13d58a0e325e33e4746d225b456ab85ac5275",
  "ad7056c210ad413c37d3627b8e9868fdc40ce09d76f167f2d5f98077d3aad626",
]);

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .toSorted()
        .map((key) => [key, canonical(value[key])]),
    );
  }
  return value;
}

function metadata(reference) {
  const {
    oracle,
    elementStiffness: _elementStiffness,
    globalStiffness: _globalStiffness,
    cases: _cases,
    nodes: _nodes,
    elements: _elements,
    ...rest
  } = reference;
  const { binarySha256: _binarySha256, ...oracleWithoutBinary } = oracle;
  return { ...rest, oracle: oracleWithoutBinary };
}

function compareValues(actual, expected, tolerance, path) {
  if (typeof expected === "number") {
    if (typeof actual !== "number" || !Number.isFinite(actual)) {
      throw new Error(`Frame3DD ${path} is not a finite number.`);
    }
    if (!Number.isFinite(expected)) {
      throw new Error(`Frame3DD ${path} expected value is not finite.`);
    }
    const limit = tolerance.absolute + tolerance.relative * Math.abs(expected);
    if (Math.abs(actual - expected) > limit) {
      throw new Error(
        `Frame3DD ${path} differs: actual=${actual} expected=${expected} tolerance=${limit}`,
      );
    }
    return;
  }
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual) || actual.length !== expected.length) {
      throw new Error(`Frame3DD ${path} has a different array shape.`);
    }
    expected.forEach((value, index) =>
      compareValues(actual[index], value, tolerance, `${path}[${index}]`),
    );
    return;
  }
  if (expected !== null && typeof expected === "object") {
    if (actual === null || typeof actual !== "object" || Array.isArray(actual)) {
      throw new Error(`Frame3DD ${path} has a different object shape.`);
    }
    const expectedKeys = Object.keys(expected).toSorted();
    const actualKeys = Object.keys(actual).toSorted();
    if (JSON.stringify(actualKeys) !== JSON.stringify(expectedKeys)) {
      throw new Error(`Frame3DD ${path} has different object keys.`);
    }
    expectedKeys.forEach((key) =>
      compareValues(actual[key], expected[key], tolerance, `${path}.${key}`),
    );
    return;
  }
  if (actual !== expected)
    throw new Error(`Frame3DD ${path} differs: actual=${actual} expected=${expected}`);
}

function assertApprovedBinaryHash(reference, role, referenceName) {
  if (!approvedBinaryHashes.has(reference.oracle?.binarySha256)) {
    throw new Error(`Frame3DD ${referenceName} ${role} binary SHA-256 is not approved.`);
  }
}

export function compareReference(actual, expected, referenceName) {
  assertApprovedBinaryHash(actual, "actual", referenceName);
  assertApprovedBinaryHash(expected, "expected", referenceName);
  if (
    JSON.stringify(canonical(metadata(actual))) !== JSON.stringify(canonical(metadata(expected)))
  ) {
    throw new Error(`Frame3DD metadata differs for ${referenceName}.`);
  }
  for (const key of ["elementStiffness", "globalStiffness"]) {
    if (Object.hasOwn(actual, key) !== Object.hasOwn(expected, key)) {
      throw new Error(`Frame3DD ${referenceName} has different ${key} coverage.`);
    }
    if (Object.hasOwn(expected, key))
      compareValues(
        actual[key],
        expected[key],
        expected.tolerances.matrices,
        `${referenceName}.${key}`,
      );
  }
  for (const key of ["cases", "nodes", "elements"]) {
    if (Object.hasOwn(actual, key) !== Object.hasOwn(expected, key)) {
      throw new Error(`Frame3DD ${referenceName} has different ${key} coverage.`);
    }
    if (Object.hasOwn(expected, key))
      compareValues(
        actual[key],
        expected[key],
        expected.tolerances.results,
        `${referenceName}.${key}`,
      );
  }
}

if (
  process.argv[1] !== undefined &&
  realpathSync(resolve(process.argv[1])) === realpathSync(fileURLToPath(import.meta.url))
) {
  const root = resolve(import.meta.dirname, "..");
  const binary = process.env.FRAME3DD_BIN;
  if (!binary) throw new Error("FRAME3DD_BIN must point to the supplied Frame3DD executable.");
  const sourceRoot = join(root, "verification/reference-data/frame3dd");
  const temporaryRoot = mkdtempSync(join(tmpdir(), "xframe-frame3dd-verify-"));
  try {
    mkdirSync(join(temporaryRoot, "scripts"), { recursive: true });
    mkdirSync(join(temporaryRoot, "verification/reference-data/frame3dd"), { recursive: true });
    cpSync(
      join(root, "scripts/regenerate-frame3dd-reference.mjs"),
      join(temporaryRoot, "scripts/regenerate-frame3dd-reference.mjs"),
    );
    for (const name of readdirSync(sourceRoot).filter((fileName) => fileName.endsWith(".3dd"))) {
      cpSync(
        join(sourceRoot, name),
        join(temporaryRoot, "verification/reference-data/frame3dd", name),
      );
    }
    execFileSync(
      process.execPath,
      [join(temporaryRoot, "scripts/regenerate-frame3dd-reference.mjs")],
      {
        cwd: temporaryRoot,
        env: { ...process.env, FRAME3DD_BIN: resolve(binary) },
        stdio: "inherit",
      },
    );

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
      .toSorted();

    for (const name of referenceDirectories) {
      const committed = JSON.parse(readFileSync(join(sourceRoot, name, "reference.json"), "utf8"));
      const regeneratedPath = join(
        temporaryRoot,
        "verification/reference-data/frame3dd",
        name,
        "reference.json",
      );
      const regenerated = JSON.parse(readFileSync(regeneratedPath, "utf8"));
      compareReference(regenerated, committed, name);
    }
    console.log(
      `Frame3DD references verified non-destructively: ${referenceDirectories.length} datasets.`,
    );
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
}
