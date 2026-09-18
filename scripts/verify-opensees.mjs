import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const expectedBinaryHash = "5aa4e9c80c410c510ca62ac3b2f1d64a8e50679f0238e140b5bebcd6d5ddbe6d";
const expectedVersion = "3.8.0";
const expectedCommit = "6e55293513192aa05c7e1205e66a5a1a1ed088c4";
const root = resolve(import.meta.dirname, "..");
const binary = process.env.OPENSEES_BIN;
if (!binary)
  throw new Error(
    "OPENSEES_BIN must point to the supplied OpenSees Tcl executable (no openseespy).",
  );

const datasets = [
  { name: "eccentric-truss", kind: "eccentric" },
  { name: "cantilever-euler", kind: "building" },
  { name: "portal-frame", kind: "building" },
  { name: "two-story-two-bay", kind: "building" },
  { name: "triangular-truss", kind: "building" },
];

function checkOracle(name, reference, inputHash) {
  if (
    reference.oracle?.name !== "OpenSees" ||
    reference.oracle.version !== expectedVersion ||
    reference.oracle.commit !== expectedCommit
  ) {
    throw new Error(`Unexpected committed OpenSees executable identity for ${name}.`);
  }
  if (reference.oracle.binarySha256 !== expectedBinaryHash) {
    throw new Error(`Unexpected committed OpenSees binary SHA-256 for ${name}.`);
  }
  if (reference.oracle.inputSha256 !== inputHash) {
    throw new Error(`OpenSees input SHA-256 differs from its committed reference for ${name}.`);
  }
  if (
    JSON.stringify(reference.oracle.command) !== JSON.stringify(["OPENSEES_BIN", `${name}.tcl`])
  ) {
    throw new Error(`Unexpected committed OpenSees command for ${name}.`);
  }
}

function parseEccentric(output) {
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

function compareEccentric(actual, expected, name) {
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

const binaryPath = resolve(binary);
const binaryHash = createHash("sha256").update(readFileSync(binaryPath)).digest("hex");
if (binaryHash !== expectedBinaryHash)
  throw new Error(`Unexpected OpenSees binary SHA-256: ${binaryHash}`);

const temporaryRoot = mkdtempSync(join(tmpdir(), "xframe-opensees-verify-"));
try {
  for (const { name, kind } of datasets) {
    const inputPath = join(root, `verification/reference-data/opensees/${name}.tcl`);
    const referencePath = join(root, `verification/reference-data/opensees/${name}-reference.json`);
    const inputHash = createHash("sha256")
      .update(readFileSync(inputPath, "utf8").replace(/\r\n/gu, "\n"))
      .digest("hex");
    const reference = JSON.parse(readFileSync(referencePath, "utf8"));
    checkOracle(name, reference, inputHash);

    const localInput = join(temporaryRoot, `${name}.tcl`);
    cpSync(inputPath, localInput);
    const execution = spawnSync(binaryPath, [localInput], {
      cwd: temporaryRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    if (execution.error) throw execution.error;
    if (execution.status !== 0)
      throw new Error(
        `OpenSees ${name} exited with status ${execution.status}: ${execution.stderr}`,
      );
    const output = `${execution.stdout ?? ""}\n${execution.stderr ?? ""}`;
    const lines = output.split(/\r?\n/u).filter((line) => line.startsWith("XFRAME "));
    if (lines.length < 1) throw new Error(`OpenSees ${name} produced no XFRAME result lines.`);
    for (const line of lines) {
      if (line.length > 10000)
        throw new Error(`OpenSees ${name} result line is unexpectedly long.`);
    }
    if (kind === "eccentric") {
      const actual = parseEccentric(output);
      compareEccentric(actual.thetaA, reference.results.thetaA, `${name}.thetaA`);
      compareEccentric(actual.thetaB, reference.results.thetaB, `${name}.thetaB`);
      compareEccentric(
        actual.axialForceMagnitude,
        reference.results.axialForceMagnitude,
        `${name}.axialForceMagnitude`,
      );
    }
    console.log(`OpenSees ${name} executed non-destructively (${lines.length} XFRAME lines).`);
  }
  console.log("OpenSees references verified non-destructively: 5 datasets.");
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}
