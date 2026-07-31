import { writeFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import { assembleStiffness } from "../dist/analysis/assemble-stiffness.js";
import { prepareAnalysis } from "../dist/analysis/prepare-analysis.js";
import { buildAdjacency } from "../dist/linalg/adjacency.js";
import { reverseCuthillMcKee } from "../dist/linalg/reverse-cuthill-mckee.js";
import { factorSkylineCholesky } from "../dist/linalg/skyline-cholesky.js";
import { createSkylineProfile } from "../dist/linalg/skyline-profile.js";
import { createModelBuilder } from "../dist/model/model-builder.js";

const units = { version: "1", length: "m", force: "N", moment: "N*m", modulus: "Pa", distributedForce: "N/m", density: "kg/m^3", rotation: "rad" };

function timed(operation) {
  const start = performance.now();
  const value = operation();
  return { value, milliseconds: performance.now() - start };
}

function buildChain(equations) {
  const builder = createModelBuilder().setUnitSystem(units);
  for (let index = 0; index < equations; index += 1) builder.addNode({ id: `n${String(index).padStart(5, "0")}`, coordinates: [index, 0, 0] });
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
  const assembly = timed(() => assembleStiffness(topology.value));
  const ordering = timed(() => reverseCuthillMcKee(buildAdjacency(assembly.value.reduced)));
  const profile = timed(() => createSkylineProfile(assembly.value.reduced, ordering.value));
  const factorization = timed(() => factorSkylineCholesky(profile.value));
  const rhs = new Float64Array(equations);
  rhs[equations - 1] = 1;
  const solve = timed(() => factorization.value.solve(rhs));
  const recovery = timed(() => assembly.value.constraints.recover(solve.value));
  const preparation = timed(() => prepareAnalysis(topology.value));
  const firstCase = timed(() => preparation.value.solveCase("P1"));
  const secondCase = timed(() => preparation.value.solveCase("P2"));
  const coordinateNonzeros = [...assembly.value.full.entries()].length;
  const estimatedBytes = coordinateNonzeros * 24 + profile.value.storageCount * 8 + equations * 8 * 5;
  return {
    equations,
    coordinateNonzeros,
    skylineStorage: profile.value.storageCount,
    estimatedSparseWorkingBytes: estimatedBytes,
    timingsMilliseconds: {
      topology: topology.milliseconds,
      assembly: assembly.milliseconds,
      ordering: ordering.milliseconds,
      profile: profile.milliseconds,
      factorization: factorization.milliseconds,
      solve: solve.milliseconds,
      recovery: recovery.milliseconds,
      prepareEndToEnd: preparation.milliseconds,
      firstCase: firstCase.milliseconds,
      reusedSecondCase: secondCase.milliseconds,
    },
    reuse: preparation.value.statistics,
    checks: {
      finalDisplacement: recovery.value[equations - 1],
      loadScalingRatio: secondCase.value.fullDisplacements[equations - 1] / firstCase.value.fullDisplacements[equations - 1],
      normalizedResidual: firstCase.value.diagnostics.normalizedResidual,
      minimumNormalizedPivot: factorization.value.diagnostics.minimumNormalizedPivot,
    },
  };
}

const sizes = [500, 2000, 5000];
if (process.env.XFRAME_BENCH_10000 === "1") sizes.push(10000);
const report = {
  schemaVersion: "1",
  runtime: { node: process.version, platform: process.platform, architecture: process.arch },
  model: "deterministic one-DOF spring chain with one ground spring, N-1 link springs, and two load cases",
  cases: sizes.map(run),
};
writeFileSync("docs/verification/benchmark-results.json", `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
