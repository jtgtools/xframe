import { expect, it } from "vitest";
import { prepareAnalysis } from "../../src/analysis/prepare-analysis.js";
import { createModelBuilder } from "../../src/model/model-builder.js";

it("solved results own immutable identity, units, node, and element data", () => {
  const builder = createModelBuilder()
    .setUnitSystem({
      version: "1",
      length: "m",
      force: "N",
      moment: "N*m",
      modulus: "Pa",
      distributedForce: "N/m",
      density: "kg/m^3",
      rotation: "rad",
    })
    .addNode({ id: "n", coordinates: [0, 0, 0] })
    .addNode({ id: "a", coordinates: [0, 2, 0] })
    .addNode({ id: "b", coordinates: [2, 2, 0] })
    .addMaterial({ id: "m", elasticModulus: 200e9, poissonRatio: 0.3 })
    .addFrameSection({
      id: "fs",
      area: 0.02,
      torsionalConstant: 1e-5,
      momentOfInertiaY: 2e-5,
      momentOfInertiaZ: 2e-5,
    })
    .addTrussSection({ id: "ts", area: 0.01 })
    .addFrame({
      id: "f",
      startNodeId: "a",
      endNodeId: "b",
      materialId: "m",
      sectionId: "fs",
      theory: { kind: "euler-bernoulli" },
      orientation: [0, 1, 0],
    })
    .addTruss({ id: "t", startNodeId: "a", endNodeId: "b", materialId: "m", sectionId: "ts" })
    .addSpring({ id: "k", startNodeId: "n", stiffness: [100, 0, 0, 0, 0, 0] })
    .addLoadCase({ id: "P", loads: [{ kind: "nodal", nodeId: "n", force: [10, 0, 0] }] });
  for (const dof of ["tx", "ty", "tz", "rx", "ry", "rz"] as const)
    builder.addConstraint({
      id: `a:${dof}`,
      terms: [{ nodeId: "a", dof, coefficient: 1 }],
      rightHandSide: 0,
    });
  const model = builder.finalize();
  const result = prepareAnalysis(model).solveCase("P");
  expect(result.kind).toBe("case");
  expect(result.modelFingerprint).toBe(model.fingerprint);
  expect(result.unitSystem).toEqual(model.unitSystem);
  expect(result.nodes.find(({ id }) => id === "n")!.displacements).toEqual([
    { dof: "tx", value: 0.1 },
  ]);
  expect(Object.isFrozen(result)).toBe(true);
  expect(Object.isFrozen(result.nodes)).toBe(true);
  expect(Object.isFrozen(result.nodes.find(({ id }) => id === "n")!.displacements)).toBe(true);
  expect(Object.isFrozen(result.trusses[0]!.globalReferenceEndForces)).toBe(true);
  const segments = result.frames[0]!.internalForceSegments;
  expect(Object.isFrozen(segments)).toBe(true);
  expect(Object.isFrozen(segments[0])).toBe(true);
  expect(Object.isFrozen(segments[0]!.coefficients)).toBe(true);
  expect(Object.isFrozen(segments[0]!.coefficients[0])).toBe(true);
});
