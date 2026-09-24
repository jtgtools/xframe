import { describe, expect, it } from "vitest";
import { XFrameError } from "../../src/errors/xframe-error.js";
import { prepareAnalysis } from "../../src/analysis/prepare-analysis.js";
import { createModelBuilder } from "../../src/model/model-builder.js";
import { createDofKey } from "../../src/model/dof-key.js";
import { EULER_BERNOULLI_CANTILEVER_SPECIFICATION } from "../specification/element-kernel-cases.js";

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

function captureFailure(action: () => unknown): unknown {
  try {
    action();
  } catch (error) {
    return error;
  }
  throw new Error("expected failure");
}

describe("integrated case solves", () => {
  it("solves an axial truss and recovers its support reaction", () => {
    const builder = createModelBuilder()
      .setUnitSystem(units)
      .addNode({ id: "a", coordinates: [0, 0, 0] })
      .addNode({ id: "b", coordinates: [2, 0, 0] })
      .addMaterial({ id: "m", elasticModulus: 1000, shearModulus: 400 })
      .addTrussSection({ id: "s", area: 3 })
      .addTruss({ id: "t", startNodeId: "a", endNodeId: "b", materialId: "m", sectionId: "s" });
    for (const [nodeId, dofs] of [
      ["a", ["ux", "uy", "uz"]],
      ["b", ["uy", "uz"]],
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
    const bx = model.physicalDofs.get(createDofKey("b", "ux"))!.physicalIndex;
    const ax = model.physicalDofs.get(createDofKey("a", "ux"))!.physicalIndex;
    expect(result.fullDisplacements[bx]).toBeCloseTo(0.01, 14);
    expect(result.fullResidual[ax]).toBeCloseTo(-15, 12);
    expect(result.diagnostics.normalizedResidual).toBeLessThan(1e-12);
  });

  it("solves a fixed-base Euler cantilever tip load", () => {
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
    for (const dof of ["ux", "uy", "uz", "rx", "ry", "rz"] as const)
      builder.addConstraint({
        id: `base:${dof}`,
        terms: [{ nodeId: "base", dof, coefficient: 1 }],
        rightHandSide: 0,
      });
    const model = builder
      .addLoadCase({ id: "P", loads: [{ kind: "nodal", nodeId: "tip", force: [0, -12_000, 0] }] })
      .finalize();
    const result = prepareAnalysis(model).solveCase("P");
    const tipY = model.physicalDofs.get(createDofKey("tip", "uy"))!.physicalIndex;
    expect(result.fullDisplacements[tipY]).toBeCloseTo(
      (-12_000 * length ** 3) / (3 * elasticModulus * inertia),
      11,
    );
  });

  it("pins the shared Euler cantilever oracle to its closed form", () => {
    const spec = EULER_BERNOULLI_CANTILEVER_SPECIFICATION;
    expect(spec.tipDeflection).toBeCloseTo(
      (spec.force * spec.length ** 3) / (3 * spec.elasticModulus * spec.secondMoment),
      15,
    );
    expect(spec.tipRotation).toBeCloseTo(
      (spec.force * spec.length ** 2) / (2 * spec.elasticModulus * spec.secondMoment),
      15,
    );
  });

  it("solves a one-DOF grounded spring", () => {
    const builder = createModelBuilder()
      .setUnitSystem(units)
      .addNode({ id: "n", coordinates: [0, 0, 0] })
      .addSpring({ id: "k", startNodeId: "n", stiffness: [500, 0, 0, 0, 0, 0] })
      .addLoadCase({ id: "P", loads: [{ kind: "nodal", nodeId: "n", force: [25, 0, 0] }] });
    const result = prepareAnalysis(builder.finalize()).solveCase("P");
    expect(result.fullDisplacements[0]).toBeCloseTo(0.05, 14);
    expect(result.fullResidual[0]).toBeCloseTo(0, 14);
  });

  it("rejects an unknown load-case id with a stable reference error", () => {
    const analysis = prepareAnalysis(
      createModelBuilder()
        .setUnitSystem(units)
        .addNode({ id: "n", coordinates: [0, 0, 0] })
        .addSpring({ id: "k", startNodeId: "n", stiffness: [500, 0, 0, 0, 0, 0] })
        .addLoadCase({ id: "P", loads: [] })
        .finalize(),
    );
    const error = captureFailure(() => analysis.solveCase("missing"));
    expect(error).toBeInstanceOf(XFrameError);
    expect((error as XFrameError).code).toBe("REFERENCE_NOT_FOUND");
  });

  it("fails contradictory constraints end to end instead of solving", () => {
    const model = createModelBuilder()
      .setUnitSystem(units)
      .addNode({ id: "n", coordinates: [0, 0, 0] })
      .addSpring({ id: "k", startNodeId: "n", stiffness: [500, 0, 0, 0, 0, 0] })
      .addConstraint({
        id: "c1",
        terms: [{ nodeId: "n", dof: "ux", coefficient: 1 }],
        rightHandSide: 0,
      })
      .addConstraint({
        id: "c2",
        terms: [{ nodeId: "n", dof: "ux", coefficient: 1 }],
        rightHandSide: 1,
      })
      .addLoadCase({ id: "P", loads: [] })
      .finalize();
    const error = captureFailure(() => prepareAnalysis(model).solveCase("P"));
    expect(error).toBeInstanceOf(XFrameError);
    expect((error as XFrameError).code).toBe("CONSTRAINT_CONTRADICTION");
  });

  it("fails a doubly axial-released frame end to end as a local mechanism", () => {
    const builder = createModelBuilder()
      .setUnitSystem(units)
      .addNode({ id: "a", coordinates: [0, 0, 0] })
      .addNode({ id: "b", coordinates: [3, 0, 0] })
      .addMaterial({ id: "m", elasticModulus: 200e9, poissonRatio: 0.3 })
      .addFrameSection({
        id: "s",
        area: 0.01,
        torsionalConstant: 1e-5,
        momentOfInertiaY: 8e-6,
        momentOfInertiaZ: 8e-6,
      })
      .addFrame({
        id: "f",
        startNodeId: "a",
        endNodeId: "b",
        materialId: "m",
        sectionId: "s",
        theory: { kind: "euler-bernoulli" },
        releases: { start: ["ux"], end: ["ux"] },
      });
    for (const dof of ["ux", "uy", "uz", "rx", "ry", "rz"] as const) {
      builder.addConstraint({
        id: `a:${dof}`,
        terms: [{ nodeId: "a", dof, coefficient: 1 }],
        rightHandSide: 0,
      });
    }
    builder.addConstraint({
      id: "b:uy",
      terms: [{ nodeId: "b", dof: "uy", coefficient: 1 }],
      rightHandSide: 0,
    });
    builder.addConstraint({
      id: "b:uz",
      terms: [{ nodeId: "b", dof: "uz", coefficient: 1 }],
      rightHandSide: 0,
    });
    const model = builder.addLoadCase({ id: "P", loads: [] }).finalize();
    const error = captureFailure(() => prepareAnalysis(model));
    expect(error).toBeInstanceOf(XFrameError);
    expect((error as XFrameError).code).toBe("ELEMENT_LOCAL_MECHANISM");
  });
});
