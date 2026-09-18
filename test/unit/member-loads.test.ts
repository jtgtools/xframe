import { describe, expect, it } from "vitest";
import { computeFrameEquivalentLoad } from "../../src/elements/frame/member-load-vector.js";

const kernel = {
  length: 6,
  elasticModulus: 200e9,
  shearModulus: 80e9,
  momentOfInertiaY: 4e-5,
  momentOfInertiaZ: 7e-5,
  shearAreaY: 0.02,
  shearAreaZ: 0.018,
} as const;

describe("frame equivalent member loads", () => {
  it("integrates a full uniform transverse load", () => {
    const p = computeFrameEquivalentLoad({
      ...kernel,
      theory: { kind: "euler-bernoulli" },
      load: {
        kind: "distributed",
        start: 0,
        end: 6,
        startIntensity: [0, -10, 0],
        endIntensity: [0, -10, 0],
      },
    });
    expect(p[1]).toBeCloseTo(-30, 12);
    expect(p[5]).toBeCloseTo(-30, 12);
    expect(p[7]).toBeCloseTo(-30, 12);
    expect(p[11]).toBeCloseTo(30, 12);
  });

  it("integrates a point force and preserves resultant and moment", () => {
    const p = computeFrameEquivalentLoad({
      ...kernel,
      theory: { kind: "timoshenko" },
      load: { kind: "point-force", distance: 2, vector: [3, -12, 5] },
    });
    expect(p[0]! + p[6]!).toBeCloseTo(3, 12);
    expect(p[1]! + p[7]!).toBeCloseTo(-12, 12);
    expect(p[2]! + p[8]!).toBeCloseTo(5, 12);
    expect(p[5]! + p[11]! + p[7]! * 6).toBeCloseTo(-12 * 2, 10);
    expect(p[4]! + p[10]! - p[8]! * 6).toBeCloseTo(-5 * 2, 10);
  });

  it("integrates a verified point moment in all local components", () => {
    const p = computeFrameEquivalentLoad({
      ...kernel,
      theory: { kind: "timoshenko" },
      load: { kind: "point-moment", distance: 3, vector: [2, 4, -6] },
    });
    expect(p[3]! + p[9]!).toBeCloseTo(2, 12);
    expect(p[4]! + p[10]! - p[8]! * 6).toBeCloseTo(4, 12);
    expect(p[5]! + p[11]! + p[7]! * 6).toBeCloseTo(-6, 12);
  });

  it("partial linearly varying load has the correct resultant", () => {
    const p = computeFrameEquivalentLoad({
      ...kernel,
      theory: { kind: "euler-bernoulli" },
      load: {
        kind: "distributed",
        start: 1,
        end: 5,
        startIntensity: [2, 0, -3],
        endIntensity: [6, 0, -7],
      },
    });
    expect(p[0]! + p[6]!).toBeCloseTo(16, 10);
    expect(p[2]! + p[8]!).toBeCloseTo(-20, 10);
  });
});
