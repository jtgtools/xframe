import { describe, expect, it } from "vitest";
import { computeFrameLocalStiffness } from "../../src/elements/frame/local-stiffness.js";

const base = {
  length: 4,
  elasticModulus: 210e9,
  shearModulus: 80e9,
  area: 0.02,
  torsionalConstant: 8e-5,
  momentOfInertiaY: 3e-5,
  momentOfInertiaZ: 5e-5,
} as const;

function solve2(a: number, b: number, c: number, f0: number, f1: number): [number, number] {
  const determinant = a * c - b * b;
  return [(c * f0 - b * f1) / determinant, (-b * f0 + a * f1) / determinant];
}

describe("frame local stiffness", () => {
  it("FR-ELE-001: produces the standard symmetric 3D Euler-Bernoulli matrix", () => {
    const k = computeFrameLocalStiffness({ ...base, theory: { kind: "euler-bernoulli" } });
    expect(k.length).toBe(144);
    expect(k[0]).toBeCloseTo((base.elasticModulus * base.area) / base.length, 6);
    expect(k[6]).toBeCloseTo(-k[0]!, 6);
    expect(k[3 * 12 + 3]).toBeCloseTo(
      (base.shearModulus * base.torsionalConstant) / base.length,
      6,
    );
    expect(k[1 * 12 + 1]).toBeCloseTo(
      (12 * base.elasticModulus * base.momentOfInertiaZ) / base.length ** 3,
      6,
    );
    expect(k[2 * 12 + 2]).toBeCloseTo(
      (12 * base.elasticModulus * base.momentOfInertiaY) / base.length ** 3,
      6,
    );
    for (let row = 0; row < 12; row += 1)
      for (let column = 0; column < 12; column += 1)
        expect(k[row * 12 + column]).toBeCloseTo(k[column * 12 + row]!, 12);
  });

  it("FR-ELE-002: reproduces the closed-form Timoshenko cantilever deflection in both planes", () => {
    const shearAreaY = 0.012;
    const shearAreaZ = 0.009;
    const k = computeFrameLocalStiffness({
      ...base,
      theory: { kind: "timoshenko" },
      shearAreaY,
      shearAreaZ,
    });
    const [tipY] = solve2(k[7 * 12 + 7]!, k[7 * 12 + 11]!, k[11 * 12 + 11]!, 1, 0);
    const [tipZ] = solve2(k[8 * 12 + 8]!, k[8 * 12 + 10]!, k[10 * 12 + 10]!, 1, 0);
    expect(tipY).toBeCloseTo(
      base.length ** 3 / (3 * base.elasticModulus * base.momentOfInertiaZ) +
        base.length / (base.shearModulus * shearAreaY),
      12,
    );
    expect(tipZ).toBeCloseTo(
      base.length ** 3 / (3 * base.elasticModulus * base.momentOfInertiaY) +
        base.length / (base.shearModulus * shearAreaZ),
      12,
    );
  });
});
