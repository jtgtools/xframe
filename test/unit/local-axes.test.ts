import { describe, expect, it } from "vitest";
import { XFrameError } from "../../src/errors/xframe-error.js";
import { buildLocalAxes } from "../../src/geometry/local-axes.js";
import {
  resolveElasticGeometry,
  transferRigidBodyDisplacement,
  transferRigidEndpointForceToNode,
} from "../../src/geometry/rigid-offset.js";
import { determinantMatrix3 } from "../../src/geometry/matrix-3.js";
import { dotVector3, normVector3 } from "../../src/geometry/vector-3.js";

function codeOf(action: () => unknown): string | undefined {
  try {
    action();
  } catch (error) {
    return error instanceof XFrameError ? error.code : undefined;
  }
  return undefined;
}

describe("buildLocalAxes", () => {
  it("FR-GEO-003: constructs a right-handed orthonormal basis from an explicit orientation", () => {
    const axes = buildLocalAxes([0, 0, 0], [2, 0, 0], [0, 1, 0]);

    expect(Array.from(axes.x)).toEqual([1, 0, 0]);
    expect(Array.from(axes.y)).toEqual([0, 1, 0]);
    expect(Array.from(axes.z)).toEqual([0, 0, 1]);
    expect(normVector3(axes.x)).toBeCloseTo(1, 12);
    expect(normVector3(axes.y)).toBeCloseTo(1, 12);
    expect(normVector3(axes.z)).toBeCloseTo(1, 12);
    expect(dotVector3(axes.x, axes.y)).toBeCloseTo(0, 12);
    expect(determinantMatrix3(axes.globalToLocal)).toBeCloseTo(1, 12);
  });

  it("FR-GEO-004: uses a deterministic least-aligned fallback when no orientation is supplied", () => {
    const first = buildLocalAxes([0, 0, 0], [0, 0, 5]);
    const second = buildLocalAxes([0, 0, 0], [0, 0, 5]);

    expect(Array.from(first.y)).toEqual([1, 0, 0]);
    expect(Array.from(first.z)).toEqual([0, 1, 0]);
    expect(Array.from(second.globalToLocal)).toEqual(Array.from(first.globalToLocal));
  });

  it("FR-GEO-002: rejects exact and cancellation-scale zero lengths", () => {
    expect(codeOf(() => buildLocalAxes([0, 0, 0], [0, 0, 0]))).toBe("GEOMETRY_INVALID");
    expect(codeOf(() => buildLocalAxes([1e12, 0, 0], [1e12 + 1e-4, 0, 0]))).toBe("GEOMETRY_INVALID");
  });

  it("FR-GEO-004: rejects explicit orientation vectors parallel or nearly parallel to the member", () => {
    expect(codeOf(() => buildLocalAxes([0, 0, 0], [1, 0, 0], [1, 0, 0]))).toBe("GEOMETRY_INVALID");
    expect(codeOf(() => buildLocalAxes([0, 0, 0], [1, 0, 0], [1, 1e-10, 0]))).toBe("GEOMETRY_INVALID");
  });

  it("FR-GEO-006: connectivity reversal mirrors x and z while retaining the projected y axis", () => {
    const forward = buildLocalAxes([0, 0, 0], [2, 0, 0], [0, 1, 0]);
    const reverse = buildLocalAxes([2, 0, 0], [0, 0, 0], [0, 1, 0]);

    expect(Array.from(reverse.x)).toEqual([-1, 0, 0]);
    expect(Array.from(reverse.y)).toEqual(Array.from(forward.y));
    expect(Array.from(reverse.z)).toEqual([0, 0, -1]);
  });
});

describe("rigid offsets", () => {
  it("FR-GEO-005: resolves deformable endpoints and elastic length", () => {
    const geometry = resolveElasticGeometry([0, 0, 0], [10, 0, 0], [1, 0, 0], [-2, 0, 0]);

    expect(Array.from(geometry.elasticStart)).toEqual([1, 0, 0]);
    expect(Array.from(geometry.elasticEnd)).toEqual([8, 0, 0]);
    expect(geometry.referenceLength).toBe(10);
    expect(geometry.elasticLength).toBe(7);
  });

  it("FR-GEO-005: rejects overlapping and inverted deformable spans", () => {
    expect(codeOf(() => resolveElasticGeometry([0, 0, 0], [10, 0, 0], [6, 0, 0], [-5, 0, 0]))).toBe(
      "GEOMETRY_INVALID",
    );
  });

  it("FR-GEO-005: transfers rigid-body displacement and endpoint force with virtual-work consistency", () => {
    const offset = [2, -1, 3] as const;
    const nodalDisplacement = [0.1, -0.2, 0.3, 0.01, -0.02, 0.03] as const;
    const endpointAction = [4, -5, 6, 0.7, -0.8, 0.9] as const;
    const endpointDisplacement = transferRigidBodyDisplacement(nodalDisplacement, offset);
    const nodalAction = transferRigidEndpointForceToNode(endpointAction, offset);
    const endpointWork = endpointAction.reduce((sum, value, index) => sum + value * (endpointDisplacement[index] ?? 0), 0);
    const nodalWork = nodalAction.reduce((sum, value, index) => sum + value * nodalDisplacement[index]!, 0);

    expect(Array.from(endpointDisplacement)).toEqual([0.07, -0.17, 0.32999999999999996, 0.01, -0.02, 0.03]);
    expect(Array.from(nodalAction)).toEqual([4, -5, 6, 9.7, -0.8, -5.1]);
    expect(endpointWork).toBeCloseTo(nodalWork, 12);
  });
});
