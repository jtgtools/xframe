import { XFrameError } from "../../errors/xframe-error.js";
import { finiteFloat64Array } from "../../geometry/finite.js";
import {
  transferRigidBodyDisplacement,
  transferRigidEndpointForceToNode,
} from "../../geometry/rigid-offset.js";
import { createVector3, crossVector3, type Vector3 } from "../../geometry/vector-3.js";
import { normalizedTrussDirection } from "./local-stiffness.js";

const TRANSLATION_COMPONENTS = [0, 1, 2] as const;
const RIGID_COMPONENTS = [0, 1, 2, 3, 4, 5] as const;

export interface TrussRigidOffsetKinematics {
  readonly compatibility: Float64Array;
  readonly activeReferenceComponents: readonly number[];
  elasticTranslations(activeReferenceDisplacements: ArrayLike<number>): Float64Array;
  referenceActions(elasticEndForces: ArrayLike<number>): Float64Array;
}

function exactNonzero(value: ArrayLike<number>): boolean {
  return value[0] !== 0 || value[1] !== 0 || value[2] !== 0;
}

function checkedComponents(input: ArrayLike<number>, length: number, path: string): Float64Array {
  if (input.length !== length) {
    throw new XFrameError("INPUT_INVALID", "Truss rigid-offset input has an invalid length.", {
      kind: "input",
      path,
      expected: `array-like of length ${length}`,
      actual: `length ${input.length}`,
    });
  }
  return finiteFloat64Array(input, path);
}

function activeComponents(startOffset: Vector3, endOffset: Vector3): readonly number[] {
  return Object.freeze([
    ...(exactNonzero(startOffset) ? RIGID_COMPONENTS : TRANSLATION_COMPONENTS),
    ...(exactNonzero(endOffset)
      ? RIGID_COMPONENTS.map((component) => component + 6)
      : TRANSLATION_COMPONENTS.map((component) => component + 6)),
  ]);
}

function gather(reference: ArrayLike<number>, components: readonly number[]): Float64Array {
  return Float64Array.from(components, (component) => reference[component]!);
}

export function hasNonzeroTrussRigidOffset(offsetInput: ArrayLike<number> | undefined): boolean {
  return offsetInput !== undefined && exactNonzero(createVector3(offsetInput, "truss.rigidOffset"));
}

export function createTrussRigidOffsetKinematics(
  directionInput: ArrayLike<number>,
  startOffsetInput: ArrayLike<number>,
  endOffsetInput: ArrayLike<number>,
): TrussRigidOffsetKinematics {
  const direction = normalizedTrussDirection(directionInput);
  const startOffset = createVector3(startOffsetInput, "truss.startOffset");
  const endOffset = createVector3(endOffsetInput, "truss.endOffset");
  const startRotation = crossVector3(startOffset, direction);
  const endRotation = crossVector3(endOffset, direction);
  const activeReferenceComponents = activeComponents(startOffset, endOffset);
  const compatibility = finiteFloat64Array(
    [
      -direction[0]!,
      -direction[1]!,
      -direction[2]!,
      -startRotation[0]!,
      -startRotation[1]!,
      -startRotation[2]!,
      direction[0]!,
      direction[1]!,
      direction[2]!,
      endRotation[0]!,
      endRotation[1]!,
      endRotation[2]!,
    ],
    "truss.compatibility",
  );

  return Object.freeze({
    compatibility,
    activeReferenceComponents,
    elasticTranslations(activeReferenceDisplacements: ArrayLike<number>): Float64Array {
      const active = checkedComponents(
        activeReferenceDisplacements,
        activeReferenceComponents.length,
        "truss.referenceDisplacements",
      );
      const reference = new Float64Array(12);
      for (let index = 0; index < activeReferenceComponents.length; index += 1) {
        reference[activeReferenceComponents[index]!] = active[index]!;
      }
      const start = transferRigidBodyDisplacement(reference.subarray(0, 6), startOffset);
      const end = transferRigidBodyDisplacement(reference.subarray(6, 12), endOffset);
      return finiteFloat64Array(
        [start[0], start[1], start[2], end[0], end[1], end[2]],
        "truss.elasticTranslations",
      );
    },
    referenceActions(elasticEndForces: ArrayLike<number>): Float64Array {
      const elastic = checkedComponents(elasticEndForces, 6, "truss.elasticEndForces");
      const start = transferRigidEndpointForceToNode(
        [elastic[0], elastic[1], elastic[2], 0, 0, 0],
        startOffset,
      );
      const end = transferRigidEndpointForceToNode(
        [elastic[3], elastic[4], elastic[5], 0, 0, 0],
        endOffset,
      );
      const reference = new Float64Array(12);
      reference.set(start, 0);
      reference.set(end, 6);
      return gather(reference, activeReferenceComponents);
    },
  });
}
