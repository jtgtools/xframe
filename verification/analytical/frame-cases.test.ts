import { describe, expect, it } from "vitest";
import { computeFrameLocalStiffness } from "../../src/elements/frame/local-stiffness.js";
import { computeFrameEquivalentLoad } from "../../src/elements/frame/member-load-vector.js";

function solve2(a: number, b: number, c: number, f0: number, f1: number): [number, number] {
  const determinant = a * c - b * b;
  return [(c * f0 - b * f1) / determinant, (-b * f0 + a * f1) / determinant];
}

describe("analytical frame verification", () => {
  it("FR-ELE-001/NFR-COR-001: Euler cantilever tip force matches closed-form displacement and rotation", () => {
    const length = 3.2;
    const elasticModulus = 205e9;
    const inertia = 8.1e-6;
    const k = computeFrameLocalStiffness({
      length,
      elasticModulus,
      shearModulus: 79e9,
      area: 0.01,
      torsionalConstant: 2e-5,
      momentOfInertiaY: inertia,
      momentOfInertiaZ: inertia,
      theory: { kind: "euler-bernoulli" },
    });
    const [displacement, rotation] = solve2(
      k[7 * 12 + 7]!,
      k[7 * 12 + 11]!,
      k[11 * 12 + 11]!,
      12_000,
      0,
    );
    expect(displacement).toBeCloseTo((12_000 * length ** 3) / (3 * elasticModulus * inertia), 12);
    expect(rotation).toBeCloseTo((12_000 * length ** 2) / (2 * elasticModulus * inertia), 12);
  });

  it("FR-LOD-004/NFR-COR-001: uniform load fixed-end vector matches exact beam values", () => {
    const length = 7;
    const load = -18;
    const p = computeFrameEquivalentLoad({
      length,
      elasticModulus: 200e9,
      shearModulus: 77e9,
      momentOfInertiaY: 4e-5,
      momentOfInertiaZ: 5e-5,
      theory: { kind: "euler-bernoulli" },
      load: {
        kind: "distributed",
        start: 0,
        end: length,
        startIntensity: [0, load, 0],
        endIntensity: [0, load, 0],
      },
    });
    expect(p[1]).toBeCloseTo((load * length) / 2, 12);
    expect(p[5]).toBeCloseTo((load * length ** 2) / 12, 12);
    expect(p[7]).toBeCloseTo((load * length) / 2, 12);
    expect(p[11]).toBeCloseTo((-load * length ** 2) / 12, 12);
  });
});
