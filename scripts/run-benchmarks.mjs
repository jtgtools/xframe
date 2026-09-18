import { writeFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import { createModelBuilder, prepareAnalysis } from "../dist/index.js";

const units = {
  version: "1",
  length: "m",
  force: "N",
  moment: "N*m",
  modulus: "Pa",
  distributedForce: "N/m",
  density: "kg/m^3",
  rotation: "rad",
};

function timed(operation) {
  const start = performance.now();
  const value = operation();
  return { value, milliseconds: performance.now() - start };
}

function buildChain(equations) {
  const builder = createModelBuilder().setUnitSystem(units);
  for (let index = 0; index < equations; index += 1)
    builder.addNode({ id: `n${String(index).padStart(5, "0")}`, coordinates: [index, 0, 0] });
  builder.addSpring({ id: "ground", startNodeId: "n00000", stiffness: [1000, 0, 0, 0, 0, 0] });
  for (let index = 1; index < equations; index += 1) {
    builder.addSpring({
      id: `link${String(index).padStart(5, "0")}`,
      startNodeId: `n${String(index - 1).padStart(5, "0")}`,
      endNodeId: `n${String(index).padStart(5, "0")}`,
      stiffness: [1000 + (index % 17), 0, 0, 0, 0, 0],
    });
  }
  const tip = `n${String(equations - 1).padStart(5, "0")}`;
  return builder
    .addLoadCase({ id: "P1", loads: [{ kind: "nodal", nodeId: tip, force: [1, 0, 0] }] })
    .addLoadCase({ id: "P2", loads: [{ kind: "nodal", nodeId: tip, force: [2, 0, 0] }] })
    .finalize();
}

function run(equations) {
  const topology = timed(() => buildChain(equations));
  const preparation = timed(() => prepareAnalysis(topology.value));
  const firstCase = timed(() => preparation.value.solveCase("P1"));
  const secondCase = timed(() => preparation.value.solveCase("P2"));
  const statistics = preparation.value.statistics;
  const coordinateNonzeros = statistics.fullNonzeros;
  const estimatedBytes =
    coordinateNonzeros * 24 + statistics.skylineStorage * 8 + equations * 8 * 5;
  return {
    equations,
    coordinateNonzeros,
    skylineStorage: statistics.skylineStorage,
    estimatedSparseWorkingBytes: estimatedBytes,
    timingsMilliseconds: {
      topology: topology.milliseconds,
      prepareEndToEnd: preparation.milliseconds,
      firstCase: firstCase.milliseconds,
      reusedSecondCase: secondCase.milliseconds,
    },
    reuse: statistics,
    checks: {
      finalDisplacement: firstCase.value.fullDisplacements[equations - 1],
      loadScalingRatio:
        secondCase.value.fullDisplacements[equations - 1] /
        firstCase.value.fullDisplacements[equations - 1],
      normalizedResidual: firstCase.value.diagnostics.normalizedResidual,
    },
  };
}

const sizes = [500, 2000, 5000];
if (process.env.XFRAME_BENCH_10000 === "1") sizes.push(10000);
const report = {
  schemaVersion: "2",
  runtime: { node: process.version, platform: process.platform, architecture: process.arch },
  model:
    "deterministic one-DOF spring chain with one ground spring, N-1 link springs, and two load cases",
  cases: sizes.map(run),
};
writeFileSync("docs/verification/benchmark-results.json", `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
