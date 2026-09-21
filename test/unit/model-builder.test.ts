import { describe, expect, it } from "vitest";
import { createModelBuilder } from "../../src/model/model-builder.js";
import { XFrameError } from "../../src/errors/xframe-error.js";

const nodeA = { id: "n1", coordinates: [0, 0, 0] as const };

describe("ModelBuilder", () => {
  it("add methods are fluent and defer cross-reference resolution", () => {
    const builder = createModelBuilder();

    expect(builder.addNode(nodeA)).toBe(builder);
    expect(
      builder.addFrame({
        id: "f1",
        startNodeId: "missing-start",
        endNodeId: "missing-end",
        materialId: "missing-material",
        sectionId: "missing-section",
        theory: { kind: "euler-bernoulli" },
      }),
    ).toBe(builder);
    expect(builder.snapshot().nodes[0]).toEqual(nodeA);
    expect(builder.snapshot().frames[0]?.id).toBe("f1");
  });

  it("copies and freezes caller-owned arrays and records", () => {
    const coordinates = [1, 2, 3];
    const builder = createModelBuilder().addNode({ id: "n1", coordinates });
    coordinates[0] = 99;

    const stored = builder.snapshot().nodes[0];
    expect(stored?.coordinates).toEqual([1, 2, 3]);
    expect(Object.isFrozen(stored)).toBe(true);
    expect(Object.isFrozen(stored?.coordinates)).toBe(true);
  });

  it("failed batch additions leave the prior builder state byte-for-byte equivalent", () => {
    const builder = createModelBuilder().addNode(nodeA);
    const before = JSON.stringify(builder.snapshot());

    expect(() =>
      builder.addBatch({
        nodes: [
          { id: "n2", coordinates: [1, 0, 0] },
          { id: "n1", coordinates: [2, 0, 0] },
        ],
      }),
    ).toThrow(XFrameError);
    expect(JSON.stringify(builder.snapshot())).toBe(before);
  });

  it("local shape failures use structured field paths", () => {
    const builder = createModelBuilder();
    let caught: unknown;
    try {
      builder.addNode({ id: "n1", coordinates: [0, Number.NaN, 0] });
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(XFrameError);
    if (!(caught instanceof XFrameError)) throw new Error("Expected non-finite value failure.");
    expect(caught.code).toBe("NON_FINITE_VALUE");
    expect(caught.context).toEqual({
      kind: "numeric",
      path: "node.coordinates[1]",
      value: "NaN",
      expected: "finite number",
    });
  });
});

it("exposes the complete fluent construction surface", () => {
  const builder = createModelBuilder();
  expect(builder.addMaterial({ id: "m1", elasticModulus: 200e9, poissonRatio: 0.3 })).toBe(builder);
  expect(
    builder.addFrameSection({
      id: "fs1",
      area: 0.01,
      torsionalConstant: 1e-5,
      momentOfInertiaY: 2e-5,
      momentOfInertiaZ: 3e-5,
    }),
  ).toBe(builder);
  expect(builder.addTrussSection({ id: "ts1", area: 0.005 })).toBe(builder);
  expect(
    builder.addTruss({
      id: "t1",
      startNodeId: "n1",
      endNodeId: "n2",
      materialId: "m1",
      sectionId: "ts1",
    }),
  ).toBe(builder);
  expect(builder.addSpring({ id: "s1", startNodeId: "n1", stiffness: [1, 2, 3, 4, 5, 6] })).toBe(
    builder,
  );
  expect(
    builder.addConstraint({
      id: "c1",
      terms: [{ nodeId: "n1", dof: "ux", coefficient: 1 }],
      rightHandSide: 0,
    }),
  ).toBe(builder);
  expect(builder.addLoadCase({ id: "lc1", loads: [] })).toBe(builder);
  expect(builder.addCombination({ id: "comb1", factors: [{ resultId: "lc1", factor: 1.2 }] })).toBe(
    builder,
  );

  const snapshot = builder.snapshot();
  expect(snapshot.materials.map(({ id }) => id)).toEqual(["m1"]);
  expect(snapshot.frameSections.map(({ id }) => id)).toEqual(["fs1"]);
  expect(snapshot.trussSections.map(({ id }) => id)).toEqual(["ts1"]);
  expect(snapshot.trusses.map(({ id }) => id)).toEqual(["t1"]);
  expect(snapshot.springs.map(({ id }) => id)).toEqual(["s1"]);
  expect(snapshot.constraints.map(({ id }) => id)).toEqual(["c1"]);
  expect(snapshot.loadCases.map(({ id }) => id)).toEqual(["lc1"]);
  expect(snapshot.combinations.map(({ id }) => id)).toEqual(["comb1"]);
});

it("successful batch additions commit in deterministic category order", () => {
  const builder = createModelBuilder().addBatch({
    nodes: [
      { id: "n2", coordinates: [1, 0, 0] },
      { id: "n1", coordinates: [0, 0, 0] },
    ],
    materials: [{ id: "m1", elasticModulus: 1, shearModulus: 1 }],
  });

  expect(builder.snapshot().nodes.map(({ id }) => id)).toEqual(["n2", "n1"]);
  expect(builder.snapshot().materials.map(({ id }) => id)).toEqual(["m1"]);
});

it("a later category failure rolls back earlier categories in the same batch", () => {
  const builder = createModelBuilder().addMaterial({
    id: "m1",
    elasticModulus: 1,
    shearModulus: 1,
  });
  const before = JSON.stringify(builder.snapshot());

  expect(() =>
    builder.addBatch({
      nodes: [{ id: "n1", coordinates: [0, 0, 0] }],
      materials: [{ id: "m1", elasticModulus: 2, shearModulus: 2 }],
    }),
  ).toThrow(XFrameError);
  expect(JSON.stringify(builder.snapshot())).toBe(before);
});

it("rejects prototype-pollution payloads at the closed load boundary", () => {
  const payload = JSON.parse('{"__proto__":{"polluted":true}}') as never;
  expect(() => createModelBuilder().addLoadCase({ id: "lc1", loads: [payload] })).toThrow(
    XFrameError,
  );
  expect(({} as { polluted?: boolean }).polluted).toBeUndefined();
});
