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

interface Frame3ddReference {
  readonly oracle: {
    readonly name: "Frame3DD";
    readonly version: "20140514+";
    readonly binarySha256?: string;
    readonly inputSha256: "fixture-input";
    readonly geometricStiffness: false;
    readonly command: readonly ["FRAME3DD_BIN"];
  };
  readonly units: {
    readonly length: "m";
  };
  readonly tolerances: {
    readonly matrices: {
      readonly relative: number;
      readonly absolute: number;
    };
    readonly results: {
      readonly relative: number;
      readonly absolute: number;
    };
  };
  readonly elementStiffness: readonly number[];
}

type Frame3ddComparator = (
  actual: Frame3ddReference,
  expected: Frame3ddReference,
  referenceName: string,
) => void;

const frame3ddLinuxHash = "53b1dc6628424b156e491e3205f13d58a0e325e33e4746d225b456ab85ac5275";
const frame3ddWindowsHash = "ad7056c210ad413c37d3627b8e9868fdc40ce09d76f167f2d5f98077d3aad626";

function frame3ddReference(
  value: number,
  binarySha256: string | undefined,
  relative = 1e-3,
  absolute = 1e-6,
): Frame3ddReference {
  return {
    oracle: {
      name: "Frame3DD",
      version: "20140514+",
      ...(binarySha256 === undefined ? {} : { binarySha256 }),
      inputSha256: "fixture-input",
      geometricStiffness: false,
      command: ["FRAME3DD_BIN"],
    },
    units: { length: "m" },
    tolerances: {
      matrices: { relative, absolute },
      results: { relative, absolute },
    },
    elementStiffness: [value],
  };
}

async function frame3ddComparator(): Promise<Frame3ddComparator> {
  const module = await import("../../scripts/verify-frame3dd.mjs");
  return module.compareReference as Frame3ddComparator;
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

it("FR-SAFE-002: xframe matches the committed OpenSees eccentric-truss oracle", () => {
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

it("FR-SAFE-002: Frame3DD comparator rejects a non-finite committed expected value", async () => {
  const compareReference = await frame3ddComparator();
  expect(() =>
    compareReference(
      frame3ddReference(0, frame3ddWindowsHash),
      frame3ddReference(Number.POSITIVE_INFINITY, frame3ddLinuxHash),
      "non-finite",
    ),
  ).toThrow("Frame3DD non-finite.elementStiffness[0] expected value is not finite.");
});

it("FR-SAFE-002: Frame3DD comparator uses zero expected values as the relative-tolerance scale", async () => {
  const compareReference = await frame3ddComparator();
  expect(() =>
    compareReference(
      frame3ddReference(2e-6, frame3ddWindowsHash),
      frame3ddReference(0, frame3ddLinuxHash),
      "zero-scale",
    ),
  ).toThrow("Frame3DD zero-scale.elementStiffness[0] differs:");
});

it("FR-SAFE-002: Frame3DD comparator rejects a near-zero expected sign reversal beyond its reference tolerance", async () => {
  const compareReference = await frame3ddComparator();
  expect(() =>
    compareReference(
      frame3ddReference(-1e-6, frame3ddWindowsHash),
      frame3ddReference(1e-6, frame3ddLinuxHash),
      "sign-reversal",
    ),
  ).toThrow("Frame3DD sign-reversal.elementStiffness[0] differs:");
});

it("FR-SAFE-002: Frame3DD comparator rejects an unapproved committed binary hash", async () => {
  const compareReference = await frame3ddComparator();
  expect(() =>
    compareReference(
      frame3ddReference(0, frame3ddWindowsHash),
      frame3ddReference(0, "unapproved"),
      "provenance",
    ),
  ).toThrow("Frame3DD provenance expected binary SHA-256 is not approved.");
});
