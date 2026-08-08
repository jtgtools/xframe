import { parseIdentifier } from "../model/identifier.js";
import type { MemberLocation, MemberPointLoadInput, MemberPointLoadRecord } from "./load-types.js";
import {
  coordinateSystem,
  exactObjectKeys,
  finite,
  loadError,
  nonzero,
  vector3,
} from "./load-validation.js";

const FORCE_KEYS = new Set([
  "kind",
  "frameId",
  "coordinateSystem",
  "distanceFromElasticStart",
  "positionRatio",
  "force",
]);
const MOMENT_KEYS = new Set([
  "kind",
  "frameId",
  "coordinateSystem",
  "distanceFromElasticStart",
  "positionRatio",
  "moment",
]);

function location(input: MemberPointLoadInput): MemberLocation {
  const hasDistance = input.distanceFromElasticStart !== undefined;
  const hasRatio = input.positionRatio !== undefined;
  if (hasDistance === hasRatio)
    loadError(
      "load",
      "exactly one of distanceFromElasticStart or positionRatio",
      `${hasDistance},${hasRatio}`,
    );
  if (hasDistance) {
    const distance = finite(input.distanceFromElasticStart, "load.distanceFromElasticStart");
    if (distance < 0)
      loadError("load.distanceFromElasticStart", "nonnegative physical distance", distance);
    return Object.freeze({ kind: "distance", distanceFromElasticStart: distance });
  }
  const ratio = finite(input.positionRatio, "load.positionRatio");
  if (ratio < 0 || ratio > 1) loadError("load.positionRatio", "ratio in [0,1]", ratio);
  return Object.freeze({ kind: "ratio", positionRatio: ratio });
}

export function createMemberPointLoad(input: MemberPointLoadInput): MemberPointLoadRecord {
  if (input.kind === "member-point-force") {
    exactObjectKeys(input, FORCE_KEYS, "load");
    const force = vector3(input.force, "load.force");
    if (!nonzero(force)) loadError("load.force", "at least one nonzero component", force.join(","));
    return Object.freeze({
      kind: input.kind,
      frameId: parseIdentifier(input.frameId, "load.frameId"),
      coordinateSystem: coordinateSystem(input.coordinateSystem, "load.coordinateSystem"),
      location: location(input),
      force,
    });
  }
  if (input.kind === "member-point-moment") {
    exactObjectKeys(input, MOMENT_KEYS, "load");
    const moment = vector3(input.moment, "load.moment");
    if (!nonzero(moment))
      loadError("load.moment", "at least one nonzero component", moment.join(","));
    return Object.freeze({
      kind: input.kind,
      frameId: parseIdentifier(input.frameId, "load.frameId"),
      coordinateSystem: coordinateSystem(input.coordinateSystem, "load.coordinateSystem"),
      location: location(input),
      moment,
    });
  }
  loadError(
    "load.kind",
    "member-point-force or member-point-moment",
    (input as { readonly kind?: unknown }).kind,
  );
}
