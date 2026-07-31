import { parseUnitSystem, type UnitSystem } from "../units/unit-system.js";
import {
  createCombinationRecord,
  createConstraintRecord,
  createFrameRecord,
  createFrameSectionRecord,
  createLoadCaseRecord,
  createMaterialRecord,
  createNodeRecord,
  createSpringRecord,
  createTrussRecord,
  createTrussSectionRecord,
  type CombinationInput,
  type CombinationRecord,
  type ConstraintInput,
  type ConstraintRecord,
  type FrameInput,
  type FrameRecord,
  type FrameSectionInput,
  type FrameSectionRecord,
  type LoadCaseInput,
  type LoadCaseRecord,
  type MaterialInput,
  type MaterialRecord,
  type ModelSnapshot,
  type NodeInput,
  type NodeRecord,
  type SpringInput,
  type SpringRecord,
  type TrussInput,
  type TrussRecord,
  type TrussSectionInput,
  type TrussSectionRecord,
} from "./domain-records.js";
import { XFrameError } from "../errors/xframe-error.js";
import type { FinalizedModel } from "./finalized-model.js";
import { parseIdentifier, type EntityId } from "./identifier.js";
import { finalizeModel } from "./model-finalizer.js";
import { Registry } from "./registry.js";

export interface RigidDiaphragmInput {
  readonly id: unknown;
  readonly plane: "xy" | "yz" | "zx";
  readonly masterNodeId: unknown;
  readonly slaveNodeIds: readonly unknown[];
}

export interface ModelBatchInput {
  readonly unitSystem?: unknown;
  readonly nodes?: readonly NodeInput[];
  readonly materials?: readonly MaterialInput[];
  readonly frameSections?: readonly FrameSectionInput[];
  readonly trussSections?: readonly TrussSectionInput[];
  readonly frames?: readonly FrameInput[];
  readonly trusses?: readonly TrussInput[];
  readonly springs?: readonly SpringInput[];
  readonly constraints?: readonly ConstraintInput[];
  readonly loadCases?: readonly LoadCaseInput[];
  readonly combinations?: readonly CombinationInput[];
}

export interface ModelBuilder {
  setUnitSystem(input: unknown): ModelBuilder;
  addNode(input: NodeInput): ModelBuilder;
  addMaterial(input: MaterialInput): ModelBuilder;
  addFrameSection(input: FrameSectionInput): ModelBuilder;
  addTrussSection(input: TrussSectionInput): ModelBuilder;
  addFrame(input: FrameInput): ModelBuilder;
  addTruss(input: TrussInput): ModelBuilder;
  addSpring(input: SpringInput): ModelBuilder;
  addConstraint(input: ConstraintInput): ModelBuilder;
  addRigidDiaphragm(input: RigidDiaphragmInput): ModelBuilder;
  addLoadCase(input: LoadCaseInput): ModelBuilder;
  addCombination(input: CombinationInput): ModelBuilder;
  addBatch(input: ModelBatchInput): ModelBuilder;
  snapshot(): ModelSnapshot;
  finalize(): FinalizedModel;
}

class DefaultModelBuilder implements ModelBuilder {
  #unitSystem: UnitSystem | undefined;
  #nodes = new Registry<NodeRecord>("node");
  #materials = new Registry<MaterialRecord>("material");
  #frameSections = new Registry<FrameSectionRecord>("frame section");
  #trussSections = new Registry<TrussSectionRecord>("truss section");
  #frames = new Registry<FrameRecord>("frame");
  #trusses = new Registry<TrussRecord>("truss");
  #springs = new Registry<SpringRecord>("spring");
  #constraints = new Registry<ConstraintRecord>("constraint");
  #loadCases = new Registry<LoadCaseRecord>("load case");
  #combinations = new Registry<CombinationRecord>("combination");


  public setUnitSystem(input: unknown): this {
    this.#unitSystem = parseUnitSystem(input);
    return this;
  }

  public addNode(input: NodeInput): this {
    this.#nodes.add(createNodeRecord(input));
    return this;
  }

  public addMaterial(input: MaterialInput): this {
    this.#materials.add(createMaterialRecord(input));
    return this;
  }

  public addFrameSection(input: FrameSectionInput): this {
    this.#frameSections.add(createFrameSectionRecord(input));
    return this;
  }

  public addTrussSection(input: TrussSectionInput): this {
    this.#trussSections.add(createTrussSectionRecord(input));
    return this;
  }

  public addFrame(input: FrameInput): this {
    this.#frames.add(createFrameRecord(input));
    return this;
  }

  public addTruss(input: TrussInput): this {
    this.#trusses.add(createTrussRecord(input));
    return this;
  }

  public addSpring(input: SpringInput): this {
    this.#springs.add(createSpringRecord(input));
    return this;
  }

  public addConstraint(input: ConstraintInput): this {
    this.#constraints.add(createConstraintRecord(input));
    return this;
  }

  public addRigidDiaphragm(input: RigidDiaphragmInput): this {
    const draft = this.#clone();
    const diaphragmId = parseIdentifier(input.id, "rigidDiaphragm.id");
    const masterNodeId = parseIdentifier(input.masterNodeId, "rigidDiaphragm.masterNodeId");
    const master = draft.#nodes.get(masterNodeId);
    if (master === undefined) throw missingDiaphragmNode(masterNodeId, "rigidDiaphragm.masterNodeId");
    const seen = new Set<EntityId>();
    for (let index = 0; index < input.slaveNodeIds.length; index += 1) {
      const slaveNodeId = parseIdentifier(input.slaveNodeIds[index], `rigidDiaphragm.slaveNodeIds[${index}]`);
      if (slaveNodeId === masterNodeId || seen.has(slaveNodeId)) {
        throw new XFrameError("INPUT_INVALID", "Rigid diaphragm slave nodes must be unique and different from the master.", {
          kind: "input",
          path: `rigidDiaphragm.slaveNodeIds[${index}]`,
          expected: "unique node other than master",
          actual: slaveNodeId,
        });
      }
      seen.add(slaveNodeId);
      const slave = draft.#nodes.get(slaveNodeId);
      if (slave === undefined) throw missingDiaphragmNode(slaveNodeId, `rigidDiaphragm.slaveNodeIds[${index}]`);
      for (const constraint of diaphragmConstraints(diaphragmId, input.plane, master, slave)) draft.addConstraint(constraint);
    }
    this.#replaceWith(draft);
    return this;
  }

  public addLoadCase(input: LoadCaseInput): this {
    this.#loadCases.add(createLoadCaseRecord(input));
    return this;
  }

  public addCombination(input: CombinationInput): this {
    this.#combinations.add(createCombinationRecord(input));
    return this;
  }

  public addBatch(input: ModelBatchInput): this {
    const draft = this.#clone();
    if (input.unitSystem !== undefined) draft.setUnitSystem(input.unitSystem);
    for (const value of input.nodes ?? []) draft.addNode(value);
    for (const value of input.materials ?? []) draft.addMaterial(value);
    for (const value of input.frameSections ?? []) draft.addFrameSection(value);
    for (const value of input.trussSections ?? []) draft.addTrussSection(value);
    for (const value of input.frames ?? []) draft.addFrame(value);
    for (const value of input.trusses ?? []) draft.addTruss(value);
    for (const value of input.springs ?? []) draft.addSpring(value);
    for (const value of input.constraints ?? []) draft.addConstraint(value);
    for (const value of input.loadCases ?? []) draft.addLoadCase(value);
    for (const value of input.combinations ?? []) draft.addCombination(value);
    this.#replaceWith(draft);
    return this;
  }

  public snapshot(): ModelSnapshot {
    return Object.freeze({
      ...(this.#unitSystem === undefined ? {} : { unitSystem: this.#unitSystem }),
      nodes: this.#nodes.values(),
      materials: this.#materials.values(),
      frameSections: this.#frameSections.values(),
      trussSections: this.#trussSections.values(),
      frames: this.#frames.values(),
      trusses: this.#trusses.values(),
      springs: this.#springs.values(),
      constraints: this.#constraints.values(),
      loadCases: this.#loadCases.values(),
      combinations: this.#combinations.values(),
    });
  }

  public finalize(): FinalizedModel {
    return finalizeModel(this.snapshot());
  }

  #clone(): DefaultModelBuilder {
    const copy = new DefaultModelBuilder();
    copy.#unitSystem = this.#unitSystem;
    copy.#nodes = this.#nodes.clone();
    copy.#materials = this.#materials.clone();
    copy.#frameSections = this.#frameSections.clone();
    copy.#trussSections = this.#trussSections.clone();
    copy.#frames = this.#frames.clone();
    copy.#trusses = this.#trusses.clone();
    copy.#springs = this.#springs.clone();
    copy.#constraints = this.#constraints.clone();
    copy.#loadCases = this.#loadCases.clone();
    copy.#combinations = this.#combinations.clone();
    return copy;
  }

  #replaceWith(source: DefaultModelBuilder): void {
    this.#unitSystem = source.#unitSystem;
    this.#nodes = source.#nodes;
    this.#materials = source.#materials;
    this.#frameSections = source.#frameSections;
    this.#trussSections = source.#trussSections;
    this.#frames = source.#frames;
    this.#trusses = source.#trusses;
    this.#springs = source.#springs;
    this.#constraints = source.#constraints;
    this.#loadCases = source.#loadCases;
    this.#combinations = source.#combinations;
  }
}

function missingDiaphragmNode(id: EntityId, path: string): XFrameError {
  return new XFrameError("REFERENCE_NOT_FOUND", "Rigid diaphragm references a missing node.", {
    kind: "reference",
    issues: Object.freeze([{ entityType: "rigid diaphragm", id, path, referencedId: id, expectedType: "node" }]),
  });
}

function diaphragmConstraints(
  id: EntityId,
  plane: RigidDiaphragmInput["plane"],
  master: NodeRecord,
  slave: NodeRecord,
): readonly ConstraintInput[] {
  const [dx, dy, dz] = slave.coordinates.map((value, index) => value - master.coordinates[index]!) as [number, number, number];
  const definitions = plane === "xy"
    ? [["tx", "rz", dy], ["ty", "rz", -dx]] as const
    : plane === "yz"
      ? [["ty", "rx", dz], ["tz", "rx", -dy]] as const
      : [["tx", "ry", -dz], ["tz", "ry", dx]] as const;
  return Object.freeze(definitions.map(([translation, rotation, arm]) => Object.freeze({
    id: `${id}:${slave.id}:${translation}`,
    terms: Object.freeze([
      Object.freeze({ nodeId: slave.id, dof: translation, coefficient: 1 }),
      Object.freeze({ nodeId: master.id, dof: translation, coefficient: -1 }),
      Object.freeze({ nodeId: master.id, dof: rotation, coefficient: arm }),
    ]),
    rightHandSide: 0,
  })));
}

export function createModelBuilder(): ModelBuilder {
  return new DefaultModelBuilder();
}
