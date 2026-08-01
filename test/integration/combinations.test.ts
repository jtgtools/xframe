import { expect, it } from "vitest";
import { XFrameError } from "../../src/errors/xframe-error.js";
import { prepareAnalysis } from "../../src/analysis/prepare-analysis.js";
import { combineResults } from "../../src/results/combine-results.js";
import { createModelBuilder } from "../../src/model/model-builder.js";

function createFingerprintModel(stiffness: number, id: string) {
  return createModelBuilder()
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
    .addNode({ id: "n", coordinates: [0, 0, 0] })
    .addSpring({ id: "k", startNodeId: "n", stiffness: [stiffness, 0, 0, 0, 0, 0] })
    .addLoadCase({ id, loads: [{ kind: "nodal", nodeId: "n", force: [10, 0, 0] }] })
    .finalize();
}

it("FR-SAFE-001/FR-RES-006: combines compatible results without aliasing and preserves factor provenance", () => {
  const model = createModelBuilder()
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
    .addNode({ id: "n", coordinates: [0, 0, 0] })
    .addSpring({ id: "k", startNodeId: "n", stiffness: [100, 0, 0, 0, 0, 0] })
    .addLoadCase({ id: "A", loads: [{ kind: "nodal", nodeId: "n", force: [10, 0, 0] }] })
    .addLoadCase({ id: "B", loads: [{ kind: "nodal", nodeId: "n", force: [-4, 0, 0] }] })
    .finalize();
  const prepared = prepareAnalysis(model);
  const [a, b] = prepared.solveCases(["A", "B"]);
  const result = combineResults("C", [
    { result: a!, factor: 1.2 },
    { result: b!, factor: 0.5 },
  ]);
  expect(result.kind).toBe("combination");
  expect(result.fullDisplacements[0]).toBeCloseTo(0.1, 14);
  expect(result.factors).toEqual([
    { resultId: "A", factor: 1.2 },
    { resultId: "B", factor: 0.5 },
  ]);
  expect(result.fullDisplacements).not.toBe(a!.fullDisplacements);
});

it("FR-SAFE-001/FR-RES-006: rejects duplicate source IDs and a combination ID collision", () => {
  const model = createModelBuilder()
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
    .addNode({ id: "n", coordinates: [0, 0, 0] })
    .addSpring({ id: "k", startNodeId: "n", stiffness: [100, 0, 0, 0, 0, 0] })
    .addLoadCase({ id: "A", loads: [{ kind: "nodal", nodeId: "n", force: [10, 0, 0] }] })
    .finalize();
  const result = prepareAnalysis(model).solveCase("A");
  for (const action of [
    () =>
      combineResults("C", [
        { result, factor: 1 },
        { result, factor: 2 },
      ]),
    () => combineResults("A", [{ result, factor: 1 }]),
  ]) {
    expect(action).toThrowError(XFrameError);
    let error: unknown;
    try {
      action();
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(XFrameError);
    expect((error as XFrameError).code).toBe("RESULT_INCOMPATIBLE");
  }
});

it("FR-SAFE-001: rejects results with differing SHA-256 model fingerprints", () => {
  const first = prepareAnalysis(createFingerprintModel(100, "A")).solveCase("A");
  const second = prepareAnalysis(createFingerprintModel(200, "B")).solveCase("B");
  expect(first.modelFingerprint).toMatch(/^sha256:[0-9a-f]{64}$/u);
  expect(second.modelFingerprint).not.toBe(first.modelFingerprint);
  expect(() =>
    combineResults("C", [
      { result: first, factor: 1 },
      { result: second, factor: 1 },
    ]),
  ).toThrowError(/Results cannot be combined/u);
});

it("FR-SAFE-001/FR-RES-006/NFR-COR-002: rejects entity-order fabrication and non-finite combined output", () => {
  const model = createModelBuilder()
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
    .addNode({ id: "n", coordinates: [0, 0, 0] })
    .addSpring({ id: "k", startNodeId: "n", stiffness: [1, 0, 0, 0, 0, 0] })
    .addLoadCase({ id: "A", loads: [{ kind: "nodal", nodeId: "n", force: [2, 0, 0] }] })
    .finalize();
  const result = prepareAnalysis(model).solveCase("A");
  const fabricated = {
    ...result,
    id: "B",
    nodes: [{ ...result.nodes[0]!, id: "other" }],
  } as unknown as typeof result;
  expect(() =>
    combineResults("C", [
      { result, factor: 1 },
      { result: fabricated, factor: 1 },
    ]),
  ).toThrowError(XFrameError);
  expect(() => combineResults("C", [{ result, factor: Number.MAX_VALUE }])).toThrowError(
    XFrameError,
  );
});
