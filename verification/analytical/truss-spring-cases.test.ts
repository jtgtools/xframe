import { describe, expect, it } from "vitest";
import { computeTrussGlobalStiffness } from "../../src/elements/truss/local-stiffness.js";
import { recoverTrussResult } from "../../src/elements/truss/result-recovery.js";
import { computeGroundSpringStiffness } from "../../src/elements/spring/ground-spring.js";
import { computeTwoNodeSpringStiffness } from "../../src/elements/spring/two-node-spring.js";
import { createFrameRigidOffsetTransform } from "../../src/elements/frame/rigid-offset-transform.js";

describe("analytical truss, spring, and offset verification", () => {
  it("FR-ELE-003/NFR-COR-001: axial bar displacement and force match the closed form", () => {
    const length = 4.5;
    const elasticModulus = 210e9;
    const area = 0.0025;
    const load = 35_000;
    const stiffness = computeTrussGlobalStiffness({ length, elasticModulus, area, direction: [1, 0, 0] });
    const displacement = load / stiffness[3 * 6 + 3]!;
    expect(displacement).toBeCloseTo((load * length) / (elasticModulus * area), 14);
    const result = recoverTrussResult({
      length,
      elasticModulus,
      area,
      direction: [1, 0, 0],
      globalDisplacements: [0, 0, 0, displacement, 0, 0],
    });
    expect(result.axialForce).toBeCloseTo(load, 10);
  });

  it("FR-ELE-004/NFR-COR-001: a one-DOF ground spring matches u=P/k and U=P²/(2k)", () => {
    const springStiffness = 72_500;
    const load = 1_450;
    const matrix = computeGroundSpringStiffness([springStiffness, 0, 0, 0, 0, 0]);
    const displacement = load / matrix[0]!;
    expect(displacement).toBeCloseTo(load / springStiffness, 14);
    expect(0.5 * springStiffness * displacement ** 2).toBeCloseTo(load ** 2 / (2 * springStiffness), 14);
  });

  it("FR-ELE-004/NFR-COR-001: a two-node spring preserves rigid motion and relative energy", () => {
    const stiffness = 900;
    const matrix = computeTwoNodeSpringStiffness([stiffness, 0, 0, 0, 0, 0]);
    const displacement = [2, 0, 0, 0, 0, 0, 2.125, 0, 0, 0, 0, 0];
    let energy = 0;
    for (let row = 0; row < 12; row += 1) {
      let force = 0;
      for (let column = 0; column < 12; column += 1) force += matrix[row * 12 + column]! * displacement[column]!;
      energy += 0.5 * displacement[row]! * force;
    }
    expect(energy).toBeCloseTo(0.5 * stiffness * 0.125 ** 2, 12);
  });

  it("FR-GEO-005/NFR-COR-001: rigid-offset force and displacement transformations preserve virtual work", () => {
    const transform = createFrameRigidOffsetTransform(
      [1, 0, 0, 0, 1, 0, 0, 0, 1],
      [0.4, -0.2, 0.1],
      [-0.1, 0.3, 0.2],
    );
    const globalDisplacements = [0.01, -0.02, 0.03, 0.004, -0.005, 0.006, -0.02, 0.01, 0.04, -0.003, 0.002, 0.005];
    const localForces = [10, -8, 7, 2, 4, -6, -9, 11, -3, 1, -5, 8];
    const localDisplacements = transform.toLocalDisplacements(globalDisplacements);
    const globalForces = transform.forceToGlobal(localForces);
    const localWork = localForces.reduce((sum, force, index) => sum + force * localDisplacements[index]!, 0);
    const globalWork = globalDisplacements.reduce((sum, displacement, index) => sum + displacement * globalForces[index]!, 0);
    expect(globalWork).toBeCloseTo(localWork, 13);
  });
});
