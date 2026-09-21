import { describe, expect, it } from "vitest";
import { prepareAnalysis } from "../../src/analysis/prepare-analysis.js";
import { XFrameError } from "../../src/errors/xframe-error.js";
import { createModelBuilder } from "../../src/model/model-builder.js";
import { unitsSI } from "../../src/units/unit-presets.js";

const allDofs = ["ux", "uy", "uz", "rx", "ry", "rz"] as const;

function frameBuilder() {
  return createModelBuilder()
    .setUnitSystem(unitsSI())
    .addNode({ id: "a", coordinates: [0, 0, 0] })
    .addNode({ id: "b", coordinates: [3, 0, 0] })
    .addMaterial({ id: "m", elasticModulus: 210e9, poissonRatio: 0.3 })
    .addFrameSection({
      id: "s",
      area: 0.003,
      torsionalConstant: 1e-6,
      momentOfInertiaY: 2e-6,
      momentOfInertiaZ: 3e-6,
    })
    .addFrame({
      id: "f",
      startNodeId: "a",
      endNodeId: "b",
      materialId: "m",
      sectionId: "s",
      theory: { kind: "euler-bernoulli" },
      orientation: [0, 1, 0],
    });
}

function trussBuilder() {
  return createModelBuilder()
    .setUnitSystem(unitsSI())
    .addNode({ id: "a", coordinates: [0, 0, 0] })
    .addNode({ id: "b", coordinates: [3, 0, 0] })
    .addMaterial({ id: "m", elasticModulus: 210e9, poissonRatio: 0.3 })
    .addTrussSection({ id: "s", area: 0.003 })
    .addTruss({ id: "t", startNodeId: "a", endNodeId: "b", materialId: "m", sectionId: "s" });
}

describe("builder support presets", () => {
  it("fixing a node constrains all six degrees of freedom to zero", () => {
    const builder = frameBuilder().fixNode("a");
    expect(builder.fixNode("b")).toBe(builder);
    const constraints = builder.snapshot().constraints;
    expect(constraints).toHaveLength(12);
    for (const nodeId of ["a", "b"]) {
      for (const dof of allDofs) {
        const match = constraints.find((entry) => entry.id === `fix:${nodeId}:${dof}`);
        expect(match?.rightHandSide).toBe(0);
        expect(match?.terms).toEqual([{ nodeId, dof, coefficient: 1 }]);
      }
    }
  });

  it("a fixed frame end carries the exact axial reaction under tip load", () => {
    const result = prepareAnalysis(
      frameBuilder()
        .fixNode("a")
        .supportNode("b", ["uy", "uz", "rx", "ry", "rz"])
        .addLoadCase({ id: "P", loads: [{ kind: "nodal", nodeId: "b", force: [12000, 0, 0] }] })
        .finalize(),
    ).solveCase("P");
    expect(Math.abs(result.frames[0]!.localEndForces[0]!)).toBeCloseTo(12000, 8);
    expect(
      result.nodes.find(({ id }) => id === "a")!.reactions.find(({ dof }) => dof === "ux")!.value,
    ).toBeCloseTo(-12000, 8);
    expect(result.diagnostics.status).toBe("pass");
  });

  it("a prescribed support displacement produces the exact EAΔ/L response", () => {
    const result = prepareAnalysis(
      frameBuilder().fixNode("a").fixNode("b", { ux: 0.001 }).addLoadCase({ id: "P" }).finalize(),
    ).solveCase("P");
    expect(result.frames[0]!.localEndForces[6]!).toBeCloseTo((210e9 * 0.003 * 0.001) / 3, 6);
  });

  it("a partial support only constrains the selected degrees of freedom", () => {
    const builder = trussBuilder().supportNode("a", ["ux", "uy"]);
    const constraints = builder.snapshot().constraints;
    expect(constraints.map(({ id }) => id).toSorted()).toEqual(["support:a:ux", "support:a:uy"]);
  });

  it("a translational support solves a truss end to end", () => {
    const result = prepareAnalysis(
      trussBuilder()
        .supportNode("a", ["ux", "uy", "uz"])
        .supportNode("b", ["uy", "uz"])
        .addLoadCase({ id: "P", loads: [{ kind: "nodal", nodeId: "b", force: [12000, 0, 0] }] })
        .finalize(),
    ).solveCase("P");
    expect(result.trusses[0]!.axialForce).toBeCloseTo(12000, 10);
    expect(result.diagnostics.status).toBe("pass");
  });

  it("fixing a non-physical rotation fails at finalization with a structured error", () => {
    let thrown: unknown;
    try {
      trussBuilder().fixNode("a").addLoadCase({ id: "P" }).finalize();
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(XFrameError);
    expect((thrown as XFrameError).code).toBe("INPUT_INVALID");
  });

  it("an unknown support degree of freedom fails with a structured error", () => {
    let thrown: unknown;
    try {
      trussBuilder().supportNode("a", ["tw"] as unknown as ["ux"]);
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(XFrameError);
    expect((thrown as XFrameError).code).toBe("INPUT_INVALID");
  });

  it("a non-finite prescribed support value fails with a structured error", () => {
    let thrown: unknown;
    try {
      trussBuilder().fixNode("a", { ux: Number.NaN });
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(XFrameError);
    expect((thrown as XFrameError).code).toBe("NON_FINITE_VALUE");
  });

  it("a generated support id that collides with manual input fails closed", () => {
    const builder = trussBuilder().addConstraint({
      id: "fix:a:ux",
      terms: [{ nodeId: "a", dof: "ux", coefficient: 1 }],
      rightHandSide: 0,
    });
    let thrown: unknown;
    try {
      builder.fixNode("a");
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(XFrameError);
    expect((thrown as XFrameError).code).toBe("DUPLICATE_IDENTIFIER");
  });
});
