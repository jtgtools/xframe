import {
  createModelBuilder,
  prepareAnalysis,
  type CaseResult,
  type DofName,
  type FrameTheoryInput,
  type ModelBuilder,
  type UnitSystem,
} from "../../src/index.js";

export const siUnits = Object.freeze({
  version: "1",
  length: "m",
  force: "N",
  moment: "N*m",
  modulus: "Pa",
  distributedForce: "N/m",
  density: "kg/m^3",
  rotation: "rad",
}) satisfies UnitSystem;

export const imperialUnits = Object.freeze({
  version: "1",
  length: "in",
  force: "lbf",
  moment: "lbf*in",
  modulus: "psi",
  distributedForce: "lbf/in",
  density: "slug/in^3",
  rotation: "rad",
}) satisfies UnitSystem;

export const allDofs = ["tx", "ty", "tz", "rx", "ry", "rz"] as const satisfies readonly DofName[];

export interface NamedValue {
  readonly name: string;
  readonly reference: number;
  readonly actual: number;
  readonly units: string;
  readonly absoluteError: number;
  readonly errorPercent: number;
}

export type ReferenceMethod =
  | "closed-form hand calc"
  | "published benchmark table"
  | "commercial software"
  | "self-consistency check"
  | "equivalent-model cross-check";

export type Frame3ddCoverage = "direct" | "matrix-direct" | "overlap-indirect" | "unsupported";

export interface ValidationResult {
  readonly id: string;
  readonly category: number;
  readonly description: string;
  readonly model: string;
  readonly supports: string;
  readonly loads: string;
  readonly referenceMethod: ReferenceMethod;
  readonly values: readonly NamedValue[];
  readonly maxErrorPercent: number;
  readonly tolerancePercent: number;
  readonly toleranceReason: string;
  readonly pass: boolean;
  readonly frame3ddCoverage: Frame3ddCoverage;
  readonly notes?: string;
}

export interface ValidationCase {
  readonly id: string;
  readonly category: number;
  readonly description: string;
  run(): ValidationResult;
}

export interface CaseMetadata {
  readonly id: string;
  readonly category: number;
  readonly description: string;
  readonly model: string;
  readonly supports: string;
  readonly loads: string;
  readonly referenceMethod: ReferenceMethod;
  readonly tolerancePercent?: number;
  readonly toleranceReason?: string;
  readonly frame3ddCoverage?: Frame3ddCoverage;
  readonly notes?: string;
}

export function constrain(
  builder: ModelBuilder,
  nodeId: string,
  dofs: readonly DofName[],
  prefix = `support:${nodeId}`,
): void {
  for (const dof of dofs) {
    builder.addConstraint({
      id: `${prefix}:${dof}`,
      terms: [{ nodeId, dof, coefficient: 1 }],
      rightHandSide: 0,
    });
  }
}

export function affineConstraint(
  builder: ModelBuilder,
  id: string,
  terms: readonly {
    readonly nodeId: string;
    readonly dof: DofName;
    readonly coefficient: number;
  }[],
  rightHandSide = 0,
): void {
  builder.addConstraint({ id, terms, rightHandSide });
}

export function solve(builder: ModelBuilder, caseId = "LC"): CaseResult {
  return prepareAnalysis(builder.finalize()).solveCase(caseId);
}

export function displacement(caseResult: CaseResult, nodeId: string, dof: DofName): number {
  const displacementValue = caseResult.nodes
    .find(({ id }) => id === nodeId)
    ?.displacements.find((entry) => entry.dof === dof)?.value;
  if (displacementValue === undefined) throw new Error(`Missing displacement ${nodeId}.${dof}.`);
  return displacementValue;
}

export function reaction(caseResult: CaseResult, nodeId: string, dof: DofName): number {
  const reactionValue = caseResult.nodes
    .find(({ id }) => id === nodeId)
    ?.reactions.find((entry) => entry.dof === dof)?.value;
  if (reactionValue === undefined) throw new Error(`Missing reaction ${nodeId}.${dof}.`);
  return reactionValue;
}

export function frameEndForce(caseResult: CaseResult, frameId: string, index: number): number {
  const frame = caseResult.frames.find(({ id }) => id === frameId);
  if (frame === undefined) throw new Error(`Missing frame result ${frameId}.`);
  const force = frame.localEndForces[index];
  if (force === undefined) throw new Error(`Missing frame force ${frameId}[${index}].`);
  return force;
}

export function frameStationValue(
  caseResult: CaseResult,
  frameId: string,
  distance: number,
  component: "axial" | "shearY" | "shearZ" | "torsion" | "bendingY" | "bendingZ",
): number {
  const frame = caseResult.frames.find(({ id }) => id === frameId);
  if (frame === undefined) throw new Error(`Missing frame result ${frameId}.`);
  const station = frame.internalForces.find(
    ({ x }) => Math.abs(x - distance) <= Math.max(1, Math.abs(distance)) * 1e-12,
  );
  if (station === undefined) throw new Error(`Missing station ${frameId}@${distance}.`);
  return station[component];
}

export function prismaticFrameBuilder(options: {
  readonly length: number;
  readonly elasticModulus?: number;
  readonly shearModulus?: number;
  readonly area?: number;
  readonly inertiaY?: number;
  readonly inertiaZ?: number;
  readonly torsionalConstant?: number;
  readonly shearAreaY?: number;
  readonly shearAreaZ?: number;
  readonly theory?: FrameTheoryInput;
  readonly start?: readonly [number, number, number];
  readonly end?: readonly [number, number, number];
  readonly orientation?: readonly [number, number, number];
  readonly rigidOffsets?: {
    readonly start?: readonly [number, number, number];
    readonly end?: readonly [number, number, number];
  };
  readonly releases?: {
    readonly start?: readonly DofName[];
    readonly end?: readonly DofName[];
  };
  readonly units?: UnitSystem;
}): ModelBuilder {
  const start = options.start ?? [0, 0, 0];
  const end = options.end ?? [start[0] + options.length, start[1], start[2]];
  const builder = createModelBuilder()
    .setUnitSystem(options.units ?? siUnits)
    .addNode({ id: "a", coordinates: start })
    .addNode({ id: "b", coordinates: end })
    .addMaterial({
      id: "m",
      elasticModulus: options.elasticModulus ?? 200e9,
      shearModulus: options.shearModulus ?? 80e9,
      density: 7850,
    })
    .addFrameSection({
      id: "s",
      area: options.area ?? 0.02,
      torsionalConstant: options.torsionalConstant ?? 1e-5,
      momentOfInertiaY: options.inertiaY ?? 3e-5,
      momentOfInertiaZ: options.inertiaZ ?? 5e-5,
      ...(options.shearAreaY === undefined ? {} : { shearAreaY: options.shearAreaY }),
      ...(options.shearAreaZ === undefined ? {} : { shearAreaZ: options.shearAreaZ }),
    })
    .addFrame({
      id: "f",
      startNodeId: "a",
      endNodeId: "b",
      materialId: "m",
      sectionId: "s",
      theory: options.theory ?? { kind: "euler-bernoulli" },
      orientation: options.orientation ?? [0, 1, 0],
      ...(options.rigidOffsets === undefined ? {} : { rigidOffsets: options.rigidOffsets }),
      ...(options.releases === undefined ? {} : { releases: options.releases }),
    });
  return builder;
}

export function value(
  name: string,
  reference: number,
  actual: number,
  units: string,
  scale = 0,
): NamedValue {
  const absoluteError = Math.abs(actual - reference);
  const denominator = Math.max(Math.abs(reference), Math.abs(scale), Number.MIN_VALUE);
  return Object.freeze({
    name,
    reference,
    actual,
    units,
    absoluteError,
    errorPercent: (100 * absoluteError) / denominator,
  });
}

export function result(metadata: CaseMetadata, values: readonly NamedValue[]): ValidationResult {
  const tolerancePercent = metadata.tolerancePercent ?? 0.1;
  const maxErrorPercent = Math.max(...values.map(({ errorPercent }) => errorPercent));
  return Object.freeze({
    ...metadata,
    tolerancePercent,
    toleranceReason:
      metadata.toleranceReason ??
      "Closed-form and exact algebraic references permit a 0.1% acceptance threshold.",
    frame3ddCoverage: metadata.frame3ddCoverage ?? "overlap-indirect",
    values: Object.freeze([...values]),
    maxErrorPercent,
    pass: values.every(({ errorPercent }) => errorPercent <= tolerancePercent),
  });
}

export function validationCase(
  metadata: Omit<CaseMetadata, "model" | "supports" | "loads" | "referenceMethod"> & {
    readonly model: string;
    readonly supports: string;
    readonly loads: string;
    readonly referenceMethod: ReferenceMethod;
  },
  run: () => readonly NamedValue[],
): ValidationCase {
  return Object.freeze({
    id: metadata.id,
    category: metadata.category,
    description: metadata.description,
    run: () => result(metadata, run()),
  });
}

export function matrixSymmetryError(values: ArrayLike<number>, size: number): number {
  let maximum = 0;
  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column < size; column += 1) {
      maximum = Math.max(
        maximum,
        Math.abs(values[row * size + column]! - values[column * size + row]!),
      );
    }
  }
  return maximum;
}
