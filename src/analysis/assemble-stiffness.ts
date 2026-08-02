import {
  compileModelConstraints,
  type CompiledConstraints,
} from "../constraints/compile-constraints.js";
import { computeFrameLocalStiffness } from "../elements/frame/local-stiffness.js";
import {
  condenseFrameEndReleases,
  frameReleaseMask,
} from "../elements/frame/release-condensation.js";
import { createFrameRigidOffsetTransform } from "../elements/frame/rigid-offset-transform.js";
import { computeGroundSpringStiffness } from "../elements/spring/ground-spring.js";
import { computeTwoNodeSpringStiffness } from "../elements/spring/two-node-spring.js";
import { computeTrussGlobalStiffness } from "../elements/truss/local-stiffness.js";
import { createTrussRigidOffsetKinematics } from "../elements/truss/rigid-offset-kinematics.js";
import {
  SymmetricCoordinateBuilder,
  type SymmetricCoordinateMatrix,
} from "../linalg/symmetric-coordinate-matrix.js";
import type { FinalizedModel } from "../model/finalized-model.js";
import {
  activeSpringComponents,
  frameEquationMap,
  springEquationMap,
  trussEquationMap,
} from "./element-equation-map.js";

function addDenseSymmetric(
  builder: SymmetricCoordinateBuilder,
  equations: readonly number[],
  matrix: ArrayLike<number>,
): void {
  const size = equations.length;
  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column <= row; column += 1) {
      const value = matrix[row * size + column]!;
      if (value !== 0) builder.add(equations[row]!, equations[column]!, value);
    }
  }
}

function reducedMatrix(
  full: SymmetricCoordinateMatrix,
  constraints: CompiledConstraints,
): SymmetricCoordinateMatrix {
  const builder = new SymmetricCoordinateBuilder(constraints.reducedDofCount);
  for (const { row, column, value } of full.entries()) {
    const rowTerms = constraints.rows[row]!.terms;
    const columnTerms = constraints.rows[column]!.terms;
    if (row === column) {
      for (let left = 0; left < rowTerms.length; left += 1) {
        for (let right = 0; right <= left; right += 1) {
          const a = rowTerms[left]!;
          const b = rowTerms[right]!;
          builder.add(a.reducedDof, b.reducedDof, value * a.coefficient * b.coefficient);
        }
      }
    } else {
      for (const a of rowTerms) {
        for (const b of columnTerms) {
          const contribution = value * a.coefficient * b.coefficient;
          builder.add(
            a.reducedDof,
            b.reducedDof,
            a.reducedDof === b.reducedDof ? 2 * contribution : contribution,
          );
        }
      }
    }
  }
  return builder.finalize();
}

export interface AssembledStiffness {
  readonly full: SymmetricCoordinateMatrix;
  readonly reduced: SymmetricCoordinateMatrix;
  readonly constraints: CompiledConstraints;
}

export function assembleStiffness(model: FinalizedModel): AssembledStiffness {
  const fullBuilder = new SymmetricCoordinateBuilder(model.physicalDofs.size);

  for (const frame of model.resolvedFrames) {
    const local = computeFrameLocalStiffness({
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
    const condensed = condenseFrameEndReleases(
      local,
      new Float64Array(12),
      frameReleaseMask(frame.record.releases),
    );
    const transform = createFrameRigidOffsetTransform(
      frame.axes.globalToLocal,
      frame.geometry.startOffset,
      frame.geometry.endOffset,
    );
    addDenseSymmetric(
      fullBuilder,
      frameEquationMap(model, frame),
      transform.stiffnessToGlobal(condensed.stiffness),
    );
  }

  for (const truss of model.resolvedTrusses) {
    const kinematics = createTrussRigidOffsetKinematics(
      truss.direction,
      truss.geometry.startOffset,
      truss.geometry.endOffset,
    );
    const equations = trussEquationMap(model, truss);
    if (kinematics.activeReferenceComponents.length === 6) {
      const stiffness = computeTrussGlobalStiffness({
        length: truss.geometry.elasticLength,
        elasticModulus: truss.material.elasticModulus,
        area: truss.section.area,
        direction: truss.direction,
      });
      addDenseSymmetric(fullBuilder, equations, stiffness);
      continue;
    }
    const scale =
      (truss.material.elasticModulus * truss.section.area) / truss.geometry.elasticLength;
    for (let row = 0; row < equations.length; row += 1) {
      const rowCoefficient = kinematics.compatibility[kinematics.activeReferenceComponents[row]!]!;
      for (let column = 0; column <= row; column += 1) {
        const columnCoefficient =
          kinematics.compatibility[kinematics.activeReferenceComponents[column]!]!;
        const value = scale * rowCoefficient * columnCoefficient;
        if (value !== 0) fullBuilder.add(equations[row]!, equations[column]!, value);
      }
    }
  }

  for (const spring of model.resolvedSprings) {
    const components = activeSpringComponents(spring);
    const full =
      spring.record.endNodeId === undefined
        ? computeGroundSpringStiffness(spring.record.stiffness)
        : computeTwoNodeSpringStiffness(spring.record.stiffness);
    const blockSize = spring.record.endNodeId === undefined ? 6 : 12;
    const selectedSize = components.length * (spring.record.endNodeId === undefined ? 1 : 2);
    const selected = new Float64Array(selectedSize ** 2);
    const indexes =
      spring.record.endNodeId === undefined
        ? components
        : [...components, ...components.map((index) => index + 6)];
    for (let row = 0; row < selectedSize; row += 1) {
      for (let column = 0; column < selectedSize; column += 1) {
        selected[row * selectedSize + column] = full[indexes[row]! * blockSize + indexes[column]!]!;
      }
    }
    addDenseSymmetric(fullBuilder, springEquationMap(model, spring), selected);
  }

  const full = fullBuilder.finalize();
  const constraints = compileModelConstraints(model.constraints, model.physicalDofs);
  return Object.freeze({ full, reduced: reducedMatrix(full, constraints), constraints });
}
