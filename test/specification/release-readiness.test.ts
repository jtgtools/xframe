import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";

function filesUnder(root: string): string[] {
  const output: string[] = [];
  for (const name of readdirSync(root)) {
    const path = join(root, name);
    if (statSync(path).isDirectory()) output.push(...filesUnder(path));
    else output.push(path);
  }
  return output;
}

it("the repository has a factual final audit and no focused or skipped tests", () => {
  expect(existsSync("docs/verification/final-audit.md")).toBe(true);
  const audit = readFileSync("docs/verification/final-audit.md", "utf8");
  for (const phrase of [
    "clean installation",
    "OpenSees",
    "element stiffness",
    "global stiffness",
    "4,096",
    "not formally certified",
  ])
    expect(audit).toContain(phrase);

  const tests = [...filesUnder("test"), ...filesUnder("verification")]
    .filter((path) => path.endsWith(".ts"))
    .map((path) => readFileSync(path, "utf8"))
    .join("\n");
  expect(tests).not.toMatch(/\.(?:skip|only|todo)\s*\(/);
});

it("production runtime remains browser-safe and free of release placeholders", () => {
  const source = filesUnder("src")
    .filter((path) => path.endsWith(".ts"))
    .map((path) => readFileSync(path, "utf8"))
    .join("\n");
  expect(source).not.toMatch(/from\s+["']node:/);
  expect(source).not.toMatch(/\b(?:TODO|FIXME|STUB)\b/);
});

it("npm is the only declared package manager", () => {
  const packageJson = readFileSync("package.json", "utf8");
  expect(packageJson).toContain('"packageManager": "npm@');
  expect(packageJson).not.toMatch(/\b(?:bun|pnpm|yarn)\b/i);
});

it("runtime boundary check resolves the repository root portably", () => {
  expect(() =>
    execFileSync(process.execPath, ["scripts/check-runtime-imports.mjs"], {
      cwd: process.cwd(),
      stdio: "pipe",
    }),
  ).not.toThrow();
});

it("OpenSees references have a non-destructive executable verification command", () => {
  const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
    readonly scripts?: Readonly<Record<string, string>>;
  };
  expect(packageJson.scripts?.["verify:opensees"]).toBe("node scripts/verify-opensees.mjs");
  expect(existsSync("scripts/verify-opensees.mjs")).toBe(true);
  expect(packageJson.scripts?.["verify:frame3dd"]).toBeUndefined();
  expect(existsSync("scripts/verify-frame3dd.mjs")).toBe(false);
  for (const name of [
    "eccentric-truss",
    "cantilever-euler",
    "portal-frame",
    "two-story-two-bay",
    "triangular-truss",
  ]) {
    expect(existsSync(`verification/reference-data/opensees/${name}.tcl`)).toBe(true);
    expect(existsSync(`verification/reference-data/opensees/${name}-reference.json`)).toBe(true);
  }
});

it("published safety-correctness evidence records the OpenSees oracle", () => {
  const reportPath = "docs/verification/safety-correctness-report.md";
  expect(existsSync(reportPath)).toBe(true);
  const report = readFileSync(reportPath, "utf8");
  for (const phrase of [
    "OpenSees 3.8.0",
    "5aa4e9c80c410c510ca62ac3b2f1d64a8e50679f0238e140b5bebcd6d5ddbe6d",
    "$env:OPENSEES_BIN = 'D:\\DEV\\tools\\OpenSees3.8.0\\bin\\OpenSees.exe'; npm run verify:opensees",
    "thetaA = 0.6666666666666666",
    "thetaB = 0.3333333333333333",
    "axialForceMagnitude = 333.3333333333333",
    "OpenSees references verified non-destructively: 5 datasets.",
  ])
    expect(report).toContain(phrase);
});
