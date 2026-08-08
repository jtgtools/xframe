import { describe, expect, it } from "vitest";
import { createFrameRigidOffsetTransform } from "../../src/elements/frame/rigid-offset-transform.js";
import { buildLocalAxes } from "../../src/geometry/local-axes.js";

describe("frame rigid-offset transform", () => {
  it("FR-GEO-005: maps nodal rotations into deformable-end translations", () => {
    const axes = buildLocalAxes([0, 0, 0], [5, 0, 0], [0, 1, 0]);
    const transform = createFrameRigidOffsetTransform(axes.globalToLocal, [0, 2, 0], [0, 0, 0]);
    const local = transform.toLocalDisplacements([0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0]);
    expect(Array.from(local.slice(0, 6))).toEqual([-2, 0, 0, 0, 0, 1]);
  });

  it("FR-GEO-005: transforms stiffness and load with virtual-work consistency", () => {
    const axes = buildLocalAxes([0, 0, 0], [3, 4, 0], [0, 0, 1]);
    const transform = createFrameRigidOffsetTransform(
      axes.globalToLocal,
      [0.2, -0.3, 0.1],
      [-0.1, 0.4, 0.2],
    );
    const localK = new Float64Array(144);
    for (let i = 0; i < 12; i += 1) localK[i * 12 + i] = i + 1;
    const localP = Float64Array.from({ length: 12 }, (_, i) => i - 4);
    const globalK = transform.stiffnessToGlobal(localK);
    const globalP = transform.forceToGlobal(localP);
    const u = Float64Array.from({ length: 12 }, (_, i) => (i - 5) / 7);
    const localU = transform.toLocalDisplacements(u);
    let localWork = 0;
    let globalWork = 0;
    for (let i = 0; i < 12; i += 1) {
      localWork += localP[i]! * localU[i]!;
      globalWork += globalP[i]! * u[i]!;
    }
    expect(globalWork).toBeCloseTo(localWork, 12);
    for (let row = 0; row < 12; row += 1)
      for (let column = 0; column < 12; column += 1)
        expect(globalK[row * 12 + column]).toBeCloseTo(globalK[column * 12 + row]!, 12);
  });
});
