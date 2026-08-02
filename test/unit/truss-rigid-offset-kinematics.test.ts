import { describe, expect, it } from "vitest";
import { trussEquationMap } from "../../src/analysis/element-equation-map.js";
import { createTrussRigidOffsetKinematics } from "../../src/elements/truss/rigid-offset-kinematics.js";
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

function dot(left: ArrayLike<number>, right: ArrayLike<number>): number {
  let result = 0;
  for (let index = 0; index < left.length; index += 1) result += left[index]! * right[index]!;
  return result;
}

function trussModel(rigidOffsets?: {
  readonly start?: readonly number[];
  readonly end?: readonly number[];
}) {
  return createModelBuilder()
    .setUnitSystem(units)
    .addNode({ id: "a", coordinates: [0, 0, 0] })
    .addNode({ id: "b", coordinates: [5, 0, 0] })
    .addMaterial({ id: "m", elasticModulus: 200e9, poissonRatio: 0.3 })
    .addTrussSection({ id: "ts", area: 0.002 })
    .addTruss({
      id: "t",
      startNodeId: "a",
      endNodeId: "b",
      materialId: "m",
      sectionId: "ts",
      ...(rigidOffsets === undefined ? {} : { rigidOffsets }),
    })
    .finalize();
}

describe("truss rigid-offset kinematics", () => {
  it("FR-SAFE-002: maps eccentric truss compatibility and force work exactly", () => {
    const direction = [0.6, 0.8, 0] as const;
    const startOffset = [2, -1, 3] as const;
    const endOffset = [-1, 4, 2] as const;
    const kinematics = createTrussRigidOffsetKinematics(direction, startOffset, endOffset);
    const referenceDisplacements = [1, -2, 3, 0.5, -0.1, 0.2, -4, 5, -6, -0.4, 0.5, -0.6] as const;
    const elasticActions = [4, -5, 6, -7, 8, -9] as const;

    const expectedCompatibility = [
      -0.6, -0.8, 0, 2.4, -1.8, -2.2, 0.6, 0.8, 0, -1.6, 1.2, -3.2,
    ] as const;
    for (let index = 0; index < kinematics.compatibility.length; index += 1) {
      expect(kinematics.compatibility[index]).toBeCloseTo(expectedCompatibility[index]!, 14);
    }
    expect(kinematics.activeReferenceComponents).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);

    const endpointDisplacements = kinematics.elasticTranslations(referenceDisplacements);
    const expectedEndpointDisplacements = [0.9, -3.1, 2.7, -0.6, 6.4, -7.1] as const;
    for (let index = 0; index < endpointDisplacements.length; index += 1) {
      expect(endpointDisplacements[index]).toBeCloseTo(expectedEndpointDisplacements[index]!, 14);
    }

    const delta = dot(kinematics.compatibility, referenceDisplacements);
    const elasticExtension =
      direction[0] * (endpointDisplacements[3]! - endpointDisplacements[0]!) +
      direction[1] * (endpointDisplacements[4]! - endpointDisplacements[1]!) +
      direction[2] * (endpointDisplacements[5]! - endpointDisplacements[2]!);
    expect(delta).toBeCloseTo(elasticExtension, 14);
    expect(dot(kinematics.referenceActions(elasticActions), referenceDisplacements)).toBeCloseTo(
      dot(elasticActions, endpointDisplacements),
      14,
    );
  });

  it("FR-SAFE-002: preserves the exact-zero six-translation fast path", () => {
    const kinematics = createTrussRigidOffsetKinematics([1, 0, 0], [0, 0, 0], [-0, 0, 0]);

    expect(kinematics.activeReferenceComponents).toEqual([0, 1, 2, 6, 7, 8]);
    expect(Array.from(kinematics.elasticTranslations([1, 2, 3, 4, 5, 6]))).toEqual([
      1, 2, 3, 4, 5, 6,
    ]);
    expect(Array.from(kinematics.referenceActions([7, 8, 9, 10, 11, 12]))).toEqual([
      7, 8, 9, 10, 11, 12,
    ]);
  });

  it("FR-SAFE-002: orders active eccentric truss equations by reference endpoint", () => {
    const zeroOffsetModel = trussModel({ start: [0, 0, 0], end: [-0, 0, 0] });
    const eccentricModel = trussModel({ start: [-Number.MIN_VALUE, 0, 0], end: [0, 0, 0] });

    expect(trussEquationMap(zeroOffsetModel, zeroOffsetModel.resolvedTrusses[0]!)).toEqual([
      0, 1, 2, 3, 4, 5,
    ]);
    expect(trussEquationMap(eccentricModel, eccentricModel.resolvedTrusses[0]!)).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7, 8,
    ]);
  });
});
