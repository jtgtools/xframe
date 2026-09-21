import { describe, expect, it } from "vitest";
import { XFrameError } from "../../src/errors/xframe-error.js";
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

function physicalBuilder() {
  return createModelBuilder()
    .setUnitSystem(units)
    .addNode({ id: "n3", coordinates: [2, 0, 0] })
    .addNode({ id: "n1", coordinates: [0, 0, 0] })
    .addNode({ id: "n2", coordinates: [1, 0, 0] })
    .addMaterial({ id: "m", elasticModulus: 200e9, poissonRatio: 0.3 })
    .addFrameSection({
      id: "fs",
      area: 0.01,
      torsionalConstant: 1e-5,
      momentOfInertiaY: 2e-5,
      momentOfInertiaZ: 3e-5,
    })
    .addTrussSection({ id: "ts", area: 0.002 })
    .addFrame({
      id: "f",
      startNodeId: "n2",
      endNodeId: "n3",
      materialId: "m",
      sectionId: "fs",
      theory: { kind: "euler-bernoulli" },
      orientation: [0, 0, 1],
    })
    .addTruss({ id: "t", startNodeId: "n1", endNodeId: "n2", materialId: "m", sectionId: "ts" })
    .addSpring({ id: "s", startNodeId: "n1", stiffness: { rz: 10 } });
}

describe("physical DOF topology", () => {
  it("derives deterministic physical DOFs from element kinematics", () => {
    const model = physicalBuilder().finalize();
    const actual = Array.from(
      model.physicalDofs.values(),
      ({ nodeId, dof, physicalIndex }) => `${physicalIndex}:${nodeId}.${dof}`,
    );
    expect(actual).toEqual([
      "0:n1.ux",
      "1:n1.uy",
      "2:n1.uz",
      "3:n1.rz",
      "4:n2.ux",
      "5:n2.uy",
      "6:n2.uz",
      "7:n2.rx",
      "8:n2.ry",
      "9:n2.rz",
      "10:n3.ux",
      "11:n3.uy",
      "12:n3.uz",
      "13:n3.rx",
      "14:n3.ry",
      "15:n3.rz",
    ]);
    expect(model.physicalDofs.get(createDofKey("n1", "rz"))?.requestedBy).toEqual(["spring:s"]);
    expect(model.physicalDofs.keyByPhysicalIndex(15)).toBe(createDofKey("n3", "rz"));
  });

  it("truss-only nodes have translations and no rotations", () => {
    const model = createModelBuilder()
      .setUnitSystem(units)
      .addNode({ id: "a", coordinates: [0, 0, 0] })
      .addNode({ id: "b", coordinates: [1, 0, 0] })
      .addMaterial({ id: "m", elasticModulus: 200e9, poissonRatio: 0.3 })
      .addTrussSection({ id: "ts", area: 0.002 })
      .addTruss({
        id: "t",
        startNodeId: "a",
        endNodeId: "b",
        materialId: "m",
        sectionId: "ts",
        rigidOffsets: { start: [0, 0, 0], end: [-0, 0, 0] },
      })
      .finalize();

    expect(Array.from(model.physicalDofs.values(), ({ dof }) => dof)).toEqual([
      "ux",
      "uy",
      "uz",
      "ux",
      "uy",
      "uz",
    ]);
    expect(model.physicalDofs.has(createDofKey("a", "rx"))).toBe(false);
    expect(model.constraints).toEqual([]);
  });

  it("eccentric truss endpoints expose all reference rotations", () => {
    const model = createModelBuilder()
      .setUnitSystem(units)
      .addNode({ id: "a", coordinates: [0, 0, 0] })
      .addNode({ id: "b", coordinates: [1, 0, 0] })
      .addMaterial({ id: "m", elasticModulus: 200e9, poissonRatio: 0.3 })
      .addTrussSection({ id: "ts", area: 0.002 })
      .addTruss({
        id: "t",
        startNodeId: "a",
        endNodeId: "b",
        materialId: "m",
        sectionId: "ts",
        rigidOffsets: {
          start: [0, Number.MIN_VALUE, 0],
          end: [0, 0, Number.MIN_VALUE],
        },
      })
      .finalize();

    expect(
      Array.from(model.physicalDofs.values(), ({ nodeId, dof }) => `${nodeId}.${dof}`),
    ).toEqual([
      "a.ux",
      "a.uy",
      "a.uz",
      "a.rx",
      "a.ry",
      "a.rz",
      "b.ux",
      "b.uy",
      "b.uz",
      "b.rx",
      "b.ry",
      "b.rz",
    ]);
  });

  it("rejects constraints that target physically unavailable DOFs", () => {
    const builder = createModelBuilder()
      .setUnitSystem(units)
      .addNode({ id: "a", coordinates: [0, 0, 0] })
      .addNode({ id: "b", coordinates: [1, 0, 0] })
      .addMaterial({ id: "m", elasticModulus: 200e9, poissonRatio: 0.3 })
      .addTrussSection({ id: "ts", area: 0.002 })
      .addTruss({ id: "t", startNodeId: "a", endNodeId: "b", materialId: "m", sectionId: "ts" })
      .addConstraint({
        id: "c",
        terms: [{ nodeId: "a", dof: "rx", coefficient: 1 }],
        rightHandSide: 0,
      });

    const error = (() => {
      try {
        builder.finalize();
      } catch (caught) {
        return caught;
      }
      throw new Error("expected finalization to fail");
    })();

    expect(error).toBeInstanceOf(XFrameError);
    expect((error as XFrameError).code).toBe("INPUT_INVALID");
    expect((error as XFrameError).context).toEqual({
      kind: "input",
      path: "constraints[c].terms[0]",
      expected: "physically available DOF",
      actual: "a.rx",
    });
  });
});
