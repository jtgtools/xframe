import { parseIdentifier } from "../model/identifier.js";
import type { DistributedLoadInput, DistributedLoadRecord, MemberSpan } from "./load-types.js";
import {
  coordinateSystem,
  exactObjectKeys,
  finite,
  loadError,
  nonzero,
  vector3,
} from "./load-validation.js";

const ALLOWED = new Set([
  "kind",
  "frameId",
  "coordinateSystem",
  "startDistanceFromElasticStart",
  "endDistanceFromElasticStart",
  "startPositionRatio",
  "endPositionRatio",
  "startIntensity",
  "endIntensity",
]);

function span(input: DistributedLoadInput): MemberSpan {
  const distanceCount =
    Number(input.startDistanceFromElasticStart !== undefined) +
    Number(input.endDistanceFromElasticStart !== undefined);
  const ratioCount =
    Number(input.startPositionRatio !== undefined) + Number(input.endPositionRatio !== undefined);
  if (distanceCount === 0 && ratioCount === 0) return Object.freeze({ kind: "full" });
  if (distanceCount > 0 && ratioCount > 0)
    loadError("load", "distance span or ratio span, not both", "mixed coordinate fields");
  if (distanceCount > 0) {
    if (distanceCount !== 2)
      loadError(
        "load",
        "both startDistanceFromElasticStart and endDistanceFromElasticStart",
        distanceCount,
      );
    const start = finite(input.startDistanceFromElasticStart, "load.startDistanceFromElasticStart");
    const end = finite(input.endDistanceFromElasticStart, "load.endDistanceFromElasticStart");
    if (start < 0 || end <= start)
      loadError(
        "load",
        "0 <= startDistanceFromElasticStart < endDistanceFromElasticStart",
        `${start},${end}`,
      );
    return Object.freeze({
      kind: "distance",
      startDistanceFromElasticStart: start,
      endDistanceFromElasticStart: end,
    });
  }
  if (ratioCount !== 2)
    loadError("load", "both startPositionRatio and endPositionRatio", ratioCount);
  const start = finite(input.startPositionRatio, "load.startPositionRatio");
  const end = finite(input.endPositionRatio, "load.endPositionRatio");
  if (start < 0 || end > 1 || end <= start)
    loadError("load", "0 <= startPositionRatio < endPositionRatio <= 1", `${start},${end}`);
  return Object.freeze({ kind: "ratio", startPositionRatio: start, endPositionRatio: end });
}

export function createDistributedLoad(input: DistributedLoadInput): DistributedLoadRecord {
  exactObjectKeys(input, ALLOWED, "load");
  if (input.kind !== "member-distributed") loadError("load.kind", "member-distributed", input.kind);
  const startIntensity = vector3(input.startIntensity, "load.startIntensity");
  const endIntensity = vector3(input.endIntensity, "load.endIntensity");
  if (!nonzero(startIntensity) && !nonzero(endIntensity))
    loadError("load", "at least one nonzero distributed intensity", "all zero");
  return Object.freeze({
    kind: input.kind,
    frameId: parseIdentifier(input.frameId, "load.frameId"),
    coordinateSystem: coordinateSystem(input.coordinateSystem, "load.coordinateSystem"),
    span: span(input),
    startIntensity,
    endIntensity,
  });
}
