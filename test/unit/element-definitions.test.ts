import { describe, expect, it } from "vitest";
import { XFrameError } from "../../src/errors/xframe-error.js";
import { createFrameElement } from "../../src/elements/frame-element.js";
import { parseFrameTheory } from "../../src/elements/frame-theory.js";
import { createSpringElement } from "../../src/elements/spring-element.js";
import { createTrussElement } from "../../src/elements/truss-element.js";

function codeOf(action: () => unknown): string | undefined {
  try {
    action();
  } catch (error) {
    return error instanceof XFrameError ? error.code : undefined;
  }
  return undefined;
}

const frameInput = {
  id: "f1",
  startNodeId: "n1",
  endNodeId: "n2",
  materialId: "m1",
  sectionId: "s1",
  theory: { kind: "euler-bernoulli" } as const,
};

describe("frame theory and records", () => {
  it("accepts only the closed Euler-Bernoulli and Timoshenko theory union", () => {
    expect(parseFrameTheory({ kind: "euler-bernoulli" })).toEqual({ kind: "euler-bernoulli" });
    expect(parseFrameTheory({ kind: "timoshenko" })).toEqual({ kind: "timoshenko" });
    expect(codeOf(() => parseFrameTheory({ kind: "shear-flexible-ish" }))).toBe("INPUT_INVALID");
  });

  it("creates immutable frame records with copied orientation and normalized releases", () => {
    const orientation = [0, 0, 1];
    const frame = createFrameElement({
      ...frameInput,
      orientation,
      releases: { start: ["rz", "ux"], end: ["ry"] },
      rigidOffsets: { start: [0.1, 0, 0], end: [-0.2, 0, 0] },
    });
    orientation[2] = 99;

    expect(frame.orientation).toEqual([0, 0, 1]);
    expect(frame.releases).toEqual({ start: ["ux", "rz"], end: ["ry"] });
    expect(Object.isFrozen(frame)).toBe(true);
    expect(Object.isFrozen(frame.orientation)).toBe(true);
  });

  it("rejects coincident connectivity, zero orientation, and duplicate release components", () => {
    expect(codeOf(() => createFrameElement({ ...frameInput, endNodeId: "n1" }))).toBe(
      "INPUT_INVALID",
    );
    expect(codeOf(() => createFrameElement({ ...frameInput, orientation: [0, 0, 0] }))).toBe(
      "GEOMETRY_INVALID",
    );
    expect(
      codeOf(() => createFrameElement({ ...frameInput, releases: { start: ["ux", "ux"] } })),
    ).toBe("INPUT_INVALID");
  });
});

describe("truss and spring records", () => {
  it("creates a truss record and rejects identical endpoint IDs", () => {
    const truss = createTrussElement({
      id: "t1",
      startNodeId: "n1",
      endNodeId: "n2",
      materialId: "m1",
      sectionId: "ts1",
    });
    expect(truss.id).toBe("t1");
    expect(Object.isFrozen(truss)).toBe(true);
    expect(
      codeOf(() =>
        createTrussElement({
          id: "t1",
          startNodeId: "n1",
          endNodeId: "n1",
          materialId: "m1",
          sectionId: "ts1",
        }),
      ),
    ).toBe("INPUT_INVALID");
  });

  it("supports ground and two-node diagonal component springs", () => {
    const ground = createSpringElement({
      id: "sg",
      startNodeId: "n1",
      stiffness: { ux: 1000, rz: 50 },
    });
    const link = createSpringElement({
      id: "sl",
      startNodeId: "n1",
      endNodeId: "n2",
      stiffness: [1, 2, 3, 4, 5, 6],
    });

    expect(ground.endNodeId).toBeUndefined();
    expect(ground.stiffness).toEqual([1000, 0, 0, 0, 0, 50]);
    expect(link.stiffness).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("rejects negative, all-zero, malformed, and self-connected springs", () => {
    expect(
      codeOf(() =>
        createSpringElement({ id: "s", startNodeId: "n1", stiffness: [0, 0, 0, 0, 0, 0] }),
      ),
    ).toBe("INPUT_INVALID");
    expect(
      codeOf(() =>
        createSpringElement({ id: "s", startNodeId: "n1", stiffness: [-1, 0, 0, 0, 0, 0] }),
      ),
    ).toBe("INPUT_INVALID");
    expect(
      codeOf(() => createSpringElement({ id: "s", startNodeId: "n1", stiffness: [1, 2] })),
    ).toBe("INPUT_INVALID");
    expect(
      codeOf(() =>
        createSpringElement({ id: "s", startNodeId: "n1", endNodeId: "n1", stiffness: { ux: 1 } }),
      ),
    ).toBe("INPUT_INVALID");
  });
});
