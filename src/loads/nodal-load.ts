import { parseIdentifier } from "../model/identifier.js";
import type { NodalLoadInput, NodalLoadRecord } from "./load-types.js";
import { exactObjectKeys, loadError, nonzero, vector3 } from "./load-validation.js";

const ALLOWED = new Set(["kind", "nodeId", "force", "moment"]);

export function createNodalLoad(input: NodalLoadInput): NodalLoadRecord {
  exactObjectKeys(input, ALLOWED, "load");
  if (input.kind !== "nodal") loadError("load.kind", "nodal", input.kind);
  const force = input.force === undefined ? undefined : vector3(input.force, "load.force");
  const moment = input.moment === undefined ? undefined : vector3(input.moment, "load.moment");
  if ((force === undefined || !nonzero(force)) && (moment === undefined || !nonzero(moment))) {
    loadError("load", "at least one nonzero force or moment component", "all zero or omitted");
  }
  return Object.freeze({
    kind: "nodal",
    nodeId: parseIdentifier(input.nodeId, "load.nodeId"),
    ...(force === undefined ? {} : { force }),
    ...(moment === undefined ? {} : { moment }),
  });
}
