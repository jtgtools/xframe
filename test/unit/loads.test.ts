import { describe, expect, it } from "vitest";
import { XFrameError } from "../../src/errors/xframe-error.js";
import { createDistributedLoad } from "../../src/loads/distributed-load.js";
import { createMemberPointLoad } from "../../src/loads/member-point-load.js";
import { createNodalLoad } from "../../src/loads/nodal-load.js";
import { createSelfWeightLoad } from "../../src/loads/self-weight.js";
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

function frameBuilder() {
  return createModelBuilder()
    .setUnitSystem(units)
    .addNode({ id: "a", coordinates: [0, 0, 0] })
    .addNode({ id: "b", coordinates: [10, 0, 0] })
    .addMaterial({ id: "m", elasticModulus: 200e9, poissonRatio: 0.3, density: 7850 })
    .addFrameSection({
      id: "s",
      area: 0.01,
      torsionalConstant: 1e-5,
      momentOfInertiaY: 2e-5,
      momentOfInertiaZ: 3e-5,
    })
    .addFrame({
      id: "f",
      startNodeId: "a",
      endNodeId: "b",
      materialId: "m",
      sectionId: "s",
      theory: { kind: "euler-bernoulli" },
      rigidOffsets: { start: [1, 0, 0], end: [-1, 0, 0] },
    });
}

describe("load records", () => {
  it("FR-LOD-001: validates explicit nodal force and moment components", () => {
    const load = createNodalLoad({
      kind: "nodal",
      nodeId: "n",
      force: [1, 2, 3],
      moment: [4, 5, 6],
    });
    expect(load).toEqual({ kind: "nodal", nodeId: "n", force: [1, 2, 3], moment: [4, 5, 6] });
    expect(Object.isFrozen(load.force)).toBe(true);
    expect(() => createNodalLoad({ kind: "nodal", nodeId: "n", force: [0, 0, 0] })).toThrow(
      XFrameError,
    );
  });

  it("FR-LOD-002/FR-LOD-003: separates physical distance and ratio point-action coordinates", () => {
    expect(
      createMemberPointLoad({
        kind: "member-point-force",
        frameId: "f",
        coordinateSystem: "local",
        distanceFromElasticStart: 2,
        force: [0, -1, 0],
      }),
    ).toEqual({
      kind: "member-point-force",
      frameId: "f",
      coordinateSystem: "local",
      location: { kind: "distance", distanceFromElasticStart: 2 },
      force: [0, -1, 0],
    });
    expect(
      createMemberPointLoad({
        kind: "member-point-moment",
        frameId: "f",
        coordinateSystem: "global",
        positionRatio: 0.25,
        moment: [0, 0, 3],
      }),
    ).toEqual({
      kind: "member-point-moment",
      frameId: "f",
      coordinateSystem: "global",
      location: { kind: "ratio", positionRatio: 0.25 },
      moment: [0, 0, 3],
    });
    expect(() =>
      createMemberPointLoad({
        kind: "member-point-force",
        frameId: "f",
        coordinateSystem: "local",
        distanceFromElasticStart: 1,
        positionRatio: 0.5,
        force: [1, 0, 0],
      }),
    ).toThrow(XFrameError);
    expect(() =>
      createMemberPointLoad({
        kind: "member-point-force",
        frameId: "f",
        coordinateSystem: "local",
        position: 1,
        force: [1, 0, 0],
      } as never),
    ).toThrow(XFrameError);
  });

  it("FR-LOD-004/FR-LOD-005: defines full, distance, and ratio distributed spans", () => {
    expect(
      createDistributedLoad({
        kind: "member-distributed",
        frameId: "f",
        coordinateSystem: "local",
        startIntensity: [0, -2, 0],
        endIntensity: [0, -2, 0],
      }).span,
    ).toEqual({ kind: "full" });
    expect(
      createDistributedLoad({
        kind: "member-distributed",
        frameId: "f",
        coordinateSystem: "local",
        startDistanceFromElasticStart: 1,
        endDistanceFromElasticStart: 3,
        startIntensity: [0, -1, 0],
        endIntensity: [0, -2, 0],
      }).span,
    ).toEqual({
      kind: "distance",
      startDistanceFromElasticStart: 1,
      endDistanceFromElasticStart: 3,
    });
    expect(
      createDistributedLoad({
        kind: "member-distributed",
        frameId: "f",
        coordinateSystem: "global",
        startPositionRatio: 0.2,
        endPositionRatio: 0.8,
        startIntensity: [0, 0, -1],
        endIntensity: [0, 0, -3],
      }).span,
    ).toEqual({ kind: "ratio", startPositionRatio: 0.2, endPositionRatio: 0.8 });
  });

  it("FR-LOD-006: validates explicit nonzero gravity and immutable target selections", () => {
    const load = createSelfWeightLoad({
      kind: "self-weight",
      gravity: [0, 0, -9.81],
      frameIds: ["f"],
    });
    expect(load).toEqual({ kind: "self-weight", gravity: [0, 0, -9.81], frameIds: ["f"] });
    expect(Object.isFrozen(load.gravity)).toBe(true);
    expect(() => createSelfWeightLoad({ kind: "self-weight", gravity: [0, 0, 0] })).toThrow(
      XFrameError,
    );
  });
});

describe("finalized load coordinates", () => {
  it("FR-LOD-002/FR-GEO-005: converts ratios against deformable length and preserves discontinuities", () => {
    const model = frameBuilder()
      .addLoadCase({
        id: "L",
        loads: [
          {
            kind: "member-point-force",
            frameId: "f",
            coordinateSystem: "local",
            positionRatio: 0.25,
            force: [0, -1, 0],
          },
          {
            kind: "member-distributed",
            frameId: "f",
            coordinateSystem: "local",
            startPositionRatio: 0.25,
            endPositionRatio: 0.75,
            startIntensity: [0, -1, 0],
            endIntensity: [0, -2, 0],
          },
        ],
      })
      .finalize();
    expect(model.loadCases[0]?.loads[0]).toEqual({
      kind: "member-point-force",
      frameId: "f",
      coordinateSystem: "local",
      distanceFromElasticStart: 2,
      force: [0, -1, 0],
      sourceLocation: { kind: "ratio", positionRatio: 0.25 },
    });
    expect(model.loadCases[0]?.loads[1]).toEqual({
      kind: "member-distributed",
      frameId: "f",
      coordinateSystem: "local",
      startDistanceFromElasticStart: 2,
      endDistanceFromElasticStart: 6,
      startIntensity: [0, -1, 0],
      endIntensity: [0, -2, 0],
      sourceSpan: { kind: "ratio", startPositionRatio: 0.25, endPositionRatio: 0.75 },
      discontinuities: [2, 6],
    });
  });

  it("FR-SAFE-001/FR-LOD-006: explicit self-weight selections include only listed element categories", () => {
    const model = frameBuilder()
      .addLoadCase({
        id: "SW",
        loads: [{ kind: "self-weight", gravity: [0, 0, -9.81], frameIds: ["f"] }],
      })
      .finalize();
    expect(model.loadCases[0]?.loads[0]).toEqual({
      kind: "self-weight",
      gravity: [0, 0, -9.81],
      frameIds: ["f"],
      trussIds: [],
    });
    expect(model.loadCases[0]?.provenance[0]?.targetIds).toEqual(["f"]);
    expect(model.loadCases[0]?.compatibilityKey).toMatch(/^stiffness:sha256:[0-9a-f]{64}$/u);
  });

  it("FR-LOD-002: rejects physical coordinates outside the elastic member", () => {
    const builder = frameBuilder().addLoadCase({
      id: "L",
      loads: [
        {
          kind: "member-point-force",
          frameId: "f",
          coordinateSystem: "local",
          distanceFromElasticStart: 9,
          force: [0, -1, 0],
        },
      ],
    });
    expect(() => builder.finalize()).toThrow(XFrameError);
  });
});
