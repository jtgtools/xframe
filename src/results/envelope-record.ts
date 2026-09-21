import { XFrameError } from "../errors/xframe-error.js";
import { isDofName } from "../model/dof-key.js";
import type { DofName } from "../model/domain-records.js";
import { createEnvelopeCompatibility } from "./stream-envelope.js";
import type { EnvelopeComponent, EnvelopeInputRecord, StructuralResult } from "./result-types.js";

const DOF_ORDER: readonly DofName[] = ["ux", "uy", "uz", "rx", "ry", "rz"];

function incompatible(resultId: string, reason: string): never {
  throw new XFrameError("RESULT_INCOMPATIBLE", "Cannot resolve an envelope value.", {
    kind: "result",
    resultIds: Object.freeze([resultId]),
    reason,
  });
}

function finite(resultId: string, value: number, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new XFrameError("RESULT_INCOMPATIBLE", "Cannot resolve an envelope value.", {
      kind: "result",
      resultIds: Object.freeze([resultId]),
      reason: `non-finite value for ${label}`,
    });
  }
  return Object.is(value, -0) ? 0 : value;
}

function splitPrefix(component: string, prefix: string): DofName | undefined {
  if (!component.startsWith(prefix)) return undefined;
  const dof = component.slice(prefix.length);
  return isDofName(dof) ? dof : undefined;
}

function nodalValue(
  result: StructuralResult,
  field: "displacements" | "reactions",
  entityId: string,
  dof: DofName,
): number {
  const node = result.nodes.find((entry) => entry.id === entityId);
  if (node === undefined) incompatible(result.id, "missing entity");
  const match = node!.displacements.find((entry) => entry.dof === dof);
  if (field === "displacements") {
    if (match === undefined) incompatible(result.id, "missing degree of freedom");
    return finite(result.id, match!.value, `${entityId}.${dof}`);
  }
  const reaction = node!.reactions.find((entry) => entry.dof === dof);
  if (reaction === undefined) incompatible(result.id, "missing degree of freedom");
  return finite(result.id, reaction.value, `${entityId}.${dof}`);
}

function resolveValue(result: StructuralResult, component: EnvelopeComponent): number {
  if (component.location !== undefined) {
    incompatible(result.id, "component location is not supported");
  }
  const name = component.component;
  if (isDofName(name)) return nodalValue(result, "displacements", component.entityId, name);
  const reactionDof = splitPrefix(name, "reaction.");
  if (reactionDof !== undefined)
    return nodalValue(result, "reactions", component.entityId, reactionDof);
  if (name === "axialForce") {
    const truss = result.trusses.find((entry) => entry.id === component.entityId);
    if (truss === undefined) incompatible(result.id, "missing entity");
    return finite(result.id, truss!.axialForce, `${component.entityId}.axialForce`);
  }
  const forceDof = splitPrefix(name, "force.");
  if (forceDof !== undefined) {
    const spring = result.springs.find((entry) => entry.id === component.entityId);
    if (spring === undefined) incompatible(result.id, "missing entity");
    if (!spring!.grounded || spring!.globalEndForces.length !== DOF_ORDER.length) {
      incompatible(result.id, "two-node spring forces need an explicit end");
    }
    const value = spring!.globalEndForces[DOF_ORDER.indexOf(forceDof)]!;
    if (value === undefined) incompatible(result.id, "missing degree of freedom");
    return finite(result.id, value, `${component.entityId}.${forceDof}`);
  }
  incompatible(result.id, "unknown envelope component");
}

/**
 * Builds a complete streaming-envelope record from a solved result: strict
 * compatibility metadata plus values extracted in component order.
 *
 * Resolved vocabulary: nodal displacements (`ux`…`rz`), nodal reactions
 * (`reaction.ux`…), truss `axialForce`, and grounded-spring end forces
 * (`force.ux`…). Anything else — including located frame-station components
 * and two-node spring forces — fails with `RESULT_INCOMPATIBLE`.
 */
export function envelopeRecord(
  result: StructuralResult,
  components: readonly EnvelopeComponent[],
): EnvelopeInputRecord {
  const compatibility = createEnvelopeCompatibility(result, components);
  const values = Object.freeze(components.map((component) => resolveValue(result, component)));
  return Object.freeze({
    resultId: result.id,
    resultKind: result.kind,
    compatibility,
    values,
  });
}
