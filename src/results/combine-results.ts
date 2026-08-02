import { XFrameError } from "../errors/xframe-error.js";
import { parseIdentifier } from "../model/identifier.js";
import {
  addFrameInternalForceSegments,
  deriveFrameInternalForceStations,
} from "./frame-internal-forces.js";
import type { CaseDiagnostics, CombinationResult, StructuralResult } from "./result-types.js";

export interface ResultFactor {
  readonly result: StructuralResult;
  readonly factor: number;
}

function incompatible(results: readonly StructuralResult[], reason: string): never {
  throw new XFrameError("RESULT_INCOMPATIBLE", "Results cannot be combined.", {
    kind: "result",
    resultIds: Object.freeze(results.map(({ id }) => id)),
    reason,
  });
}

function finite(value: number, results: readonly StructuralResult[], label: string): number {
  if (!Number.isFinite(value)) incompatible(results, `${label} is nonfinite`);
  return Object.is(value, -0) ? 0 : value;
}

function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function assertLayout(
  first: StructuralResult,
  result: StructuralResult,
  all: readonly StructuralResult[],
): void {
  if (result.modelFingerprint !== first.modelFingerprint)
    incompatible(all, "model fingerprints differ");
  if (!sameJson(result.unitSystem, first.unitSystem)) incompatible(all, "unit systems differ");
  if (!sameJson(result.conventions, first.conventions))
    incompatible(all, "result conventions differ");
  if (
    result.fullDisplacements.length !== first.fullDisplacements.length ||
    result.reducedDisplacements.length !== first.reducedDisplacements.length
  ) {
    incompatible(all, "equation layouts differ");
  }
  for (const key of ["nodes", "frames", "trusses", "springs"] as const) {
    if (result[key].length !== first[key].length) incompatible(all, `${key} counts differ`);
    for (let index = 0; index < first[key].length; index += 1) {
      if (result[key][index]!.id !== first[key][index]!.id)
        incompatible(all, `${key} ordering differs`);
    }
  }
  for (let index = 0; index < first.nodes.length; index += 1) {
    const a = first.nodes[index]!;
    const b = result.nodes[index]!;
    if (!sameJson(a.coordinates, b.coordinates)) incompatible(all, "node coordinates differ");
    if (
      !sameJson(
        a.displacements.map(({ dof }) => dof),
        b.displacements.map(({ dof }) => dof),
      )
    )
      incompatible(all, "node displacement layouts differ");
    if (
      !sameJson(
        a.reactions.map(({ dof }) => dof),
        b.reactions.map(({ dof }) => dof),
      )
    )
      incompatible(all, "node reaction layouts differ");
  }
  for (let index = 0; index < first.frames.length; index += 1) {
    const a = first.frames[index]!;
    const b = result.frames[index]!;
    if (a.internalForceSegments.length !== b.internalForceSegments.length) {
      incompatible(all, "frame segment counts differ");
    }
    for (let segment = 0; segment < a.internalForceSegments.length; segment += 1) {
      const left = a.internalForceSegments[segment]!;
      const right = b.internalForceSegments[segment]!;
      if (
        left.start !== right.start ||
        left.end !== right.end ||
        (left.startLeft === undefined) !== (right.startLeft === undefined) ||
        (left.endRight === undefined) !== (right.endRight === undefined)
      ) {
        incompatible(all, "frame segment layouts differ");
      }
    }
  }
  for (let index = 0; index < first.springs.length; index += 1) {
    if (first.springs[index]!.grounded !== result.springs[index]!.grounded)
      incompatible(all, "spring kinds differ");
  }
}

function combineArray(
  factors: readonly { readonly result: StructuralResult; readonly factor: number }[],
  select: (result: StructuralResult) => readonly number[],
  label: string,
): readonly number[] {
  const results = factors.map(({ result }) => result);
  const length = select(factors[0]!.result).length;
  const values = Array.from({ length }, () => 0);
  for (const { result, factor } of factors) {
    const source = select(result);
    if (source.length !== length) incompatible(results, `${label} lengths differ`);
    for (let index = 0; index < length; index += 1)
      values[index] = finite(
        values[index]! + factor * source[index]!,
        results,
        `${label}[${index}]`,
      );
  }
  return Object.freeze(values);
}

function combineScalar(
  factors: readonly { readonly result: StructuralResult; readonly factor: number }[],
  select: (result: StructuralResult) => number,
  label: string,
): number {
  return finite(
    factors.reduce((sum, { result, factor }) => sum + factor * select(result), 0),
    factors.map(({ result }) => result),
    label,
  );
}

function diagnostics(): CaseDiagnostics {
  return Object.freeze({
    status: "not-applicable",
    maximumAbsoluteResidual: 0,
    normalizedResidual: 0,
    forceEquilibrium: Object.freeze([0, 0, 0]) as readonly [number, number, number],
    momentEquilibrium: Object.freeze([0, 0, 0]) as readonly [number, number, number],
    normalizedForceEquilibrium: 0,
    normalizedMomentEquilibrium: 0,
    strainEnergy: 0,
    externalWork: 0,
    relativeEnergyError: 0,
    minimumNormalizedPivot: 0,
    minimumPivotEquation: -1,
    equationCount: 0,
    fullEquationCount: 0,
    fullNonzeros: 0,
    reducedNonzeros: 0,
    skylineStorage: 0,
    skylineMaximumRowWidth: 0,
    skylineBandwidth: 0,
    assemblyReused: true,
    factorizationReused: true,
  });
}

export function combineResults(
  idInput: unknown,
  inputFactors: readonly ResultFactor[],
): CombinationResult {
  if (inputFactors.length === 0) incompatible([], "at least one factor is required");
  const factors = inputFactors.map(({ result, factor }) =>
    Object.freeze({ result, factor: finite(factor, [], "factor") }),
  );
  const results = factors.map(({ result }) => result);
  const id = parseIdentifier(idInput, "combinationResult.id");
  const ids = new Set<string>();
  for (const result of results) {
    if (ids.has(result.id)) incompatible(results, "duplicate source result identifier");
    ids.add(result.id);
  }
  if (ids.has(id)) incompatible(results, "combination identifier collides with a source result");
  const first = results[0]!;
  for (const result of results.slice(1)) assertLayout(first, result, results);

  const nodes = Object.freeze(
    first.nodes.map((node, nodeIndex) =>
      Object.freeze({
        id: node.id,
        coordinates: Object.freeze([...node.coordinates]) as readonly [number, number, number],
        displacements: Object.freeze(
          node.displacements.map(({ dof }, dofIndex) =>
            Object.freeze({
              dof,
              value: combineScalar(
                factors,
                (result) => result.nodes[nodeIndex]!.displacements[dofIndex]!.value,
                `node.${dof}`,
              ),
            }),
          ),
        ),
        reactions: Object.freeze(
          node.reactions.map(({ dof }, dofIndex) =>
            Object.freeze({
              dof,
              value: combineScalar(
                factors,
                (result) => result.nodes[nodeIndex]!.reactions[dofIndex]!.value,
                `reaction.${dof}`,
              ),
            }),
          ),
        ),
      }),
    ),
  );

  const frames = Object.freeze(
    first.frames.map((frame, frameIndex) => {
      let internalForceSegments = addFrameInternalForceSegments(
        frame.internalForceSegments,
        frame.internalForceSegments,
        factors[0]!.factor - 1,
      );
      for (const { result, factor } of factors.slice(1)) {
        internalForceSegments = addFrameInternalForceSegments(
          internalForceSegments,
          result.frames[frameIndex]!.internalForceSegments,
          factor,
        );
      }
      return Object.freeze({
        id: frame.id,
        localEndDisplacements: combineArray(
          factors,
          (result) => result.frames[frameIndex]!.localEndDisplacements,
          "localEndDisplacements",
        ),
        globalEndDisplacements: combineArray(
          factors,
          (result) => result.frames[frameIndex]!.globalEndDisplacements,
          "globalEndDisplacements",
        ),
        localEndForces: combineArray(
          factors,
          (result) => result.frames[frameIndex]!.localEndForces,
          "localEndForces",
        ),
        globalEndForces: combineArray(
          factors,
          (result) => result.frames[frameIndex]!.globalEndForces,
          "globalEndForces",
        ),
        internalForceSegments,
        internalForces: deriveFrameInternalForceStations(internalForceSegments),
      });
    }),
  );

  const trusses = Object.freeze(
    first.trusses.map((truss, index) =>
      Object.freeze({
        id: truss.id,
        extension: combineScalar(
          factors,
          (result) => result.trusses[index]!.extension,
          "truss.extension",
        ),
        strain: combineScalar(factors, (result) => result.trusses[index]!.strain, "truss.strain"),
        axialForce: combineScalar(
          factors,
          (result) => result.trusses[index]!.axialForce,
          "truss.axialForce",
        ),
        globalEndForces: combineArray(
          factors,
          (result) => result.trusses[index]!.globalEndForces,
          "truss.globalEndForces",
        ),
        globalReferenceEndForces: combineArray(
          factors,
          (result) => result.trusses[index]!.globalReferenceEndForces,
          "truss.globalReferenceEndForces",
        ),
      }),
    ),
  );
  const springs = Object.freeze(
    first.springs.map((spring, index) =>
      Object.freeze({
        id: spring.id,
        grounded: spring.grounded,
        globalEndForces: combineArray(
          factors,
          (result) => result.springs[index]!.globalEndForces,
          "spring.globalEndForces",
        ),
      }),
    ),
  );

  return Object.freeze({
    kind: "combination",
    id,
    modelFingerprint: first.modelFingerprint,
    unitSystem: first.unitSystem,
    conventions: first.conventions,
    fullDisplacements: combineArray(
      factors,
      (result) => result.fullDisplacements,
      "fullDisplacements",
    ),
    reducedDisplacements: combineArray(
      factors,
      (result) => result.reducedDisplacements,
      "reducedDisplacements",
    ),
    fullLoad: combineArray(factors, (result) => result.fullLoad, "fullLoad"),
    fullResidual: combineArray(factors, (result) => result.fullResidual, "fullResidual"),
    nodes,
    frames,
    trusses,
    springs,
    diagnostics: diagnostics(),
    factors: Object.freeze(
      factors.map(({ result, factor }) => Object.freeze({ resultId: result.id, factor })),
    ),
  });
}
