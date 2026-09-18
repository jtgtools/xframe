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
  it("exactly condenses stiffness and loads for an end hinge", () => {
    const p = new Float64Array(12);
    p[7] = -10;
    const condensed = condenseFrameEndReleases(k, p, 1 << 11);
    expect(condensed.stiffness[11 * 12 + 11]).toBe(0);
    expect(condensed.load[11]).toBe(0);
    const forces = recoverFrameEndForces(condensed, new Float64Array(12));
    expect(forces[11]).toBeCloseTo(0, 8);
    for (let row = 0; row < 12; row += 1)
      for (let column = 0; column < 12; column += 1)
        expect(condensed.stiffness[row * 12 + column]).toBeCloseTo(
          condensed.stiffness[column * 12 + row]!,
          10,
        );
  });

  it("rejects a singular released block instead of adding stiffness", () => {
    expect(() => condenseFrameEndReleases(k, new Float64Array(12), (1 << 0) | (1 << 6))).toThrow(
      XFrameError,
    );
  });

  it.each([1, 1e-24, 1e-100, 1e100])(
    "preserves release condensation under stiffness and load scaling by %s",
    (scale) => {
      const load = new Float64Array(12);
      load[11] = 1;
      const reference = condenseFrameEndReleases(k, load, 1 << 11);
      const scaled = condenseFrameEndReleases(
        k.map((value) => value * scale),
        load.map((value) => value * scale),
        1 << 11,
      );
      for (let index = 0; index < k.length; index += 1) {
        expect(scaled.stiffness[index]! / scale / k[143]!).toBeCloseTo(
          reference.stiffness[index]! / k[143]!,
          12,
        );
      }
      for (let index = 0; index < load.length; index += 1) {
        expect(scaled.load[index]! / scale).toBeCloseTo(reference.load[index]!, 12);
      }
      expect(scaled.recoverLocalDisplacements(new Float64Array(12))[11]! * k[143]!).toBeCloseTo(
        1,
        12,
      );
      expect(() =>
        condenseFrameEndReleases(
          k.map((value) => value * scale),
          new Float64Array(12),
          (1 << 0) | (1 << 6),
        ),
      ).toThrow(expect.objectContaining({ code: "ELEMENT_LOCAL_MECHANISM" }));
    },
  );

  it("classifies every one of the 4,096 masks", () => {
    const summary = classifyAllFrameReleaseMasks(k);
    expect(summary.validCount + summary.invalidCount).toBe(4096);
    expect(summary.classifications.length).toBe(4096);
    expect(
      summary.classifications.every(
        (entry) => entry.status === "valid" || entry.status === "local-mechanism",
      ),
    ).toBe(true);
  });
});
