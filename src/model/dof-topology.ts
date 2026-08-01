import { XFrameError } from "../errors/xframe-error.js";
import type { ConstraintRecord, DofName, ModelSnapshot } from "./domain-records.js";
import { createDofKey, DOF_NAMES, TRANSLATIONAL_DOF_NAMES, type DofKey } from "./dof-key.js";
import { compareIdentifiers, type EntityId } from "./identifier.js";

const DOF_ORDER = new Map<DofName, number>(DOF_NAMES.map((dof, index) => [dof, index]));

export interface PhysicalDofMetadata {
  readonly key: DofKey;
  readonly nodeId: EntityId;
  readonly dof: DofName;
  readonly physicalIndex: number;
  readonly requestedBy: readonly string[];
}

export class PhysicalDofTable implements Iterable<readonly [DofKey, PhysicalDofMetadata]> {
  readonly #byKey: Map<DofKey, PhysicalDofMetadata>;
  readonly #keysByIndex: readonly DofKey[];

  public constructor(entries: readonly PhysicalDofMetadata[]) {
    this.#byKey = new Map(entries.map((entry) => [entry.key, entry]));
    this.#keysByIndex = Object.freeze(entries.map(({ key }) => key));
    Object.freeze(this);
  }

  public get size(): number {
    return this.#keysByIndex.length;
  }

  public get(key: DofKey): PhysicalDofMetadata | undefined {
    return this.#byKey.get(key);
  }

  public has(key: DofKey): boolean {
    return this.#byKey.has(key);
  }

  public keyByPhysicalIndex(index: number): DofKey | undefined {
    return this.#keysByIndex[index];
  }

  public keys(): IterableIterator<DofKey> {
    return this.#byKey.keys();
  }

  public values(): IterableIterator<PhysicalDofMetadata> {
    return this.#byKey.values();
  }

  public entries(): IterableIterator<[DofKey, PhysicalDofMetadata]> {
    return this.#byKey.entries();
  }

  public [Symbol.iterator](): IterableIterator<[DofKey, PhysicalDofMetadata]> {
    return this.entries();
  }
}

function request(
  requests: Map<
    DofKey,
    { readonly nodeId: EntityId; readonly dof: DofName; readonly sources: Set<string> }
  >,
  nodeId: EntityId,
  dof: DofName,
  source: string,
): void {
  const key = createDofKey(nodeId, dof);
  const existing = requests.get(key);
  if (existing === undefined) {
    requests.set(key, { nodeId, dof, sources: new Set([source]) });
  } else {
    existing.sources.add(source);
  }
}

function requestComponents(
  requests: Map<
    DofKey,
    { readonly nodeId: EntityId; readonly dof: DofName; readonly sources: Set<string> }
  >,
  nodeId: EntityId,
  dofs: readonly DofName[],
  source: string,
): void {
  for (const dof of dofs) request(requests, nodeId, dof, source);
}

function validateConstraintTargets(
  constraints: readonly ConstraintRecord[],
  table: PhysicalDofTable,
): void {
  for (const constraint of constraints) {
    for (let index = 0; index < constraint.terms.length; index += 1) {
      const term = constraint.terms[index]!;
      if (!table.has(createDofKey(term.nodeId, term.dof))) {
        throw new XFrameError(
          "INPUT_INVALID",
          "Constraint targets a physically unavailable degree of freedom.",
          {
            kind: "input",
            path: `constraints[${constraint.id}].terms[${index}]`,
            expected: "physically available DOF",
            actual: `${term.nodeId}.${term.dof}`,
          },
        );
      }
    }
  }
}

export function derivePhysicalDofTopology(model: ModelSnapshot): PhysicalDofTable {
  const requests = new Map<
    DofKey,
    { readonly nodeId: EntityId; readonly dof: DofName; readonly sources: Set<string> }
  >();

  for (const frame of model.frames) {
    requestComponents(requests, frame.startNodeId, DOF_NAMES, `frame:${frame.id}`);
    requestComponents(requests, frame.endNodeId, DOF_NAMES, `frame:${frame.id}`);
  }
  for (const truss of model.trusses) {
    requestComponents(requests, truss.startNodeId, TRANSLATIONAL_DOF_NAMES, `truss:${truss.id}`);
    requestComponents(requests, truss.endNodeId, TRANSLATIONAL_DOF_NAMES, `truss:${truss.id}`);
  }
  for (const spring of model.springs) {
    for (let component = 0; component < DOF_NAMES.length; component += 1) {
      if (spring.stiffness[component]! <= 0) continue;
      const dof = DOF_NAMES[component]!;
      request(requests, spring.startNodeId, dof, `spring:${spring.id}`);
      if (spring.endNodeId !== undefined)
        request(requests, spring.endNodeId, dof, `spring:${spring.id}`);
    }
  }

  const ordered = [...requests.values()].toSorted((left, right) => {
    const nodeOrder = compareIdentifiers(left.nodeId, right.nodeId);
    return nodeOrder === 0 ? DOF_ORDER.get(left.dof)! - DOF_ORDER.get(right.dof)! : nodeOrder;
  });
  const entries = ordered.map(
    (entry, physicalIndex): PhysicalDofMetadata =>
      Object.freeze({
        key: createDofKey(entry.nodeId, entry.dof),
        nodeId: entry.nodeId,
        dof: entry.dof,
        physicalIndex,
        requestedBy: Object.freeze([...entry.sources].toSorted()),
      }),
  );
  const table = new PhysicalDofTable(Object.freeze(entries));
  validateConstraintTargets(model.constraints, table);
  return table;
}
