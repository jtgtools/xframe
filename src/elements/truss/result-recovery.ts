import { XFrameError } from "../../errors/xframe-error.js";
import { finiteNumber } from "../../geometry/finite.js";
import { normalizedTrussDirection } from "./local-stiffness.js";

export interface TrussResultInput {
  readonly length: number;
  readonly elasticModulus: number;
  readonly area: number;
  readonly direction: ArrayLike<number>;
  readonly globalDisplacements: ArrayLike<number>;
}

export interface TrussResult {
  readonly extension: number;
  readonly strain: number;
  readonly axialForce: number;
  readonly globalEndForces: Float64Array;
}

export function recoverTrussResult(input: TrussResultInput): TrussResult {
  if (input.globalDisplacements.length !== 6) {
    throw new XFrameError(
      "INPUT_INVALID",
      "Truss result recovery requires six translational displacements.",
      {
        kind: "input",
        path: "truss.globalDisplacements",
        expected: "array-like of length 6",
        actual: `length ${input.globalDisplacements.length}`,
      },
    );
  }
  if (
    !Number.isFinite(input.length) ||
    input.length <= 0 ||
    !Number.isFinite(input.elasticModulus) ||
    input.elasticModulus <= 0 ||
    !Number.isFinite(input.area) ||
    input.area <= 0
  ) {
    throw new XFrameError("INPUT_INVALID", "Truss result properties must be positive and finite.", {
      kind: "input",
      path: "truss.resultProperties",
      expected: "positive finite length, modulus, and area",
      actual: `${input.length},${input.elasticModulus},${input.area}`,
    });
  }
  const direction = normalizedTrussDirection(input.direction);
  const displacement = Array.from({ length: 6 }, (_, index) =>
    finiteNumber(input.globalDisplacements[index], `truss.globalDisplacements[${index}]`),
  );
  const extension = finiteNumber(
    direction[0]! * (displacement[3]! - displacement[0]!) +
      direction[1]! * (displacement[4]! - displacement[1]!) +
      direction[2]! * (displacement[5]! - displacement[2]!),
    "truss.extension",
  );
  const strain = finiteNumber(extension / input.length, "truss.strain");
  const axialForce = finiteNumber(input.elasticModulus * input.area * strain, "truss.axialForce");
  const globalEndForces = new Float64Array(6);
  for (let component = 0; component < 3; component += 1) {
    const force = finiteNumber(axialForce * direction[component]!, `truss.force[${component}]`);
    globalEndForces[component] = -force;
    globalEndForces[component + 3] = force;
  }
  return Object.freeze({ extension, strain, axialForce, globalEndForces });
}
