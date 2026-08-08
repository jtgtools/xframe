import { describe, expect, it } from "vitest";
import { prepareAnalysis } from "../../src/analysis/prepare-analysis.js";
import { createModelBuilder } from "../../src/model/model-builder.js";
import { createDofKey } from "../../src/model/dof-key.js";

const units = {
  version: "1",
  length: "m",
  force: "N",
  moment: "N*m",
  modulus: "Pa",
  distributedForce: "N/m",
  density: "kg/m^3",
  rotation: "rad",
} as const;

describe("integrated case solves", () => {
  it("FR-SOL-004/FR-RES-001: solves an axial truss and recovers its support reaction", () => {
    const builder = createModelBuilder()
      .setUnitSystem(units)
      .addNode({ id: "a", coordinates: [0, 0, 0] })
      .addNode({ id: "b", coordinates: [2, 0, 0] })
      .addMaterial({ id: "m", elasticModulus: 1000, shearModulus: 400 })
      .addTrussSection({ id: "s", area: 3 })
      .addTruss({ id: "t", startNodeId: "a", endNodeId: "b", materialId: "m", sectionId: "s" });
    for (const [nodeId, dofs] of [
      ["a", ["tx", "ty", "tz"]],
      ["b", ["ty", "tz"]],
    ] as const) {
      for (const dof of dofs)
        builder.addConstraint({
          id: `fix:${nodeId}:${dof}`,
          terms: [{ nodeId, dof, coefficient: 1 }],
          rightHandSide: 0,
        });
    }
    const model = builder
      .addLoadCase({ id: "P", loads: [{ kind: "nodal", nodeId: "b", force: [15, 0, 0] }] })
      .finalize();
    const result = prepareAnalysis(model).solveCase("P");
    const bx = model.physicalDofs.get(createDofKey("b", "tx"))!.physicalIndex;
    const ax = model.physicalDofs.get(createDofKey("a", "tx"))!.physicalIndex;
    expect(result.fullDisplacements[bx]).toBeCloseTo(0.01, 14);
    expect(result.fullResidual[ax]).toBeCloseTo(-15, 12);
    expect(result.diagnostics.normalizedResidual).toBeLessThan(1e-12);
  });

  it("FR-ELE-001/FR-SOL-004: solves a fixed-base Euler cantilever tip load", () => {
    const length = 3;
    const elasticModulus = 200e9;
    const inertia = 8e-6;
    const builder = createModelBuilder()
      .setUnitSystem(units)
      .addNode({ id: "base", coordinates: [0, 0, 0] })
      .addNode({ id: "tip", coordinates: [length, 0, 0] })
      .addMaterial({ id: "m", elasticModulus, poissonRatio: 0.3 })
      .addFrameSection({
        id: "s",
        area: 0.01,
        torsionalConstant: 1e-5,
        momentOfInertiaY: inertia,
        momentOfInertiaZ: inertia,
      })
      .addFrame({
        id: "f",
        startNodeId: "base",
        endNodeId: "tip",
        materialId: "m",
        sectionId: "s",
        theory: { kind: "euler-bernoulli" },
        orientation: [0, 1, 0],
      });
    for (const dof of ["tx", "ty", "tz", "rx", "ry", "rz"] as const)
      builder.addConstraint({
        id: `base:${dof}`,
        terms: [{ nodeId: "base", dof, coefficient: 1 }],
        rightHandSide: 0,
      });
    const model = builder
      .addLoadCase({ id: "P", loads: [{ kind: "nodal", nodeId: "tip", force: [0, -12_000, 0] }] })
      .finalize();
    const result = prepareAnalysis(model).solveCase("P");
    const tipY = model.physicalDofs.get(createDofKey("tip", "ty"))!.physicalIndex;
    expect(result.fullDisplacements[tipY]).toBeCloseTo(
      (-12_000 * length ** 3) / (3 * elasticModulus * inertia),
      11,
    );
  });

  it("FR-ELE-004/FR-SOL-004: solves a one-DOF grounded spring", () => {
    const builder = createModelBuilder()
      .setUnitSystem(units)
      .addNode({ id: "n", coordinates: [0, 0, 0] })
      .addSpring({ id: "k", startNodeId: "n", stiffness: [500, 0, 0, 0, 0, 0] })
      .addLoadCase({ id: "P", loads: [{ kind: "nodal", nodeId: "n", force: [25, 0, 0] }] });
    const result = prepareAnalysis(builder.finalize()).solveCase("P");
    expect(result.fullDisplacements[0]).toBeCloseTo(0.05, 14);
    expect(result.fullResidual[0]).toBeCloseTo(0, 14);
  });
});
