import { describe, expect, it } from "vitest";
import { computeTrussGlobalStiffness } from "../../src/elements/truss/local-stiffness.js";
import { recoverTrussResult } from "../../src/elements/truss/result-recovery.js";

describe("3D truss kernel", () => {
  it("FR-ELE-003: creates the rotated axial stiffness and preserves rigid translation", () => {
    const direction = [1 / 3, 2 / 3, 2 / 3] as const;
    const k = computeTrussGlobalStiffness({ length: 4, elasticModulus: 200e9, area: 0.01, direction });
    expect(k.length).toBe(36);
    expect(k[0]).toBeCloseTo((200e9 * 0.01 / 4) * direction[0] ** 2, 6);
    const rigid = [2, -3, 5, 2, -3, 5];
    for (let row = 0; row < 6; row += 1) {
      let force = 0;
      for (let column = 0; column < 6; column += 1) force += k[row * 6 + column]! * rigid[column]!;
      expect(force).toBeCloseTo(0, 8);
    }
  });

  it("FR-RES-003: recovers extension, strain, axial force, and global end forces", () => {
    const result = recoverTrussResult({
      length: 2,
      elasticModulus: 1000,
      area: 3,
      direction: [1, 0, 0],
      globalDisplacements: [0, 0, 0, 0.01, 2, 3],
    });
    expect(result.extension).toBeCloseTo(0.01, 14);
    expect(result.strain).toBeCloseTo(0.005, 14);
    expect(result.axialForce).toBeCloseTo(15, 14);
    const expected = [-15, 0, 0, 15, 0, 0];
    Array.from(result.globalEndForces).forEach((value, index) => {
      expect(value).toBeCloseTo(expected[index]!, 14);
    });
  });
});
