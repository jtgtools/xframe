/**
 * Independent closed-form cases consumed by Parts 09 and 10 when numerical kernels are introduced.
 * This file is typechecked now but is intentionally not a test file until the corresponding kernels exist.
 */
export const AXIAL_BAR_SPECIFICATION = Object.freeze({
  elasticModulus: 200e9,
  area: 0.004,
  length: 2,
  localStiffness: Object.freeze([400e6, -400e6, -400e6, 400e6]),
});

export const EULER_BERNOULLI_CANTILEVER_SPECIFICATION = Object.freeze({
  force: 10_000,
  length: 3,
  elasticModulus: 210e9,
  secondMoment: 8e-6,
  tipDeflection: (10_000 * 3 ** 3) / (3 * 210e9 * 8e-6),
  tipRotation: (10_000 * 3 ** 2) / (2 * 210e9 * 8e-6),
});

export const TIMOSHENKO_CANTILEVER_SPECIFICATION = Object.freeze({
  force: 10_000,
  length: 3,
  elasticModulus: 210e9,
  shearModulus: 80.76923076923077e9,
  secondMoment: 8e-6,
  effectiveShearArea: 0.007,
  tipDeflection:
    (10_000 * 3 ** 3) / (3 * 210e9 * 8e-6) + (10_000 * 3) / (80.76923076923077e9 * 0.007),
});
