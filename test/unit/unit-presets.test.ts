import { expect, it } from "vitest";
import { parseUnitSystem } from "../../src/units/unit-system.js";
import { unitsSI } from "../../src/units/unit-presets.js";

it("returns the exact SI unit labels", () => {
  expect(unitsSI()).toEqual({
    version: "1",
    length: "m",
    force: "N",
    moment: "N*m",
    modulus: "Pa",
    distributedForce: "N/m",
    density: "kg/m^3",
    rotation: "rad",
  });
});

it("returns a frozen unit system accepted by the version-one parser", () => {
  const units = unitsSI();
  expect(Object.isFrozen(units)).toBe(true);
  expect(parseUnitSystem(units)).toEqual(units);
});

it("returns equal values on repeated calls without shared mutation", () => {
  expect(unitsSI()).toEqual(unitsSI());
  expect(unitsSI()).not.toBe(unitsSI());
});
