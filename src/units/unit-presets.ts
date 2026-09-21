import type { UnitSystem } from "./unit-system.js";

/** Frozen version-one SI unit labels: m, N, N*m, Pa, N/m, kg/m^3, rad. */
export function unitsSI(): UnitSystem {
  return Object.freeze({
    version: "1",
    length: "m",
    force: "N",
    moment: "N*m",
    modulus: "Pa",
    distributedForce: "N/m",
    density: "kg/m^3",
    rotation: "rad",
  });
}
