import { describe, expect, it } from "vitest";
import { computeGroundSpringStiffness } from "../../src/elements/spring/ground-spring.js";
import { computeTwoNodeSpringStiffness, recoverTwoNodeSpringForces } from "../../src/elements/spring/two-node-spring.js";

describe("spring kernels", () => {
  it("FR-ELE-004: ground spring uses explicit six component stiffnesses", () => {
    const k = computeGroundSpringStiffness([10, 20, 30, 40, 50, 60]);
    expect(k.length).toBe(36);
    for (let index = 0; index < 6; index += 1) expect(k[index * 6 + index]).toBe((index + 1) * 10);
  });

  it("FR-ELE-004: two-node spring has equal/opposite forces and rigid-body invariance", () => {
    const stiffness = [100, 0, 0, 0, 0, 0] as const;
    const k = computeTwoNodeSpringStiffness(stiffness);
    const rigid = [1, 2, 3, 0, 0, 0, 1, 2, 3, 0, 0, 0];
    for (let row = 0; row < 12; row += 1) {
      let force = 0;
      for (let column = 0; column < 12; column += 1) force += k[row * 12 + column]! * rigid[column]!;
      expect(force).toBeCloseTo(0, 12);
    }
    const force = recoverTwoNodeSpringForces(stiffness, [0, 0, 0, 0, 0, 0, 0.2, 0, 0, 0, 0, 0]);
    expect(Array.from(force)).toEqual([-20, 0, 0, 0, 0, 0, 20, 0, 0, 0, 0, 0]);
  });

  it("FR-ELE-004: rejects negative stiffness while permitting explicit zero components", () => {
    expect(() => computeGroundSpringStiffness([-1, 0, 0, 0, 0, 0])).toThrow();
    expect(Array.from(computeGroundSpringStiffness([0, 0, 0, 0, 0, 0]))).toEqual(Array(36).fill(0));
  });

  it("FR-ELE-004: explicit spring basis rotates component stiffness", () => {
    const basis = [0, 1, 0, -1, 0, 0, 0, 0, 1] as const;
    const k = computeGroundSpringStiffness([10, 0, 0, 0, 0, 0], basis);
    expect(k[1 * 6 + 1]).toBeCloseTo(10, 12);
    expect(k[0]).toBeCloseTo(0, 12);
  });
});
