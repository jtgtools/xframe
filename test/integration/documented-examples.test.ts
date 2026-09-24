import { expect, it } from "vitest";
import { runTwoStoryTwoBayExample } from "../../examples/two-story-two-bay-frame.js";
import { runIndustrialPortalExample } from "../../examples/industrial-portal-with-truss-roof.js";
import { runTowerGridExample } from "../../examples/tower-grid-floor.js";
import { runBuildingJsonRoundtripExample } from "../../examples/building-json-roundtrip.js";

it("the two-story building example drifts laterally and equilibrates base shear", () => {
  const output = runTwoStoryTwoBayExample();
  expect(output.diagnosticStatus).toBe("pass");
  expect(output.roofDrift).toBeGreaterThan(0);
  expect(output.roofDrift).toBeLessThan(0.05);
  expect(output.baseShear).toBeCloseTo(-9000, 6);
  expect(output.baseMoment).not.toBeCloseTo(0, 6);
  expect(output.combinedRoofDrift).toBeCloseTo(
    output.gravityRoofDrift * 1.2 + output.lateralRoofDrift * 1.6,
    10,
  );
});

it("the industrial portal example releases pinned bases and carries truss roof load", () => {
  const output = runIndustrialPortalExample();
  expect(output.diagnosticStatus).toBe("pass");
  // 1e-6 absolute on a ~1e4 N*m moment scale (~1e-10 relative) covers
  // condensation + rigid-offset rounding across the multi-bay assembly;
  // kernel-level checks below use 1e-12 on unit-scale residuals.
  expect(Math.abs(output.pinnedBaseMoment)).toBeLessThan(1e-6);
  expect(output.trussAxial).not.toBeCloseTo(0, 6);
  expect(Math.abs(output.eaveDisplacement)).toBeGreaterThan(1e-9);
});

it("the tower grid example couples torsion through a rigid diaphragm on springs", () => {
  const output = runTowerGridExample();
  expect(output.diagnosticStatus).toBe("pass");
  expect(output.diaphragmDrift).toBeGreaterThan(0);
  expect(output.springShear).not.toBeCloseTo(0, 6);
  expect(output.envelopeMax).toBeGreaterThanOrEqual(output.envelopeMin);
});

it("the building JSON example round-trips a real frame canonically", async () => {
  const output = await runBuildingJsonRoundtripExample();
  expect(output.sameCanonicalJson).toBe(true);
  expect(output.hash).toMatch(/^[0-9a-f]{64}$/);
  expect(output.roofDrift).toBeGreaterThan(0);
  expect(output.diagnosticStatus).toBe("pass");
});
