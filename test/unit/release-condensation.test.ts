import { describe, expect, it } from "vitest";
import { computeFrameLocalStiffness } from "../../src/elements/frame/local-stiffness.js";
import { condenseFrameEndReleases } from "../../src/elements/frame/release-condensation.js";
import { recoverFrameEndForces } from "../../src/elements/frame/end-force-recovery.js";
import { classifyAllFrameReleaseMasks } from "../../src/elements/frame/release-mask-enumerator.js";
import { XFrameError } from "../../src/errors/xframe-error.js";

const k = computeFrameLocalStiffness({
  length: 5,
  elasticModulus: 200e9,
  shearModulus: 80e9,
  area: 0.02,
  torsionalConstant: 1e-4,
  momentOfInertiaY: 5e-5,
  momentOfInertiaZ: 6e-5,
  theory: { kind: "euler-bernoulli" },
});

describe("frame release condensation", () => {
  it("FR-ELE-005: exactly condenses stiffness and loads for an end hinge", () => {
    const p = new Float64Array(12);
    p[7] = -10;
    const condensed = condenseFrameEndReleases(k, p, 1 << 11);
    expect(condensed.stiffness[11 * 12 + 11]).toBe(0);
    expect(condensed.load[11]).toBe(0);
    const forces = recoverFrameEndForces(condensed, new Float64Array(12));
    expect(forces[11]).toBeCloseTo(0, 8);
    for (let row = 0; row < 12; row += 1) for (let column = 0; column < 12; column += 1) expect(condensed.stiffness[row * 12 + column]).toBeCloseTo(condensed.stiffness[column * 12 + row]!, 10);
  });

  it("FR-ELE-005: rejects a singular released block instead of adding stiffness", () => {
    expect(() => condenseFrameEndReleases(k, new Float64Array(12), (1 << 0) | (1 << 6))).toThrow(XFrameError);
  });

  it("FR-ELE-006: classifies every one of the 4,096 masks", () => {
    const summary = classifyAllFrameReleaseMasks(k);
    expect(summary.validCount + summary.invalidCount).toBe(4096);
    expect(summary.classifications.length).toBe(4096);
    expect(summary.classifications.every((entry) => entry.status === "valid" || entry.status === "local-mechanism")).toBe(true);
  });
});
