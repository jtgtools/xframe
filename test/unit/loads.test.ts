import { describe, expect, it } from "vitest";
import { XFrameError } from "../../src/errors/xframe-error.js";
import { createDistributedLoad } from "../../src/loads/distributed-load.js";
import { createLoadCase } from "../../src/loads/load-case.js";
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

function loadFailure(action: () => unknown): XFrameError {
  try {
    action();
  } catch (error) {
    if (error instanceof XFrameError) return error;
    throw error;
  }
  throw new Error("Expected a load validation error.");
}

describe("load records", () => {
  it("validates explicit nodal force and moment components", () => {
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

  it("separates physical distance and ratio point-action coordinates", () => {
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

  it("defines full, distance, and ratio distributed spans", () => {
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

  it("validates explicit nonzero gravity and immutable target selections", () => {
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

  it("rejects ambiguous and out-of-bound member coordinates", () => {
    const cases = [
      {
        action: () =>
          createMemberPointLoad({
            kind: "member-point-force",
            frameId: "f",
            coordinateSystem: "local",
            distanceFromElasticStart: -1,
            force: [1, 0, 0],
          }),
        path: "load.distanceFromElasticStart",
      },
      {
        action: () =>
          createMemberPointLoad({
            kind: "member-point-moment",
            frameId: "f",
            coordinateSystem: "global",
            positionRatio: 1.1,
            moment: [0, 0, 1],
          }),
        path: "load.positionRatio",
      },
      {
        action: () =>
          createDistributedLoad({
            kind: "member-distributed",
            frameId: "f",
            coordinateSystem: "local",
            startDistanceFromElasticStart: 0,
            endDistanceFromElasticStart: 1,
            startPositionRatio: 0,
            endPositionRatio: 1,
            startIntensity: [1, 0, 0],
            endIntensity: [1, 0, 0],
          }),
        path: "load",
      },
      {
        action: () =>
          createDistributedLoad({
            kind: "member-distributed",
            frameId: "f",
            coordinateSystem: "local",
            startDistanceFromElasticStart: 0,
            startIntensity: [1, 0, 0],
            endIntensity: [1, 0, 0],
          } as never),
        path: "load",
      },
      {
        action: () =>
          createDistributedLoad({
            kind: "member-distributed",
            frameId: "f",
            coordinateSystem: "local",
            startPositionRatio: 0.75,
            endPositionRatio: 0.25,
            startIntensity: [1, 0, 0],
            endIntensity: [1, 0, 0],
          }),
        path: "load",
      },
      {
        action: () =>
          createDistributedLoad({
            kind: "member-distributed",
            frameId: "f",
            coordinateSystem: "local",
            startIntensity: [0, 0, 0],
            endIntensity: [0, 0, 0],
          }),
        path: "load",
      },
    ];
    for (const { action, path } of cases) {
      const error = loadFailure(action);
      expect(error.code).toBe("LOAD_INVALID");
      expect(error.context).toMatchObject({ kind: "input", path });
    }
  });

  it("rejects malformed load records and explicit empty selections", () => {
    const cases = [
      {
        action: () =>
          createDistributedLoad({
            kind: "member-distributed",
            frameId: "f",
            coordinateSystem: "member",
            startIntensity: [1, 0, 0],
            endIntensity: [1, 0, 0],
          } as never),
        path: "load.coordinateSystem",
      },
      {
        action: () =>
          createDistributedLoad({
            kind: "member-distributed",
            frameId: "f",
            coordinateSystem: "local",
            startIntensity: [1, 0],
            endIntensity: [1, 0, 0],
          } as never),
        path: "load.startIntensity",
      },
      {
        action: () =>
          createMemberPointLoad({
            kind: "member-point-force",
            frameId: "f",
            coordinateSystem: "local",
            positionRatio: 0.5,
            force: [0, 0, 0],
          }),
        path: "load.force",
      },
      {
        action: () =>
          createSelfWeightLoad({
            kind: "self-weight",
            gravity: [0, 0, -9.81],
            frameIds: ["f", "f"],
          }),
        path: "load.frameIds",
      },
      {
        action: () =>
          createSelfWeightLoad({
            kind: "self-weight",
            gravity: [0, 0, -9.81],
            frameIds: [],
            trussIds: [],
          }),
        path: "load",
      },
    ];
    for (const { action, path } of cases) {
      const error = loadFailure(action);
      expect(error.code).toBe("LOAD_INVALID");
      expect(error.context).toMatchObject({ kind: "input", path });
    }
  });
});

describe("finalized load coordinates", () => {
  it("converts ratios against deformable length and preserves discontinuities", () => {
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

  it("explicit self-weight selections include only listed element categories", () => {
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

  it("rejects physical coordinates outside the elastic member", () => {
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

  it("rejects unknown loads and resolves a full distributed span", () => {
    let error: unknown;
    try {
      createLoadCase({ id: "L", loads: [{ kind: "unknown" }] as never });
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(XFrameError);
    expect(error).toMatchObject({
      code: "LOAD_INVALID",
      context: { kind: "input", path: "loadCase.loads[0].kind", expected: "recognized load kind" },
    });

    const model = frameBuilder()
      .addLoadCase({
        id: "FULL",
        loads: [
          {
            kind: "member-distributed",
            frameId: "f",
            coordinateSystem: "local",
            startIntensity: [0, -1, 0],
            endIntensity: [0, -1, 0],
          },
        ],
      })
      .finalize();
    expect(model.loadCases[0]!.loads[0]).toMatchObject({
      kind: "member-distributed",
      startDistanceFromElasticStart: 0,
      endDistanceFromElasticStart: 8,
      discontinuities: [0, 8],
    });
  });
});
