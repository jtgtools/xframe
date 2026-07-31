import { describe, expect, it } from "vitest";
import { buildLocalAxes } from "../../src/geometry/local-axes.js";
import { determinantMatrix3, multiplyMatrix3Vector3 } from "../../src/geometry/matrix-3.js";
import {
  transferRigidBodyDisplacement,
  transferRigidEndpointForceToNode,
} from "../../src/geometry/rigid-offset.js";
import { dotVector3, normVector3 } from "../../src/geometry/vector-3.js";

function generator(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

function sample(random: () => number, scale = 10): readonly [number, number, number] {
  return [(random() * 2 - 1) * scale, (random() * 2 - 1) * scale, (random() * 2 - 1) * scale];
}

function six(random: () => number): readonly [number, number, number, number, number, number] {
  return [
    random() * 2 - 1,
    random() * 2 - 1,
    random() * 2 - 1,
    random() * 2 - 1,
    random() * 2 - 1,
    random() * 2 - 1,
  ];
}

describe("geometry properties", () => {
  it("FR-GEO-003: seed 24301 produces orthonormal right-handed local bases", () => {
    const random = generator(24_301);
    for (let index = 0; index < 200; index += 1) {
      const start = sample(random, 1_000);
      const delta = sample(random, 20);
      const end = [start[0] + delta[0], start[1] + delta[1], start[2] + delta[2]] as const;
      const axes = buildLocalAxes(start, end);

      expect(Math.abs(normVector3(axes.x) - 1)).toBeLessThan(2e-14);
      expect(Math.abs(normVector3(axes.y) - 1)).toBeLessThan(2e-14);
      expect(Math.abs(normVector3(axes.z) - 1)).toBeLessThan(2e-14);
      expect(Math.abs(dotVector3(axes.x, axes.y))).toBeLessThan(2e-14);
      expect(Math.abs(dotVector3(axes.x, axes.z))).toBeLessThan(2e-14);
      expect(Math.abs(dotVector3(axes.y, axes.z))).toBeLessThan(2e-14);
      expect(Math.abs(determinantMatrix3(axes.globalToLocal) - 1)).toBeLessThan(4e-14);
    }
  });

  it("FR-GEO-006: seed 24302 preserves vector components through global/local round-trips", () => {
    const random = generator(24_302);
    for (let index = 0; index < 100; index += 1) {
      const start = sample(random, 100);
      const delta = sample(random, 10);
      const end = [start[0] + delta[0], start[1] + delta[1], start[2] + delta[2]] as const;
      const vector = sample(random, 50);
      const axes = buildLocalAxes(start, end);
      const local = multiplyMatrix3Vector3(axes.globalToLocal, vector);
      const recovered = multiplyMatrix3Vector3(axes.localToGlobal, local);

      for (let component = 0; component < 3; component += 1) {
        expect(Math.abs((recovered[component] ?? 0) - vector[component]!)).toBeLessThan(2e-12);
      }
    }
  });

  it("FR-GEO-005: seed 24303 preserves virtual work for rigid offsets", () => {
    const random = generator(24_303);
    for (let index = 0; index < 100; index += 1) {
      const offset = sample(random, 5);
      const nodalDisplacement = six(random);
      const endpointAction = six(random);
      const endpointDisplacement = transferRigidBodyDisplacement(nodalDisplacement, offset);
      const nodalAction = transferRigidEndpointForceToNode(endpointAction, offset);
      let endpointWork = 0;
      let nodalWork = 0;
      for (let component = 0; component < 6; component += 1) {
        endpointWork += endpointAction[component]! * endpointDisplacement[component]!;
        nodalWork += nodalAction[component]! * nodalDisplacement[component]!;
      }
      const scale = Math.max(1, Math.abs(endpointWork), Math.abs(nodalWork));
      expect(Math.abs(endpointWork - nodalWork) / scale).toBeLessThan(2e-14);
    }
  });
});
