import { createModelBuilder, prepareAnalysis } from "../src/index.js";

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

/** Builds and solves a two-node axial truss using only the public package API. */
export function runBasicTrussExample() {
  const builder = createModelBuilder()
    .setUnitSystem(units)
    .addNode({ id: "support", coordinates: [0, 0, 0] })
    .addNode({ id: "tip", coordinates: [2, 0, 0] })
    .addMaterial({ id: "steel", elasticModulus: 200e9, poissonRatio: 0.3 })
    .addTrussSection({ id: "bar", area: 0.01 })
    .addTruss({
      id: "member",
      startNodeId: "support",
      endNodeId: "tip",
      materialId: "steel",
      sectionId: "bar",
    });

  for (const [nodeId, dofs] of [
    ["support", ["tx", "ty", "tz"]],
    ["tip", ["ty", "tz"]],
  ] as const) {
    for (const dof of dofs) {
      builder.addConstraint({
        id: `fix:${nodeId}:${dof}`,
        terms: [{ nodeId, dof, coefficient: 1 }],
        rightHandSide: 0,
      });
    }
  }

  const result = prepareAnalysis(
    builder
      .addLoadCase({
        id: "service",
        loads: [{ kind: "nodal", nodeId: "tip", force: [10_000, 0, 0] }],
      })
      .finalize(),
  ).solveCase("service");
  const tip = result.nodes.find(({ id }) => id === "tip")!;
  const support = result.nodes.find(({ id }) => id === "support")!;

  return Object.freeze({
    tipDisplacement: tip.displacements.find(({ dof }) => dof === "tx")!.value,
    supportReaction: support.reactions.find(({ dof }) => dof === "tx")!.value,
    axialForce: result.trusses[0]!.axialForce,
    diagnosticStatus: result.diagnostics.status,
  });
}
