import { describe, expect, expectTypeOf, it } from "vitest";
import { prepareAnalysis } from "../../src/analysis/prepare-analysis.js";
import type { TrussReferenceEndForces } from "../../src/index.js";
import { createDofKey } from "../../src/model/dof-key.js";
import { createModelBuilder } from "../../src/model/model-builder.js";

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

function eccentricTrussBuilder(density?: number) {
  return createModelBuilder()
    .setUnitSystem(units)
    .addNode({ id: "a", coordinates: [0, 0, 0] })
    .addNode({ id: "b", coordinates: [1, 0, 0] })
    .addMaterial({
      id: "m",
      elasticModulus: 1000,
      shearModulus: 400,
      ...(density === undefined ? {} : { density }),
    })
    .addTrussSection({ id: "s", area: 1 })
    .addTruss({
      id: "t",
      startNodeId: "a",
      endNodeId: "b",
      materialId: "m",
      sectionId: "s",
      rigidOffsets: { start: [0, 1, 0], end: [0, 1, 0] },
    });
}

function constrain(
  builder: ReturnType<typeof createModelBuilder>,
  dofs: readonly ("ux" | "uy" | "uz" | "rx" | "ry" | "rz")[],
): void {
  for (const nodeId of ["a", "b"] as const) {
    for (const dof of dofs)
      builder.addConstraint({
        id: `fix:${nodeId}:${dof}`,
        terms: [{ nodeId, dof, coefficient: 1 }],
        rightHandSide: 0,
      });
  }
}

function rotationalSpringModel(withEndSpring: boolean) {
  const builder = eccentricTrussBuilder();
  constrain(builder, ["ux", "uy", "uz", "rx", "ry"]);
  builder.addSpring({ id: "ka", startNodeId: "a", stiffness: { rz: 1000 } });
  if (withEndSpring) builder.addSpring({ id: "kb", startNodeId: "b", stiffness: { rz: 1000 } });
  return builder
    .addLoadCase({ id: "M", loads: [{ kind: "nodal", nodeId: "a", moment: [0, 0, 1000] }] })
    .finalize();
}

function rotation(
  result: ReturnType<ReturnType<typeof prepareAnalysis>["solveCase"]>,
  nodeId: "a" | "b",
): number {
  return result.nodes
    .find(({ id }) => id === nodeId)!
    .displacements.find(({ dof }) => dof === "rz")!.value;
}

describe("eccentric truss integration", () => {
  it("recovers the corrected two-spring rotations, axial force, and moment equilibrium", () => {
    const result = prepareAnalysis(rotationalSpringModel(true)).solveCase("M");

    expect(rotation(result, "a")).toBeCloseTo(2 / 3, 14);
    expect(rotation(result, "b")).toBeCloseTo(1 / 3, 14);
    expect(result.trusses[0]!.axialForce).toBeCloseTo(333.3333333333333, 12);
    const expectedGlobalEndForces = [-333.3333333333333, 0, 0, 333.3333333333333, 0, 0] as const;
    for (let component = 0; component < 6; component += 1)
      expect(result.trusses[0]!.globalEndForces[component]).toBeCloseTo(
        expectedGlobalEndForces[component]!,
        12,
      );
    expect(result.springs.reduce((sum, spring) => sum + spring.globalEndForces[5]!, 0)).toBeCloseTo(
      1000,
      12,
    );
    expect(result.diagnostics.normalizedResidual).toBeLessThan(1e-12);
    expect(result.diagnostics.momentEquilibrium).toEqual([0, 0, 0]);
  });

  it("publishes immutable twelve-component reference actions without changing elastic forces", () => {
    const truss = prepareAnalysis(rotationalSpringModel(true)).solveCase("M").trusses[0]!;

    expectTypeOf(truss.globalReferenceEndForces).toEqualTypeOf<TrussReferenceEndForces>();
    expectTypeOf<TrussReferenceEndForces>().toEqualTypeOf<
      readonly [
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
      ]
    >();
    expect(truss.globalEndForces).toHaveLength(6);
    expect(truss.globalReferenceEndForces).toHaveLength(12);
    const expected = [
      -333.3333333333333, 0, 0, 0, 0, 333.3333333333333, 333.3333333333333, 0, 0, 0, 0,
      -333.3333333333333,
    ] as const;
    for (let component = 0; component < expected.length; component += 1)
      expect(truss.globalReferenceEndForces[component]).toBeCloseTo(expected[component]!, 12);
    expect(Object.isFrozen(truss.globalReferenceEndForces)).toBe(true);
  });

  it("preserves the compatible free-B response without adding rotational restraint", () => {
    const result = prepareAnalysis(rotationalSpringModel(false)).solveCase("M");

    expect(rotation(result, "a")).toBeCloseTo(1, 14);
    expect(rotation(result, "b")).toBeCloseTo(1, 14);
    expect(result.trusses[0]!.axialForce).toBeCloseTo(0, 12);
    expect(result.springs).toHaveLength(1);
    expect(result.springs[0]!.globalEndForces[5]).toBeCloseTo(1000, 12);
    expect(result.diagnostics.normalizedResidual).toBeLessThan(1e-12);
    expect(result.diagnostics.momentEquilibrium).toEqual([0, 0, 0]);
  });

  it("transfers truss self-weight through both rigid arms and balances support moments", () => {
    const builder = eccentricTrussBuilder(1);
    constrain(builder, ["ux", "uy", "uz", "rx", "ry", "rz"]);
    const model = builder
      .addLoadCase({
        id: "SW",
        loads: [{ kind: "self-weight", gravity: [0, 0, -20], trussIds: ["t"] }],
      })
      .finalize();
    const result = prepareAnalysis(model).solveCase("SW");
    const index = (nodeId: "a" | "b", dof: "uz" | "rx") =>
      model.physicalDofs.get(createDofKey(nodeId, dof))!.physicalIndex;

    expect(result.fullLoad[index("a", "uz")]).toBeCloseTo(-10, 14);
    expect(result.fullLoad[index("a", "rx")]).toBeCloseTo(-10, 14);
    expect(result.fullLoad[index("b", "uz")]).toBeCloseTo(-10, 14);
    expect(result.fullLoad[index("b", "rx")]).toBeCloseTo(-10, 14);
    for (let value = 0; value < result.fullLoad.length; value += 1)
      expect(result.fullResidual[value]).toBeCloseTo(-result.fullLoad[value]!, 14);
    expect(result.diagnostics.forceEquilibrium).toEqual([0, 0, 0]);
    expect(result.diagnostics.momentEquilibrium).toEqual([0, 0, 0]);
  });
});
