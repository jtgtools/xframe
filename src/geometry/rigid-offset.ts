import { XFrameError } from "../errors/xframe-error.js";
import { finiteFloat64Array } from "./finite.js";
import { GEOMETRY_COMPARISON_TOLERANCE, isScaledZero } from "./tolerance.js";
import {
  addVector3,
  createVector3,
  crossVector3,
  dotVector3,
  normVector3,
  subtractVector3,
  type Vector3,
} from "./vector-3.js";

const ZERO_OFFSET = [0, 0, 0] as const;

export interface ElasticGeometry {
  readonly referenceStart: Vector3;
  readonly referenceEnd: Vector3;
  readonly startOffset: Vector3;
  readonly endOffset: Vector3;
  readonly elasticStart: Vector3;
  readonly elasticEnd: Vector3;
  readonly referenceLength: number;
  readonly elasticLength: number;
}

function geometryError(
  path: string,
  reason: string,
  value?: number,
  referenceScale?: number,
): never {
  throw new XFrameError("GEOMETRY_INVALID", "Rigid-offset geometry is invalid.", {
    kind: "geometry",
    path,
    reason,
    ...(value === undefined ? {} : { value: String(value) }),
    ...(referenceScale === undefined ? {} : { referenceScale }),
  });
}

export function resolveElasticGeometry(
  nodeIInput: ArrayLike<unknown>,
  nodeJInput: ArrayLike<unknown>,
  offsetIInput: ArrayLike<unknown> = ZERO_OFFSET,
  offsetJInput: ArrayLike<unknown> = ZERO_OFFSET,
): ElasticGeometry {
  const referenceStart = createVector3(nodeIInput, "nodeI");
  const referenceEnd = createVector3(nodeJInput, "nodeJ");
  const startOffset = createVector3(offsetIInput, "offsetI");
  const endOffset = createVector3(offsetJInput, "offsetJ");
  const referenceDelta = subtractVector3(referenceEnd, referenceStart);
  const referenceLength = normVector3(referenceDelta);
  const referenceScale = Math.max(
    normVector3(referenceStart),
    normVector3(referenceEnd),
    referenceLength,
  );
  if (
    referenceLength === 0 ||
    isScaledZero(referenceLength, referenceScale, GEOMETRY_COMPARISON_TOLERANCE)
  ) {
    geometryError(
      "nodeJ",
      "reference span is zero or unresolved at the coordinate scale",
      referenceLength,
      referenceScale,
    );
  }

  const elasticStart = addVector3(referenceStart, startOffset);
  const elasticEnd = addVector3(referenceEnd, endOffset);
  const elasticDelta = subtractVector3(elasticEnd, elasticStart);
  const elasticLength = normVector3(elasticDelta);
  const elasticScale = Math.max(
    normVector3(elasticStart),
    normVector3(elasticEnd),
    referenceLength,
    elasticLength,
  );
  if (
    elasticLength === 0 ||
    isScaledZero(elasticLength, elasticScale, GEOMETRY_COMPARISON_TOLERANCE)
  ) {
    geometryError(
      "offsets",
      "elastic span is zero or unresolved at the coordinate scale",
      elasticLength,
      elasticScale,
    );
  }

  const referenceAxis = createVector3([
    referenceDelta[0]! / referenceLength,
    referenceDelta[1]! / referenceLength,
    referenceDelta[2]! / referenceLength,
  ]);
  const forwardProjection = dotVector3(elasticDelta, referenceAxis);
  if (
    forwardProjection <= 0 ||
    isScaledZero(forwardProjection, referenceLength, GEOMETRY_COMPARISON_TOLERANCE)
  ) {
    geometryError(
      "offsets",
      "elastic endpoints overlap or reverse the reference connectivity",
      forwardProjection,
      referenceLength,
    );
  }

  return Object.freeze({
    referenceStart,
    referenceEnd,
    startOffset,
    endOffset,
    elasticStart,
    elasticEnd,
    referenceLength,
    elasticLength,
  });
}

function sixComponents(value: ArrayLike<unknown>, path: string): Float64Array {
  if (value.length !== 6) {
    throw new XFrameError("GEOMETRY_INVALID", `Expected six rigid-body components at ${path}.`, {
      kind: "geometry",
      path,
      reason: "rigid-body vector must contain three translations and three rotations or moments",
      value: String(value.length),
    });
  }
  return finiteFloat64Array(value, path);
}

export function transferRigidBodyDisplacement(
  nodalDisplacementInput: ArrayLike<unknown>,
  offsetInput: ArrayLike<unknown>,
): Float64Array {
  const nodal = sixComponents(nodalDisplacementInput, "nodalDisplacement");
  const offset = createVector3(offsetInput, "offset");
  const translation = createVector3(nodal.subarray(0, 3));
  const rotation = createVector3(nodal.subarray(3, 6));
  const endpointTranslation = addVector3(translation, crossVector3(rotation, offset));
  return finiteFloat64Array(
    [
      endpointTranslation[0],
      endpointTranslation[1],
      endpointTranslation[2],
      rotation[0],
      rotation[1],
      rotation[2],
    ],
    "endpointDisplacement",
  );
}

export function transferRigidEndpointForceToNode(
  endpointActionInput: ArrayLike<unknown>,
  offsetInput: ArrayLike<unknown>,
): Float64Array {
  const endpoint = sixComponents(endpointActionInput, "endpointAction");
  const offset = createVector3(offsetInput, "offset");
  const force = createVector3(endpoint.subarray(0, 3));
  const moment = createVector3(endpoint.subarray(3, 6));
  const nodalMoment = addVector3(moment, crossVector3(offset, force));
  return finiteFloat64Array(
    [force[0], force[1], force[2], nodalMoment[0], nodalMoment[1], nodalMoment[2]],
    "nodalAction",
  );
}
