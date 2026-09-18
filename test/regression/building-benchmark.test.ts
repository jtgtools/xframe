import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

interface BenchmarkCase {
  readonly label: string;
  readonly stories: number;
  readonly bays: number;
  readonly equations: number;
  readonly coordinateNonzeros: number;
  readonly skylineStorage: number;
  readonly checks: { readonly normalizedResidual: number; readonly loadScalingRatio: number };
  readonly reuse: {
    readonly assemblyCount: number;
    readonly factorizationCount: number;
    readonly solveCount: number;
  };
}

interface BenchmarkReport {
  readonly schemaVersion: string;
  readonly model: string;
  readonly cases: readonly BenchmarkCase[];
}

function readReport(): BenchmarkReport {
  return JSON.parse(
    readFileSync("docs/verification/benchmark-results.json", "utf8"),
  ) as BenchmarkReport;
}

it("benchmark covers real building scenarios instead of a one-DOF spring chain", () => {
  const report = readReport();
  expect(report.model).not.toMatch(/one-DOF spring chain/);
  expect(report.model).toMatch(/moment frame|building/i);
  const labels = report.cases.map((c) => c.label);
  for (const required of ["2-story", "5-story", "10-story", "15-story", "tower-grid"])
    expect(labels.join(" ")).toMatch(required);
});

it("building benchmarks show realistic coupled bandwidth and reuse one factorization", () => {
  const report = readReport();
  for (const c of report.cases) {
    expect(c.equations).toBeGreaterThan(50);
    // Real 6-DOF frames couple far more than a tridiagonal spring chain (bandwidth 2).
    expect(c.coordinateNonzeros).toBeGreaterThan(c.equations * 2);
    expect(c.reuse.assemblyCount).toBe(1);
    expect(c.reuse.factorizationCount).toBe(1);
    expect(c.reuse.solveCount).toBe(2);
    expect(c.checks.loadScalingRatio).toBeCloseTo(2, 10);
    expect(c.checks.normalizedResidual).toBeLessThan(1e-9);
  }
});
