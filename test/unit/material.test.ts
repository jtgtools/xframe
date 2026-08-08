import { describe, expect, it } from "vitest";
import { XFrameError } from "../../src/errors/xframe-error.js";
import { createIsotropicMaterial } from "../../src/materials/isotropic-material.js";
import { createModelBuilder } from "../../src/model/model-builder.js";

function codeOf(action: () => unknown): string | undefined {
  try {
    action();
  } catch (error) {
    return error instanceof XFrameError ? error.code : undefined;
  }
  return undefined;
}

describe("createIsotropicMaterial", () => {
  it("FR-MAT-001: derives shear modulus from elastic modulus and Poisson ratio", () => {
    const material = createIsotropicMaterial({
      id: "steel",
      elasticModulus: 210e9,
      poissonRatio: 0.3,
    });

    expect(material.elasticModulus).toBe(210e9);
    expect(material.shearModulus).toBeCloseTo(210e9 / 2.6, 4);
    expect(material.poissonRatio).toBe(0.3);
    expect(Object.isFrozen(material)).toBe(true);
  });

  it("FR-MAT-001: derives Poisson ratio from elastic and shear moduli", () => {
    const material = createIsotropicMaterial({
      id: "alloy",
      elasticModulus: 70e9,
      shearModulus: 26e9,
    });

    expect(material.poissonRatio).toBeCloseTo(70e9 / (2 * 26e9) - 1, 12);
  });

  it("FR-MAT-001: accepts a scale-consistent complete isotropic triple", () => {
    const elasticModulus = 30e9;
    const poissonRatio = 0.2;
    const shearModulus = elasticModulus / (2 * (1 + poissonRatio));
    const material = createIsotropicMaterial({
      id: "concrete",
      elasticModulus,
      shearModulus,
      poissonRatio,
      density: 2400,
    });

    expect(material).toEqual({
      id: "concrete",
      elasticModulus,
      shearModulus,
      poissonRatio,
      density: 2400,
    });
  });

  it("FR-MAT-001: rejects incomplete, nonphysical, and inconsistent material data", () => {
    expect(codeOf(() => createIsotropicMaterial({ id: "m", elasticModulus: 1 }))).toBe(
      "MATERIAL_INVALID",
    );
    expect(
      codeOf(() => createIsotropicMaterial({ id: "m", elasticModulus: 0, poissonRatio: 0.2 })),
    ).toBe("MATERIAL_INVALID");
    expect(
      codeOf(() => createIsotropicMaterial({ id: "m", elasticModulus: 1, shearModulus: -1 })),
    ).toBe("MATERIAL_INVALID");
    expect(
      codeOf(() => createIsotropicMaterial({ id: "m", elasticModulus: 1, poissonRatio: 0.5 })),
    ).toBe("MATERIAL_INVALID");
    expect(
      codeOf(() =>
        createIsotropicMaterial({
          id: "m",
          elasticModulus: 210e9,
          shearModulus: 50e9,
          poissonRatio: 0.3,
        }),
      ),
    ).toBe("MATERIAL_INVALID");
    expect(
      codeOf(() =>
        createIsotropicMaterial({ id: "m", elasticModulus: 1, poissonRatio: 0.2, density: 0 }),
      ),
    ).toBe("MATERIAL_INVALID");
  });

  it("FR-MAT-001: builder material insertion uses the physical material validator", () => {
    expect(() =>
      createModelBuilder().addMaterial({ id: "m", elasticModulus: -1, poissonRatio: 0.2 }),
    ).toThrow(XFrameError);
    const material = createModelBuilder()
      .addMaterial({ id: "m", elasticModulus: 210e9, poissonRatio: 0.3 })
      .snapshot().materials[0];
    expect(material?.shearModulus).toBeCloseTo(210e9 / 2.6, 4);
  });
});
