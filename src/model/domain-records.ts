import { XFrameError } from "../errors/xframe-error.js";
import { createFrameElement } from "../elements/frame-element.js";
import { createSpringElement } from "../elements/spring-element.js";
import { createTrussElement } from "../elements/truss-element.js";
import { finiteNumber } from "../geometry/finite.js";
import { createIsotropicMaterial } from "../materials/isotropic-material.js";
import { createLoadCase } from "../loads/load-case.js";
import { createLoadCombination } from "../loads/load-combination.js";
import type { LoadInput, LoadRecord } from "../loads/load-types.js";
import { createFrameSection } from "../sections/frame-section.js";
import { createTrussSection } from "../sections/truss-section.js";
import type { UnitSystem } from "../units/unit-system.js";
import { parseDofName } from "./dof-key.js";
import { parseIdentifier, type EntityId } from "./identifier.js";

export type Vector3Input = readonly [number, number, number] | readonly number[];
export type DofName = "ux" | "uy" | "uz" | "rx" | "ry" | "rz";

export interface NodeInput {
  readonly id: unknown;
  readonly coordinates: Vector3Input;
}

export interface MaterialInput {
  readonly id: unknown;
  readonly elasticModulus?: number;
  readonly shearModulus?: number;
  readonly poissonRatio?: number;
  readonly density?: number;
}

export interface FrameSectionInput {
  readonly id: unknown;
  readonly area: number;
  readonly torsionalConstant: number;
  readonly momentOfInertiaY: number;
  readonly momentOfInertiaZ: number;
  readonly shearAreaY?: number;
  readonly shearAreaZ?: number;
}

export interface TrussSectionInput {
  readonly id: unknown;
  readonly area: number;
}

export type FrameTheoryInput =
  | { readonly kind: "euler-bernoulli" }
  | { readonly kind: "timoshenko" };

export interface FrameReleaseInput {
  readonly start?: readonly DofName[];
  readonly end?: readonly DofName[];
}

export interface RigidOffsetInput {
  readonly start?: Vector3Input;
  readonly end?: Vector3Input;
}

export interface FrameInput {
  readonly id: unknown;
  readonly startNodeId: unknown;
  readonly endNodeId: unknown;
  readonly materialId: unknown;
  readonly sectionId: unknown;
  readonly theory: FrameTheoryInput;
  readonly orientation?: Vector3Input;
  readonly releases?: FrameReleaseInput;
  readonly rigidOffsets?: RigidOffsetInput;
}

export interface TrussInput {
  readonly id: unknown;
  readonly startNodeId: unknown;
  readonly endNodeId: unknown;
  readonly materialId: unknown;
  readonly sectionId: unknown;
  readonly rigidOffsets?: RigidOffsetInput;
}

export type SpringStiffnessInput = readonly number[] | Readonly<Partial<Record<DofName, number>>>;

export interface SpringInput {
  readonly id: unknown;
  readonly startNodeId: unknown;
  readonly endNodeId?: unknown;
  readonly stiffness: SpringStiffnessInput;
}

export interface ConstraintTermInput {
  readonly nodeId: unknown;
  readonly dof: DofName;
  readonly coefficient: number;
}

export interface ConstraintInput {
  readonly id: unknown;
  readonly terms: readonly ConstraintTermInput[];
  readonly rightHandSide: number;
}

export interface LoadCaseInput {
  readonly id: unknown;
  readonly loads?: readonly LoadInput[];
}

export interface CombinationFactorInput {
  readonly resultId: unknown;
  readonly factor: number;
}

export interface CombinationInput {
  readonly id: unknown;
  readonly factors: readonly CombinationFactorInput[];
}

export interface NodeRecord {
  readonly id: EntityId;
  readonly coordinates: readonly [number, number, number];
}

export interface MaterialRecord {
  readonly id: EntityId;
  readonly elasticModulus: number;
  readonly shearModulus: number;
  readonly poissonRatio: number;
  readonly density?: number;
}

export interface FrameSectionRecord {
  readonly id: EntityId;
  readonly area: number;
  readonly torsionalConstant: number;
  readonly momentOfInertiaY: number;
  readonly momentOfInertiaZ: number;
  readonly shearAreaY?: number;
  readonly shearAreaZ?: number;
}

export interface TrussSectionRecord {
  readonly id: EntityId;
  readonly area: number;
}

export interface FrameRecord {
  readonly id: EntityId;
  readonly startNodeId: EntityId;
  readonly endNodeId: EntityId;
  readonly materialId: EntityId;
  readonly sectionId: EntityId;
  readonly theory: FrameTheoryInput;
  readonly orientation?: readonly [number, number, number];
  readonly releases?: FrameReleaseInput;
  readonly rigidOffsets?: RigidOffsetInput;
}

export interface TrussRecord {
  readonly id: EntityId;
  readonly startNodeId: EntityId;
  readonly endNodeId: EntityId;
  readonly materialId: EntityId;
  readonly sectionId: EntityId;
  readonly rigidOffsets?: RigidOffsetInput;
}

export interface SpringRecord {
  readonly id: EntityId;
  readonly startNodeId: EntityId;
  readonly endNodeId?: EntityId;
  readonly stiffness: readonly [number, number, number, number, number, number];
}

export interface ConstraintTermRecord extends Omit<ConstraintTermInput, "nodeId"> {
  readonly nodeId: EntityId;
}

export interface ConstraintRecord extends Omit<ConstraintInput, "id" | "terms"> {
  readonly id: EntityId;
  readonly terms: readonly ConstraintTermRecord[];
}

export interface LoadCaseRecord {
  readonly id: EntityId;
  readonly loads: readonly LoadRecord[];
}

export interface CombinationFactorRecord extends Omit<CombinationFactorInput, "resultId"> {
  readonly resultId: EntityId;
}

export interface CombinationRecord extends Omit<CombinationInput, "id" | "factors"> {
  readonly id: EntityId;
  readonly factors: readonly CombinationFactorRecord[];
}

export interface ModelSnapshot {
  readonly unitSystem?: UnitSystem;
  readonly nodes: readonly NodeRecord[];
  readonly materials: readonly MaterialRecord[];
  readonly frameSections: readonly FrameSectionRecord[];
  readonly trussSections: readonly TrussSectionRecord[];
  readonly frames: readonly FrameRecord[];
  readonly trusses: readonly TrussRecord[];
  readonly springs: readonly SpringRecord[];
  readonly constraints: readonly ConstraintRecord[];
  readonly loadCases: readonly LoadCaseRecord[];
  readonly combinations: readonly CombinationRecord[];
}

export type { FinalizedModel } from "./finalized-model.js";

function deepCopyAndFreeze<T>(value: T): T {
  if (Array.isArray(value)) {
    return Object.freeze(value.map((entry) => deepCopyAndFreeze(entry))) as T;
  }
  if (value !== null && typeof value === "object") {
    const copy: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      Object.defineProperty(copy, key, {
        value: deepCopyAndFreeze(entry),
        enumerable: true,
        configurable: false,
        writable: false,
      });
    }
    return Object.freeze(copy) as T;
  }
  return value;
}

function assertFiniteNumbers(value: unknown, path: string): void {
  if (typeof value === "number") {
    finiteNumber(value, path);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertFiniteNumbers(entry, `${path}[${index}]`));
    return;
  }
  if (value !== null && typeof value === "object") {
    for (const [key, entry] of Object.entries(value)) {
      assertFiniteNumbers(entry, `${path}.${key}`);
    }
  }
}

function inputObject(value: unknown, path: string): Readonly<Record<string, unknown>> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new XFrameError("INPUT_INVALID", `Expected an object at ${path}.`, {
      kind: "input",
      path,
      expected: "object",
      actual: value === null ? "null" : typeof value,
    });
  }
  return value as Readonly<Record<string, unknown>>;
}

function vector3(value: unknown, path: string): readonly [number, number, number] {
  if (!Array.isArray(value) || value.length !== 3) {
    throw new XFrameError("INPUT_INVALID", `Expected a three-component vector at ${path}.`, {
      kind: "input",
      path,
      expected: "array of exactly three finite numbers",
      actual: Array.isArray(value) ? `array(length=${value.length})` : typeof value,
    });
  }
  return Object.freeze([
    finiteNumber(value[0], `${path}[0]`),
    finiteNumber(value[1], `${path}[1]`),
    finiteNumber(value[2], `${path}[2]`),
  ]);
}

function checkedInput<T extends object>(input: T, path: string): T {
  inputObject(input, path);
  assertFiniteNumbers(input, path);
  return input;
}

export function createNodeRecord(input: NodeInput): NodeRecord {
  const record = inputObject(input, "node");
  return Object.freeze({
    id: parseIdentifier(record["id"], "node.id"),
    coordinates: vector3(record["coordinates"], "node.coordinates"),
  });
}

export function createMaterialRecord(input: MaterialInput): MaterialRecord {
  return createIsotropicMaterial(input);
}

export function createFrameSectionRecord(input: FrameSectionInput): FrameSectionRecord {
  return createFrameSection(input);
}

export function createTrussSectionRecord(input: TrussSectionInput): TrussSectionRecord {
  return createTrussSection(input);
}

export function createFrameRecord(input: FrameInput): FrameRecord {
  return createFrameElement(input);
}

export function createTrussRecord(input: TrussInput): TrussRecord {
  return createTrussElement(input);
}

export function createSpringRecord(input: SpringInput): SpringRecord {
  return createSpringElement(input);
}

export function createConstraintRecord(input: ConstraintInput): ConstraintRecord {
  checkedInput(input, "constraint");
  if (!Array.isArray(input.terms)) {
    throw new XFrameError("INPUT_INVALID", "Constraint terms must be an array.", {
      kind: "input",
      path: "constraint.terms",
      expected: "array",
      actual: typeof input.terms,
    });
  }
  const terms = input.terms.map((term, index) =>
    deepCopyAndFreeze({
      ...term,
      nodeId: parseIdentifier(term.nodeId, `constraint.terms[${index}].nodeId`),
      dof: parseDofName(term.dof, `constraint.terms[${index}].dof`),
    }),
  );
  return deepCopyAndFreeze({
    ...input,
    id: parseIdentifier(input.id, "constraint.id"),
    terms,
  });
}

export function createLoadCaseRecord(input: LoadCaseInput): LoadCaseRecord {
  return createLoadCase(input);
}

export function createCombinationRecord(input: CombinationInput): CombinationRecord {
  return createLoadCombination(input);
}
