import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const expectedBinaryHash = "5aa4e9c80c410c510ca62ac3b2f1d64a8e50679f0238e140b5bebcd6d5ddbe6d";
const root = resolve(import.meta.dirname, "..");
const binary = process.env.OPENSEES_BIN;
if (!binary) throw new Error("OPENSEES_BIN must point to the supplied OpenSees executable.");

const inputPath = join(root, "verification/reference-data/opensees/eccentric-truss.tcl");
const referencePath = join(
  root,
  "verification/reference-data/opensees/eccentric-truss-reference.json",
);
const inputHash = createHash("sha256").update(readFileSync(inputPath)).digest("hex");
const reference = JSON.parse(readFileSync(referencePath, "utf8"));

if (
  reference.oracle?.name !== "OpenSees" ||
  reference.oracle.version !== "3.8.0" ||
  reference.oracle.commit !== "6e55293513192aa05c7e1205e66a5a1a1ed088c4"
) {
  throw new Error("Unexpected committed OpenSees executable identity.");
}
if (reference.oracle.binarySha256 !== expectedBinaryHash) {
  throw new Error(`Unexpected committed OpenSees binary SHA-256: ${reference.oracle.binarySha256}`);
}
if (reference.oracle.inputSha256 !== inputHash) {
  throw new Error(`OpenSees input SHA-256 differs from its committed reference: ${inputHash}`);
}
if (
  JSON.stringify(reference.oracle.command) !==
  JSON.stringify(["OPENSEES_BIN", "eccentric-truss.tcl"])
) {
  throw new Error("Unexpected committed OpenSees command.");
}

const binaryPath = resolve(binary);
const binaryHash = createHash("sha256").update(readFileSync(binaryPath)).digest("hex");
if (binaryHash !== expectedBinaryHash)
  throw new Error(`Unexpected OpenSees binary SHA-256: ${binaryHash}`);

function parseResults(output) {
  const lines = output.split(/\r?\n/u).filter((line) => line.startsWith("XFRAME "));
  if (lines.length !== 1)
    throw new Error(`Expected one XFRAME result line, received ${lines.length}.`);
  const match = /^XFRAME thetaA\s+(\S+)\s+thetaB\s+(\S+)\s+axialForceMagnitude\s+(\S+)\s*$/u.exec(
    lines[0],
  );
  if (!match) throw new Error(`Could not parse OpenSees result line: ${lines[0]}`);
  const [thetaA, thetaB, axialForceMagnitude] = match.slice(1).map(Number);
  if (![thetaA, thetaB, axialForceMagnitude].every(Number.isFinite)) {
    throw new Error("OpenSees result line contains a non-finite value.");
  }
  return { thetaA, thetaB, axialForceMagnitude };
}

function compare(actual, expected, name) {
  if (!Number.isFinite(actual) || !Number.isFinite(expected)) {
    throw new Error(`OpenSees ${name} is not finite.`);
  }
  const tolerance = 1e-12 * (1 + Math.max(Math.abs(actual), Math.abs(expected)));
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(
      `OpenSees ${name} differs: actual=${actual} expected=${expected} tolerance=${tolerance}`,
    );
  }
}

const temporaryRoot = mkdtempSync(join(tmpdir(), "xframe-opensees-verify-"));
try {
  const localInput = join(temporaryRoot, "eccentric-truss.tcl");
  cpSync(inputPath, localInput);
  const execution = spawnSync(binaryPath, [localInput], {
    cwd: temporaryRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (execution.error) throw execution.error;
  if (execution.status !== 0)
    throw new Error(`OpenSees exited with status ${execution.status}: ${execution.stderr}`);
  const actual = parseResults(`${execution.stdout ?? ""}\n${execution.stderr ?? ""}`);
  compare(actual.thetaA, reference.results.thetaA, "thetaA");
  compare(actual.thetaB, reference.results.thetaB, "thetaB");
  compare(actual.axialForceMagnitude, reference.results.axialForceMagnitude, "axialForceMagnitude");
  console.log("OpenSees eccentric-truss reference verified non-destructively.");
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}
