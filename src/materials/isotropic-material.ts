import { XFrameError } from "../errors/xframe-error.js";
import { withinTolerance, type Tolerance } from "../geometry/tolerance.js";
import type { MaterialInput, MaterialRecord } from "../model/domain-records.js";
import { parseIdentifier } from "../model/identifier.js";

// The relation check is dimensionless and scaled by the supplied shear modulus.
// 1e-9 rejects materially inconsistent triples while allowing normal decimal serialization roundoff.
export const MATERIAL_RELATION_TOLERANCE: Tolerance = Object.freeze({
  absolute: 0,
  relative: 1e-9,
});

function materialError(path: string, expected: string, actual: unknown): never {
  throw new XFrameError("MATERIAL_INVALID", "Isotropic material data is invalid.", {
    kind: "input",
    path,
    expected,
    actual: String(actual),
  });
}

function positive(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    materialError(path, "positive finite number", value);
  }
  return value;
}

function poisson(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= -1 || value >= 0.5) {
    materialError(path, "finite number strictly between -1 and 0.5", value);
  }
  return value;
}

export function createIsotropicMaterial(input: MaterialInput): MaterialRecord {
  const id = parseIdentifier(input.id, "material.id");
  const hasElastic = input.elasticModulus !== undefined;
  const hasShear = input.shearModulus !== undefined;
  const hasPoisson = input.poissonRatio !== undefined;

  if (!hasElastic || (!hasShear && !hasPoisson)) {
    materialError(
      "material",
      "elasticModulus with either shearModulus or poissonRatio",
      `${String(input.elasticModulus)},${String(input.shearModulus)},${String(input.poissonRatio)}`,
    );
  }

  const elasticModulus = positive(input.elasticModulus, "material.elasticModulus");
  let shearModulus: number;
  let poissonRatio: number;

  if (hasShear && hasPoisson) {
    shearModulus = positive(input.shearModulus, "material.shearModulus");
    poissonRatio = poisson(input.poissonRatio, "material.poissonRatio");
    const expectedShear = elasticModulus / (2 * (1 + poissonRatio));
    const scale = Math.max(Math.abs(shearModulus), Math.abs(expectedShear));
    if (!withinTolerance(shearModulus, expectedShear, scale, MATERIAL_RELATION_TOLERANCE)) {
      materialError(
        "material.shearModulus",
        `consistent with E/(2*(1+nu)) = ${expectedShear}`,
        shearModulus,
      );
    }
  } else if (hasShear) {
    shearModulus = positive(input.shearModulus, "material.shearModulus");
    poissonRatio = poisson(
      elasticModulus / (2 * shearModulus) - 1,
      "material.poissonRatio(derived)",
    );
  } else {
    poissonRatio = poisson(input.poissonRatio, "material.poissonRatio");
    shearModulus = positive(
      elasticModulus / (2 * (1 + poissonRatio)),
      "material.shearModulus(derived)",
    );
  }

  const density =
    input.density === undefined ? undefined : positive(input.density, "material.density");
  return Object.freeze({
    id,
    elasticModulus,
    shearModulus,
    poissonRatio,
    ...(density === undefined ? {} : { density }),
  });
}
