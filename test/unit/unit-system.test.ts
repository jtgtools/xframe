import { describe, expect, it } from "vitest";
import { XFrameError } from "../../src/errors/xframe-error.js";
import { parseUnitSystem } from "../../src/units/unit-system.js";

const validUnits = {
  version: "1",
  length: "m",
  force: "N",
  moment: "N·m",
  modulus: "Pa",
  distributedForce: "N/m",
  density: "kg/m³",
  rotation: "rad",
} as const;

function errorCode(action: () => unknown): string | undefined {
  try {
    action();
  } catch (error) {
    return error instanceof XFrameError ? error.code : undefined;
  }
  return undefined;
}

describe("parseUnitSystem", () => {
  it("accepts and freezes the exact version-one unit schema", () => {
    const parsed = parseUnitSystem(validUnits);

    expect(parsed).toEqual(validUnits);
    expect(Object.isFrozen(parsed)).toBe(true);
  });

  it("rejects missing, additional, and misspelled unit keys", () => {
    const { density: _density, ...missing } = validUnits;
    expect(errorCode(() => parseUnitSystem(missing))).toBe("UNITS_INVALID");
    expect(errorCode(() => parseUnitSystem({ ...validUnits, mass: "kg" }))).toBe("UNITS_INVALID");
    expect(
      errorCode(() =>
        parseUnitSystem({ ...validUnits, distributedForce: undefined, distributed_force: "N/m" }),
      ),
    ).toBe("UNITS_INVALID");
  });

  it("rejects unsupported schema versions, empty labels, and non-radian rotations", () => {
    expect(errorCode(() => parseUnitSystem({ ...validUnits, version: "2" }))).toBe("UNITS_INVALID");
    expect(errorCode(() => parseUnitSystem({ ...validUnits, force: "" }))).toBe("UNITS_INVALID");
    expect(errorCode(() => parseUnitSystem({ ...validUnits, rotation: "deg" }))).toBe(
      "UNITS_INVALID",
    );
  });
});

it("attaches exact unit metadata to the model builder atomically", async () => {
  const { createModelBuilder } = await import("../../src/model/model-builder.js");
  const builder = createModelBuilder();

  expect(builder.setUnitSystem(validUnits)).toBe(builder);
  expect(builder.snapshot().unitSystem).toEqual(validUnits);

  const before = JSON.stringify(builder.snapshot());
  expect(() =>
    builder.addBatch({
      nodes: [{ id: "n1", coordinates: [0, 0, 0] }],
      unitSystem: { ...validUnits, rotation: "deg" },
    }),
  ).toThrow(XFrameError);
  expect(JSON.stringify(builder.snapshot())).toBe(before);
});
