import type { SkylineCholeskyFactor } from "../linalg/skyline-cholesky.js";
import type { SymmetricCoordinateMatrix } from "../linalg/symmetric-coordinate-matrix.js";
import { createDofKey } from "../model/dof-key.js";
import type { FinalizedModel } from "../model/finalized-model.js";
import {
  SEMANTIC_CONSTRAINT_TOLERANCE,
  maximumSemanticConstraintResidual,
} from "../constraints/semantic-constraint-validation.js";
import type { CaseDiagnostics, SpringElementResult } from "./result-types.js";

function vectorNormMax(values: readonly number[]): number {
  return Math.max(0, ...values.map(Math.abs));
}

// Single r = cross(position, force) accumulation used for both physical DOFs
// and grounded-spring reactions, keeping the moment-arm convention in one place.
function addForceMoment(
  force: number[],
  moment: number[],
  component: number,
  position: readonly [number, number, number],
  value: number,
): void {
  force[component] = force[component]! + value;
  const [x, y, z] = position;
  if (component === 0) {
    moment[1] = moment[1]! + z * value;
    moment[2] = moment[2]! - y * value;
  } else if (component === 1) {
    moment[0] = moment[0]! - z * value;
    moment[2] = moment[2]! + x * value;
  } else {
    moment[0] = moment[0]! + y * value;
    moment[1] = moment[1]! - x * value;
  }
}

// Display normalization only: equilibrium components below 1e-14 (about 60
// ulps at unit scale, well under the 1e-9 pass threshold) are reported as 0
// to avoid -0 and rounding noise in artifacts. The pass/warn/fail gate uses
// the unrounded worst value, so this never masks a violation.
function normalizedZero(value: number): number {
  return Object.is(value, -0) || Math.abs(value) < 1e-14 ? 0 : value;
}

export interface CaseDiagnosticInput {
  readonly model: FinalizedModel;
  readonly fullLoad: ArrayLike<number>;
  readonly fullResidual: ArrayLike<number>;
  readonly fullDisplacements: ArrayLike<number>;
  readonly reducedLoad: ArrayLike<number>;
  readonly reducedDisplacements: ArrayLike<number>;
  readonly residualMaximum: number;
  readonly normalizedResidual: number;
  readonly fullStiffness: SymmetricCoordinateMatrix;
  readonly reducedStiffness: SymmetricCoordinateMatrix;
  readonly factor: SkylineCholeskyFactor;
  readonly fullNonzeros: number;
  readonly reducedNonzeros: number;
  readonly skylineStorage: number;
  readonly skylineMaximumRowWidth: number;
  readonly skylineBandwidth: number;
  readonly springs: readonly SpringElementResult[];
}

export function createCaseDiagnostics(input: CaseDiagnosticInput): CaseDiagnostics {
  const force = [0, 0, 0];
  const moment = [0, 0, 0];
  let forceScale = 0;
  let momentScale = 0;
  for (const metadata of input.model.physicalDofs.values()) {
    const index = metadata.physicalIndex;
    const total = input.fullLoad[index]! + input.fullResidual[index]!;
    const node = input.model.nodes.find(({ id }) => id === metadata.nodeId)!;
    if (metadata.dof === "ux" || metadata.dof === "uy" || metadata.dof === "uz") {
      const component = metadata.dof === "ux" ? 0 : metadata.dof === "uy" ? 1 : 2;
      addForceMoment(force, moment, component, node.coordinates, total);
      forceScale += Math.abs(input.fullLoad[index]!) + Math.abs(input.fullResidual[index]!);
      const [x, y, z] = node.coordinates;
      momentScale += Math.abs(total) * Math.max(Math.abs(x), Math.abs(y), Math.abs(z));
    } else {
      const component = metadata.dof === "rx" ? 0 : metadata.dof === "ry" ? 1 : 2;
      moment[component] = moment[component]! + total;
      momentScale += Math.abs(total);
    }
  }

  for (const spring of input.springs) {
    if (!spring.grounded) continue;
    const springRecord = input.model.resolvedSprings.find(({ record }) => record.id === spring.id)!;
    const position = springRecord.startNode.coordinates;
    for (let component = 0; component < 3; component += 1) {
      const supportForce = -(spring.globalEndForces[component] ?? 0);
      addForceMoment(force, moment, component, position, supportForce);
      forceScale += Math.abs(supportForce);
    }
    for (let component = 0; component < 3; component += 1) {
      const supportMoment = -(spring.globalEndForces[component + 3] ?? 0);
      moment[component] = moment[component]! + supportMoment;
      momentScale += Math.abs(supportMoment);
    }
  }

  const strainEnergy = 0.5 * input.fullStiffness.quadraticForm(input.fullDisplacements);
  let workDot = 0;
  for (let index = 0; index < input.fullLoad.length; index += 1) {
    workDot +=
      (input.fullLoad[index]! + input.fullResidual[index]!) * input.fullDisplacements[index]!;
  }
  const externalWork = 0.5 * workDot;
  const energyScale = Math.max(Math.abs(strainEnergy), Math.abs(externalWork), Number.MIN_VALUE);
  const relativeEnergyError = Math.abs(strainEnergy - externalWork) / energyScale;
  const normalizedForceEquilibrium = vectorNormMax(force) / Math.max(forceScale, Number.MIN_VALUE);
  const normalizedMomentEquilibrium =
    vectorNormMax(moment) / Math.max(momentScale, Number.MIN_VALUE);
  const worst = Math.max(
    input.normalizedResidual,
    normalizedForceEquilibrium,
    normalizedMomentEquilibrium,
    relativeEnergyError,
  );
  // Phase 1 semantic hard gate: every original constraint equation is
  // evaluated against the recovered physical displacement. A violation is a
  // hard failure independent of the self-confirming energy/residual metrics.
  const semanticConstraintResidual = maximumSemanticConstraintResidual(
    input.model.constraints.map((record) => ({
      sourceId: record.id,
      terms: record.terms.map((term) => ({
        dof: input.model.physicalDofs.get(createDofKey(term.nodeId, term.dof))!.physicalIndex,
        coefficient: term.coefficient,
      })),
      rightHandSide: record.rightHandSide,
    })),
    input.fullDisplacements,
  );
  const status =
    semanticConstraintResidual > SEMANTIC_CONSTRAINT_TOLERANCE
      ? "fail"
      : worst <= 1e-9
        ? "pass"
        : worst <= 1e-6
          ? "warn"
          : "fail";

  return Object.freeze({
    status,
    maximumAbsoluteResidual: input.residualMaximum,
    normalizedResidual: input.normalizedResidual,
    forceEquilibrium: Object.freeze(force.map(normalizedZero)) as readonly [number, number, number],
    momentEquilibrium: Object.freeze(moment.map(normalizedZero)) as readonly [
      number,
      number,
      number,
    ],
    normalizedForceEquilibrium,
    normalizedMomentEquilibrium,
    strainEnergy,
    externalWork,
    relativeEnergyError,
    minimumNormalizedPivot: input.factor.diagnostics.minimumNormalizedPivot,
    minimumPivotEquation: input.factor.diagnostics.minimumPivotEquation,
    equationCount: input.reducedStiffness.size,
    fullEquationCount: input.model.physicalDofs.size,
    fullNonzeros: input.fullNonzeros,
    reducedNonzeros: input.reducedNonzeros,
    skylineStorage: input.skylineStorage,
    skylineMaximumRowWidth: input.skylineMaximumRowWidth,
    skylineBandwidth: input.skylineBandwidth,
    assemblyReused: true,
    factorizationReused: true,
  });
}
