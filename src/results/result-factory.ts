import { assembleFrameLocalLoad, resolvedFrameMemberLoad } from "../analysis/assemble-load-case.js";
import {
  frameEquationMap,
  springEquationMap,
  trussEquationMap,
} from "../analysis/element-equation-map.js";
import { recoverFrameEndForces } from "../elements/frame/end-force-recovery.js";
import { computeFrameLocalStiffness } from "../elements/frame/local-stiffness.js";
import {
  condenseFrameEndReleases,
  frameReleaseMask,
} from "../elements/frame/release-condensation.js";
import { createFrameRigidOffsetTransform } from "../elements/frame/rigid-offset-transform.js";
import { computeGroundSpringStiffness } from "../elements/spring/ground-spring.js";
import { recoverTwoNodeSpringForces } from "../elements/spring/two-node-spring.js";
import { recoverTrussResult } from "../elements/truss/result-recovery.js";
import { createTrussRigidOffsetKinematics } from "../elements/truss/rigid-offset-kinematics.js";
import type { ResidualDiagnostics } from "../linalg/residual.js";
import type { SkylineCholeskyFactor } from "../linalg/skyline-cholesky.js";
import type { SymmetricCoordinateMatrix } from "../linalg/symmetric-coordinate-matrix.js";
import type { FinalizedLoadCaseRecord, FinalizedModel } from "../model/finalized-model.js";
import { createCaseDiagnostics } from "./case-diagnostics.js";
import {
  buildFrameInternalForceSegments,
  deriveFrameInternalForceStations,
} from "./frame-internal-forces.js";
import type {
  CaseResult,
  FrameResult,
  NodeResult,
  SpringElementResult,
  TrussElementResult,
  TrussReferenceEndForces,
} from "./result-types.js";

const CONVENTIONS = Object.freeze({
  coordinateSystem: "global-node-local-member" as const,
  rotations: "radians-right-hand-rule" as const,
  frameEndForces: "element-on-node" as const,
  internalForces: "positive-local-cut-face" as const,
});

function frozenNumbers(values: ArrayLike<number>): readonly number[] {
  return Object.freeze(Array.from(values, (value) => (Object.is(value, -0) ? 0 : value)));
}

function gathered(values: ArrayLike<number>, equations: readonly number[]): Float64Array {
  return Float64Array.from(equations, (equation) => values[equation]!);
}

function frameResults(
  model: FinalizedModel,
  loadCase: FinalizedLoadCaseRecord,
  fullDisplacements: ArrayLike<number>,
): readonly FrameResult[] {
  return Object.freeze(
    model.resolvedFrames.map((frame) => {
      const localStiffness = computeFrameLocalStiffness({
        length: frame.geometry.elasticLength,
        elasticModulus: frame.material.elasticModulus,
        shearModulus: frame.material.shearModulus,
        area: frame.section.area,
        torsionalConstant: frame.section.torsionalConstant,
        momentOfInertiaY: frame.section.momentOfInertiaY,
        momentOfInertiaZ: frame.section.momentOfInertiaZ,
        theory: frame.record.theory,
        ...(frame.section.shearAreaY === undefined ? {} : { shearAreaY: frame.section.shearAreaY }),
        ...(frame.section.shearAreaZ === undefined ? {} : { shearAreaZ: frame.section.shearAreaZ }),
      });
      const localLoad = assembleFrameLocalLoad(frame, loadCase.loads);
      const kernel = condenseFrameEndReleases(
        localStiffness,
        localLoad,
        frameReleaseMask(frame.record.releases),
      );
      const transform = createFrameRigidOffsetTransform(
        frame.axes.globalToLocal,
        frame.geometry.startOffset,
        frame.geometry.endOffset,
      );
      const globalDisplacements = gathered(fullDisplacements, frameEquationMap(model, frame));
      const localDisplacements = transform.toLocalDisplacements(globalDisplacements);
      const localEndForces = recoverFrameEndForces(kernel, localDisplacements);
      const allLoads = model.loadCases.flatMap((entry) =>
        entry.loads
          .map((load) => resolvedFrameMemberLoad(frame, load))
          .filter((load) => load !== undefined),
      );
      const currentLoads = loadCase.loads
        .map((load) => resolvedFrameMemberLoad(frame, load))
        .filter((load) => load !== undefined);
      const internalForceSegments = buildFrameInternalForceSegments(
        frame.geometry.elasticLength,
        localEndForces,
        currentLoads,
        allLoads,
      );
      return Object.freeze({
        id: frame.record.id,
        localEndDisplacements: frozenNumbers(localDisplacements),
        globalEndDisplacements: frozenNumbers(globalDisplacements),
        localEndForces: frozenNumbers(localEndForces),
        globalEndForces: frozenNumbers(transform.forceToGlobal(localEndForces)),
        internalForceSegments,
        internalForces: deriveFrameInternalForceStations(internalForceSegments),
      });
    }),
  );
}

function trussResults(
  model: FinalizedModel,
  fullDisplacements: ArrayLike<number>,
): readonly TrussElementResult[] {
  return Object.freeze(
    model.resolvedTrusses.map((truss) => {
      const kinematics = createTrussRigidOffsetKinematics(
        truss.direction,
        truss.geometry.startOffset,
        truss.geometry.endOffset,
      );
      const value = recoverTrussResult({
        length: truss.geometry.elasticLength,
        elasticModulus: truss.material.elasticModulus,
        area: truss.section.area,
        direction: truss.direction,
        globalDisplacements: kinematics.elasticTranslations(
          gathered(fullDisplacements, trussEquationMap(model, truss)),
        ),
      });
      const globalReferenceEndForces = [
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      ] satisfies TrussReferenceEndForces;
      const activeReferenceActions = kinematics.referenceActions(value.globalEndForces);
      for (let index = 0; index < activeReferenceActions.length; index += 1) {
        const action = activeReferenceActions[index]!;
        globalReferenceEndForces[kinematics.activeReferenceComponents[index]!] =
          action === 0 ? 0 : action;
      }
      return Object.freeze({
        id: truss.record.id,
        extension: value.extension,
        strain: value.strain,
        axialForce: value.axialForce,
        globalEndForces: frozenNumbers(value.globalEndForces),
        globalReferenceEndForces: Object.freeze(globalReferenceEndForces),
      });
    }),
  );
}

function springResults(
  model: FinalizedModel,
  fullDisplacements: ArrayLike<number>,
): readonly SpringElementResult[] {
  return Object.freeze(
    model.resolvedSprings.map((spring) => {
      const active = spring.record.stiffness.flatMap((value, index) => (value > 0 ? [index] : []));
      if (spring.record.endNodeId === undefined) {
        const displacement = new Float64Array(6);
        const values = gathered(fullDisplacements, springEquationMap(model, spring));
        for (let index = 0; index < active.length; index += 1)
          displacement[active[index]!] = values[index]!;
        const stiffness = computeGroundSpringStiffness(spring.record.stiffness);
        const forces = new Float64Array(6);
        for (let row = 0; row < 6; row += 1) {
          for (let column = 0; column < 6; column += 1)
            forces[row] = forces[row]! + stiffness[row * 6 + column]! * displacement[column]!;
        }
        return Object.freeze({
          id: spring.record.id,
          grounded: true,
          globalEndForces: frozenNumbers(forces),
        });
      }
      const displacement = new Float64Array(12);
      const values = gathered(fullDisplacements, springEquationMap(model, spring));
      for (let end = 0; end < 2; end += 1) {
        for (let index = 0; index < active.length; index += 1)
          displacement[end * 6 + active[index]!] = values[end * active.length + index]!;
      }
      return Object.freeze({
        id: spring.record.id,
        grounded: false,
        globalEndForces: frozenNumbers(
          recoverTwoNodeSpringForces(spring.record.stiffness, displacement),
        ),
      });
    }),
  );
}

function nodeResults(
  model: FinalizedModel,
  fullDisplacements: ArrayLike<number>,
  fullResidual: ArrayLike<number>,
): readonly NodeResult[] {
  return Object.freeze(
    model.nodes.map((node) => {
      const metadata = [...model.physicalDofs.values()].filter(({ nodeId }) => nodeId === node.id);
      return Object.freeze({
        id: node.id,
        coordinates: node.coordinates,
        displacements: Object.freeze(
          metadata.map(({ dof, physicalIndex }) =>
            Object.freeze({ dof, value: fullDisplacements[physicalIndex]! }),
          ),
        ),
        reactions: Object.freeze(
          metadata.map(({ dof, physicalIndex }) =>
            Object.freeze({ dof, value: fullResidual[physicalIndex]! }),
          ),
        ),
      });
    }),
  );
}

export interface CreateCaseResultInput {
  readonly model: FinalizedModel;
  readonly loadCase: FinalizedLoadCaseRecord;
  readonly fullDisplacements: ArrayLike<number>;
  readonly reducedDisplacements: ArrayLike<number>;
  readonly fullLoad: ArrayLike<number>;
  readonly fullResidual: ArrayLike<number>;
  readonly reducedLoad: ArrayLike<number>;
  readonly residual: ResidualDiagnostics;
  readonly fullStiffness: SymmetricCoordinateMatrix;
  readonly reducedStiffness: SymmetricCoordinateMatrix;
  readonly factor: SkylineCholeskyFactor;
  readonly fullNonzeros: number;
  readonly reducedNonzeros: number;
  readonly skylineStorage: number;
  readonly skylineMaximumRowWidth: number;
  readonly skylineBandwidth: number;
}

export function createCaseResult(input: CreateCaseResultInput): CaseResult {
  const frames = frameResults(input.model, input.loadCase, input.fullDisplacements);
  const trusses = trussResults(input.model, input.fullDisplacements);
  const springs = springResults(input.model, input.fullDisplacements);
  return Object.freeze({
    kind: "case",
    id: input.loadCase.id,
    modelFingerprint: input.model.fingerprint,
    unitSystem: input.model.unitSystem,
    conventions: CONVENTIONS,
    fullDisplacements: frozenNumbers(input.fullDisplacements),
    reducedDisplacements: frozenNumbers(input.reducedDisplacements),
    fullLoad: frozenNumbers(input.fullLoad),
    fullResidual: frozenNumbers(input.fullResidual),
    nodes: nodeResults(input.model, input.fullDisplacements, input.fullResidual),
    frames,
    trusses,
    springs,
    diagnostics: createCaseDiagnostics({
      model: input.model,
      fullLoad: input.fullLoad,
      fullResidual: input.fullResidual,
      fullDisplacements: input.fullDisplacements,
      reducedLoad: input.reducedLoad,
      reducedDisplacements: input.reducedDisplacements,
      residualMaximum: input.residual.maximumAbsoluteResidual,
      normalizedResidual: input.residual.normalizedResidual,
      fullStiffness: input.fullStiffness,
      reducedStiffness: input.reducedStiffness,
      factor: input.factor,
      fullNonzeros: input.fullNonzeros,
      reducedNonzeros: input.reducedNonzeros,
      skylineStorage: input.skylineStorage,
      skylineMaximumRowWidth: input.skylineMaximumRowWidth,
      skylineBandwidth: input.skylineBandwidth,
      springs,
    }),
    provenance: Object.freeze(
      input.loadCase.provenance.map(({ loadIndex, kind, targetIds }) =>
        Object.freeze({ loadIndex, kind, targetIds }),
      ),
    ),
  });
}
