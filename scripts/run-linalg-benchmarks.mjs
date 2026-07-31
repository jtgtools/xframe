import { performance } from "node:perf_hooks";
import { buildAdjacency } from "../dist/linalg/adjacency.js";
import { reverseCuthillMcKee } from "../dist/linalg/reverse-cuthill-mckee.js";
import { factorSkylineCholesky } from "../dist/linalg/skyline-cholesky.js";
import { createSkylineProfile } from "../dist/linalg/skyline-profile.js";
import { SymmetricCoordinateBuilder } from "../dist/linalg/symmetric-coordinate-matrix.js";

function timed(operation) {
  const start = performance.now();
  const value = operation();
  return { value, milliseconds: performance.now() - start };
}

function run(size) {
  const assembly = timed(() => {
    const builder = new SymmetricCoordinateBuilder(size);
    for (let row = 0; row < size; row += 1) {
      builder.add(row, row, row === 0 || row === size - 1 ? 2 : 3);
      if (row > 0) builder.add(row, row - 1, -1);
    }
    return builder.finalize();
  });
  const ordering = timed(() => reverseCuthillMcKee(buildAdjacency(assembly.value)));
  const profile = timed(() => createSkylineProfile(assembly.value, ordering.value));
  const factorization = timed(() => factorSkylineCholesky(profile.value));
  const rhs = new Float64Array(size).fill(1);
  const solve = timed(() => factorization.value.solve(rhs));
  return {
    equations: size,
    storageCount: profile.value.storageCount,
    assemblyMilliseconds: assembly.milliseconds,
    orderingMilliseconds: ordering.milliseconds,
    profileMilliseconds: profile.milliseconds,
    factorizationMilliseconds: factorization.milliseconds,
    solveMilliseconds: solve.milliseconds,
    minimumNormalizedPivot: factorization.value.diagnostics.minimumNormalizedPivot,
    checksum: solve.value[0] + solve.value[size - 1],
  };
}

const report = {
  runtime: process.version,
  generatedAt: new Date().toISOString(),
  cases: [500, 2000, 5000].map(run),
};
console.log(JSON.stringify(report, null, 2));
