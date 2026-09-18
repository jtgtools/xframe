import { describe, expect, it, vi } from "vitest";
import { XFrameError } from "../../src/errors/xframe-error.js";
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

function completeFrame(reverseInsertion = false) {
  const builder = createModelBuilder().setUnitSystem(units);
  const nodes = [
    { id: "b", coordinates: [10, 0, 0] as const },
    { id: "a", coordinates: [0, 0, 0] as const },
  ];
  for (const node of reverseInsertion ? nodes.toReversed() : nodes) builder.addNode(node);
  return builder
    .addMaterial({ id: "steel", elasticModulus: 200e9, poissonRatio: 0.3 })
    .addFrameSection({
      id: "section",
      area: 0.01,
      torsionalConstant: 1e-5,
      momentOfInertiaY: 2e-5,
      momentOfInertiaZ: 3e-5,
    })
    .addFrame({
      id: "frame",
      startNodeId: "a",
      endNodeId: "b",
      materialId: "steel",
      sectionId: "section",
      theory: { kind: "euler-bernoulli" },
      orientation: [0, 0, 1],
      rigidOffsets: { start: [1, 0, 0], end: [-2, 0, 0] },
    });
}

function finalizeUnicodeModel() {
  return createModelBuilder()
    .setUnitSystem(units)
    .addNode({ id: "ä", coordinates: [2, 0, 0] })
    .addNode({ id: "z", coordinates: [1, 0, 0] })
    .addNode({ id: "a", coordinates: [0, 0, 0] })
    .addMaterial({ id: "material", elasticModulus: 200e9, poissonRatio: 0.3 })
    .addTrussSection({ id: "section", area: 0.01 })
    .addTruss({
      id: "ä-truss",
      startNodeId: "ä",
      endNodeId: "z",
      materialId: "material",
      sectionId: "section",
    })
    .addTruss({
      id: "z-truss",
      startNodeId: "z",
      endNodeId: "a",
      materialId: "material",
      sectionId: "section",
    })
    .finalize();
}

describe("model finalization", () => {
  it("resolves immutable elastic geometry and local axes", () => {
    const model = completeFrame().finalize();
    const frame = model.resolvedFrames[0]!;
    expect(frame.geometry.elasticStart).toEqual([1, 0, 0]);
    expect(frame.geometry.elasticEnd).toEqual([8, 0, 0]);
    expect(frame.geometry.elasticLength).toBe(7);
    expect(frame.axes.x).toEqual([1, 0, 0]);
    expect(frame.axes.y).toEqual([0, 0, 1]);
    expect(frame.axes.z).toEqual([0, -1, 0]);
    expect(Object.isFrozen(model)).toBe(true);
    expect(Object.isFrozen(model.resolvedFrames)).toBe(true);
    expect(Object.isFrozen(frame.geometry.elasticStart)).toBe(true);
  });

  it("finalization and physical DOF ordering never consult host collation", () => {
    const localeCompare = vi.spyOn(String.prototype, "localeCompare").mockImplementation(() => {
      throw new Error("localeCompare used");
    });
    try {
      const model = finalizeUnicodeModel();
      expect(model.nodes.map(({ id }) => id)).toEqual(["a", "z", "ä"]);
      expect(
        Array.from(model.physicalDofs.values(), ({ nodeId, dof }) => `${nodeId}.${dof}`),
      ).toEqual(["a.tx", "a.ty", "a.tz", "z.tx", "z.ty", "z.tz", "ä.tx", "ä.ty", "ä.tz"]);
    } finally {
      localeCompare.mockRestore();
    }
  });

  it("canonical ordering and fingerprint ignore insertion order", () => {
    const first = completeFrame(false).finalize();
    const second = completeFrame(true).finalize();
    expect(first.nodes.map(({ id }) => id)).toEqual(["a", "b"]);
    expect(second.nodes.map(({ id }) => id)).toEqual(["a", "b"]);
    expect(first.fingerprint).toBe(second.fingerprint);
    expect(first.fingerprint).toMatch(/^sha256:[0-9a-f]{64}$/u);
  });

  it("rejects missing units and structurally empty models", () => {
    expect(() =>
      createModelBuilder()
        .addNode({ id: "a", coordinates: [0, 0, 0] })
        .finalize(),
    ).toThrow(XFrameError);
    expect(() =>
      createModelBuilder()
        .setUnitSystem(units)
        .addNode({ id: "a", coordinates: [0, 0, 0] })
        .finalize(),
    ).toThrow(XFrameError);
  });

  it("checks theory-dependent section completeness at finalization", () => {
    const builder = createModelBuilder()
      .setUnitSystem(units)
      .addNode({ id: "a", coordinates: [0, 0, 0] })
      .addNode({ id: "b", coordinates: [1, 0, 0] })
      .addMaterial({ id: "m", elasticModulus: 200e9, poissonRatio: 0.3 })
      .addFrameSection({
        id: "s",
        area: 1,
        torsionalConstant: 1,
        momentOfInertiaY: 1,
        momentOfInertiaZ: 1,
      })
      .addFrame({
        id: "f",
        startNodeId: "a",
        endNodeId: "b",
        materialId: "m",
        sectionId: "s",
        theory: { kind: "timoshenko" },
      });
    expect(() => builder.finalize()).toThrow(XFrameError);
  });
});
