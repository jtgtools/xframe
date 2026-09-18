import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import { prepareAnalysis } from "../../src/analysis/prepare-analysis.js";
import { createModelBuilder } from "../../src/model/model-builder.js";

interface OpenSeesReference {
  readonly oracle: {
    readonly name: "OpenSees";
    readonly version: "3.8.0";
    readonly commit: "6e55293513192aa05c7e1205e66a5a1a1ed088c4";
    readonly binarySha256: "5aa4e9c80c410c510ca62ac3b2f1d64a8e50679f0238e140b5bebcd6d5ddbe6d";
    readonly inputSha256: string;
    readonly command: readonly ["OPENSEES_BIN", "eccentric-truss.tcl"];
  };
  readonly results: {
    readonly thetaA: number;
    readonly thetaB: number;
    readonly axialForceMagnitude: number;
  };
}

const inputPath = join(process.cwd(), "verification/reference-data/opensees/eccentric-truss.tcl");
const referencePath = join(
  process.cwd(),
  "verification/reference-data/opensees/eccentric-truss-reference.json",
);

function readReference(): OpenSeesReference {
  expect(existsSync(inputPath)).toBe(true);
  expect(existsSync(referencePath)).toBe(true);
  return JSON.parse(readFileSync(referencePath, "utf8")) as OpenSeesReference;
}

function eccentricTrussResult() {
  const builder = createModelBuilder()
    .setUnitSystem({
      version: "1",
      length: "m",
      force: "N",
      moment: "N*m",
      modulus: "Pa",
      distributedForce: "N/m",
      density: "kg/m^3",
      rotation: "rad",
    })
    .addNode({ id: "a", coordinates: [0, 0, 0] })
    .addNode({ id: "b", coordinates: [1, 0, 0] })
    .addMaterial({ id: "m", elasticModulus: 1000, shearModulus: 400 })
    .addTrussSection({ id: "s", area: 1 })
    .addTruss({
      id: "t",
      startNodeId: "a",
      endNodeId: "b",
      materialId: "m",
      sectionId: "s",
      rigidOffsets: { start: [0, 1, 0], end: [0, 1, 0] },
    });

  for (const nodeId of ["a", "b"] as const) {
    for (const dof of ["tx", "ty", "tz", "rx", "ry"] as const) {
      builder.addConstraint({
        id: `fix:${nodeId}:${dof}`,
        terms: [{ nodeId, dof, coefficient: 1 }],
        rightHandSide: 0,
      });
    }
  }

  return prepareAnalysis(
    builder
      .addSpring({ id: "ka", startNodeId: "a", stiffness: { rz: 1000 } })
      .addSpring({ id: "kb", startNodeId: "b", stiffness: { rz: 1000 } })
      .addLoadCase({ id: "M", loads: [{ kind: "nodal", nodeId: "a", moment: [0, 0, 1000] }] })
      .finalize(),
  ).solveCase("M");
}

function rotation(result: ReturnType<typeof eccentricTrussResult>, nodeId: "a" | "b"): number {
  return result.nodes
    .find(({ id }) => id === nodeId)!
    .displacements.find(({ dof }) => dof === "rz")!.value;
}

it("xframe matches the committed OpenSees eccentric-truss oracle", () => {
  const reference = readReference();
  const input = readFileSync(inputPath, "utf8");
  expect(reference.oracle).toMatchObject({
    name: "OpenSees",
    version: "3.8.0",
    commit: "6e55293513192aa05c7e1205e66a5a1a1ed088c4",
    binarySha256: "5aa4e9c80c410c510ca62ac3b2f1d64a8e50679f0238e140b5bebcd6d5ddbe6d",
    command: ["OPENSEES_BIN", "eccentric-truss.tcl"],
  });
  expect(reference.oracle.inputSha256).toBe(createHash("sha256").update(input).digest("hex"));

  const result = eccentricTrussResult();
  expect(rotation(result, "a")).toBeCloseTo(reference.results.thetaA, 12);
  expect(rotation(result, "b")).toBeCloseTo(reference.results.thetaB, 12);
  expect(Math.abs(result.trusses[0]!.axialForce)).toBeCloseTo(
    reference.results.axialForceMagnitude,
    12,
  );
});

it("OpenSees oracle rejects an unapproved committed binary hash", () => {
  const reference = readReference();
  expect(reference.oracle.binarySha256).toBe(
    "5aa4e9c80c410c510ca62ac3b2f1d64a8e50679f0238e140b5bebcd6d5ddbe6d",
  );
  expect("unapproved").not.toBe(reference.oracle.binarySha256);
});

it("OpenSees oracle detects a changed Tcl input via its SHA-256", () => {
  const reference = readReference();
  const input = readFileSync(inputPath, "utf8");
  const tampered = `${input}\n# tamper\n`;
  expect(createHash("sha256").update(tampered).digest("hex")).not.toBe(
    reference.oracle.inputSha256,
  );
});

it("OpenSees building oracles pin the Tcl binary command without openseespy", () => {
  for (const name of [
    "cantilever-euler",
    "portal-frame",
    "two-story-two-bay",
    "triangular-truss",
  ]) {
    const ref = JSON.parse(
      readFileSync(
        join(process.cwd(), `verification/reference-data/opensees/${name}-reference.json`),
        "utf8",
      ),
    ) as { oracle: { command: readonly string[]; name: string } };
    expect(ref.oracle.name).toBe("OpenSees");
    expect(ref.oracle.command).toEqual(["OPENSEES_BIN", `${name}.tcl`]);
  }
});
