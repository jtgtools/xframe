import { describe, expect, it } from "vitest";
import { XFrameError } from "../../src/errors/xframe-error.js";
import {
  assertFrameSectionSupportsTheory,
  createFrameSection,
} from "../../src/sections/frame-section.js";
import { createTrussSection } from "../../src/sections/truss-section.js";

function codeOf(action: () => unknown): string | undefined {
  try {
    action();
  } catch (error) {
    return error instanceof XFrameError ? error.code : undefined;
  }
  return undefined;
}

const frameSectionInput = {
  id: "wide-flange",
  area: 0.01,
  torsionalConstant: 1e-5,
  momentOfInertiaY: 2e-5,
  momentOfInertiaZ: 3e-5,
} as const;

describe("frame sections", () => {
  it("FR-SEC-001: creates a principal-axis frame section without retaining caller data", () => {
    const section = createFrameSection(frameSectionInput);

    expect(section).toEqual(frameSectionInput);
    expect(Object.isFrozen(section)).toBe(true);
  });

  it("FR-SEC-002: requires effective shear areas only for Timoshenko theory", () => {
    const euler = createFrameSection(frameSectionInput);
    expect(assertFrameSectionSupportsTheory(euler, { kind: "euler-bernoulli" })).toBeUndefined();
    expect(codeOf(() => assertFrameSectionSupportsTheory(euler, { kind: "timoshenko" }))).toBe(
      "SECTION_INVALID",
    );

    const timoshenko = createFrameSection({
      ...frameSectionInput,
      shearAreaY: 0.008,
      shearAreaZ: 0.007,
    });
    expect(assertFrameSectionSupportsTheory(timoshenko, { kind: "timoshenko" })).toBeUndefined();
  });

  it("FR-SEC-003: rejects nonfinite or nonpositive consumed frame properties", () => {
    for (const [key, value] of [
      ["area", 0],
      ["torsionalConstant", -1],
      ["momentOfInertiaY", Number.NaN],
      ["momentOfInertiaZ", Number.POSITIVE_INFINITY],
      ["shearAreaY", 0],
    ] as const) {
      expect(codeOf(() => createFrameSection({ ...frameSectionInput, [key]: value }))).toBe(
        "SECTION_INVALID",
      );
    }
  });
});

describe("truss sections", () => {
  it("FR-SEC-001: creates an axial-area-only truss section", () => {
    expect(createTrussSection({ id: "bar", area: 0.002 })).toEqual({ id: "bar", area: 0.002 });
  });

  it("FR-SEC-001: rejects frame-only properties and invalid axial area", () => {
    expect(
      codeOf(() => createTrussSection({ id: "bar", area: 0.002, momentOfInertiaY: 1 } as never)),
    ).toBe("SECTION_INVALID");
    expect(codeOf(() => createTrussSection({ id: "bar", area: 0 }))).toBe("SECTION_INVALID");
  });
});
