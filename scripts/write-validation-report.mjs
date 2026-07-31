import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const outputRoot = join(root, ".validation-dist");
const reportPath = join(root, "docs/verification/requested-validation-report.md");
const jsonPath = join(root, "docs/verification/requested-validation-results.json");

function number(value) {
  if (Object.is(value, -0)) return "0";
  if (value === 0) return "0";
  if (Math.abs(value) >= 1e6 || Math.abs(value) < 1e-5) return value.toExponential(12);
  return value.toPrecision(12).replace(/(?:\.0+|(?<=\.[0-9]*?)0+)$/u, "");
}

rmSync(outputRoot, { recursive: true, force: true });
try {
  execFileSync(process.execPath, [join(root, "node_modules/typescript/bin/tsc"), "-p", join(root, "tsconfig.validation.json")], { cwd: root, stdio: "inherit" });
  const { requestedValidationCases } = await import(`${join(outputRoot, "verification/validation/requested-validation-cases.js")}?${Date.now()}`);
  const results = requestedValidationCases.map((validationCase) => validationCase.run());
  if (results.some(({ pass }) => !pass)) throw new Error("Validation report generation refused because one or more cases failed.");

  const categoryRows = Array.from({ length: 12 }, (_, index) => {
    const category = index + 1;
    const cases = results.filter((entry) => entry.category === category);
    return {
      category,
      count: cases.length,
      failures: cases.filter((entry) => !entry.pass).length,
      maximumErrorPercent: Math.max(...cases.map((entry) => entry.maxErrorPercent)),
    };
  });

  const lines = [
    "# Requested 3D Frame Validation Report",
    "",
    "This report implements the supplied twelve-category validation matrix. Every case is executable through `verification/validation/requested-suite.test.ts`. It is an engineering verification record, not a formal certification.",
    "",
    `- Cases: **${results.length}**`,
    `- Passed: **${results.filter(({ pass }) => pass).length}**`,
    `- Failed: **${results.filter(({ pass }) => !pass).length}**`,
    `- Direct or matrix-direct Frame3DD classifications: **${results.filter(({ frame3ddCoverage }) => frame3ddCoverage === "direct" || frame3ddCoverage === "matrix-direct").length}**`,
    "",
    "## Category summary",
    "",
    "| Category | Cases | Failures | Maximum error (%) | Priority flag |",
    "| ---: | ---: | ---: | ---: | --- |",
    ...categoryRows.map(({ category, count, failures, maximumErrorPercent }) => `| ${category} | ${count} | ${failures} | ${number(maximumErrorPercent)} | ${failures > 1 ? "PRIORITY" : "—"} |`),
    "",
    "## Case summary",
    "",
    "| Test ID | Category | Pass/Fail | Maximum error (%) | Frame3DD coverage |",
    "| --- | ---: | --- | ---: | --- |",
    ...results.map((entry) => `| ${entry.id} | ${entry.category} | ${entry.pass ? "Pass" : "Fail"} | ${number(entry.maxErrorPercent)} | ${entry.frame3ddCoverage} |`),
    "",
    "## Convention differences",
    "",
    "- `VAL-10-001` and `VAL-10-005`: Frame3DD and xframe use local transverse axes that differ by a 180° roll for vertical members. The comparison applies the exact sign transformation `[+,-,-,+,-,-]` to each six-component local end-force block. Global stiffness, displacements, reactions, and transformed local forces agree; this is not logged as an xframe numerical defect.",
    "- Frame3DD result text uses its own local-force signs and approximately six printed decimal digits. Stored matrix and result tolerances are fixed before comparison.",
    "",
    "## Defect record",
    "",
    "- **xframe defect found and fixed:** sparse affine reduction counted a symmetric off-diagonal term only once when both original DOFs mapped to the same reduced DOF. The reproducing oblique-restraint truss had a 33.33% stiffness error. `FR-CON-003/NFR-COR-001` now protects the corrected double contribution.",
    "- **Frame3DD discrepancy retained:** an interior axial point force uses opposite end distances in the supplied `20140514+` binary.",
    "- **Frame3DD discrepancy retained:** transverse Timoshenko point-force response exchanges the two bending-plane shear parameters in the supplied binary.",
    "- The affected Frame3DD quantities are not used as xframe expected values; independent closed forms are used instead.",
    "",
    "## Detailed cases",
    "",
  ];

  for (const entry of results) {
    lines.push(
      `### ${entry.id}`,
      "",
      `**Test ID:** ${entry.id}`,
      "",
      `**Description:** ${entry.description}`,
      "",
      `**Model:** ${entry.model}`,
      "",
      `**Supports / releases / springs / offsets:** ${entry.supports}`,
      "",
      `**Loads:** ${entry.loads}`,
      "",
      `**Reference method:** ${entry.referenceMethod}`,
      "",
      "**Reference value(s):**",
      "",
      ...entry.values.map((item) => `- ${item.name}: ${number(item.reference)} ${item.units}`),
      "",
      "**Library output:**",
      "",
      ...entry.values.map((item) => `- ${item.name}: ${number(item.actual)} ${item.units}`),
      "",
      `**Error (%):** maximum ${number(entry.maxErrorPercent)}`,
      "",
      `**Tolerance used and why:** ${number(entry.tolerancePercent)}%. ${entry.toleranceReason}`,
      "",
      `**Pass/Fail:** ${entry.pass ? "Pass" : "Fail"}`,
      "",
      `**Frame3DD coverage:** ${entry.frame3ddCoverage}`,
      ...(entry.notes === undefined ? [] : ["", `**Notes:** ${entry.notes}`]),
      "",
    );
  }

  mkdirSync(join(root, "docs/verification"), { recursive: true });
  writeFileSync(reportPath, `${lines.join("\n")}\n`);
  writeFileSync(jsonPath, `${JSON.stringify({ schemaVersion: "1", results, categorySummary: categoryRows }, null, 2)}\n`);
  console.log(`Validation report written: ${results.length} passing cases.`);
} finally {
  rmSync(outputRoot, { recursive: true, force: true });
}
