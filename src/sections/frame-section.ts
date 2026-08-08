import { XFrameError } from "../errors/xframe-error.js";
import type { FrameTheory } from "../elements/frame-theory.js";
import type { FrameSectionInput, FrameSectionRecord } from "../model/domain-records.js";
import { parseIdentifier } from "../model/identifier.js";

const ALLOWED_KEYS = new Set([
  "id",
  "area",
  "torsionalConstant",
  "momentOfInertiaY",
  "momentOfInertiaZ",
  "shearAreaY",
  "shearAreaZ",
]);

function sectionError(path: string, expected: string, actual: unknown): never {
  throw new XFrameError("SECTION_INVALID", "Frame section data is invalid.", {
    kind: "input",
    path,
    expected,
    actual: String(actual),
  });
}

function positive(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    sectionError(path, "positive finite number", value);
  }
  return value;
}

export function createFrameSection(input: FrameSectionInput): FrameSectionRecord {
  for (const key of Object.keys(input)) {
    if (!ALLOWED_KEYS.has(key)) {
      sectionError(`frameSection.${key}`, "recognized frame-section property", key);
    }
  }
  const shearAreaY =
    input.shearAreaY === undefined
      ? undefined
      : positive(input.shearAreaY, "frameSection.shearAreaY");
  const shearAreaZ =
    input.shearAreaZ === undefined
      ? undefined
      : positive(input.shearAreaZ, "frameSection.shearAreaZ");
  return Object.freeze({
    id: parseIdentifier(input.id, "frameSection.id"),
    area: positive(input.area, "frameSection.area"),
    torsionalConstant: positive(input.torsionalConstant, "frameSection.torsionalConstant"),
    momentOfInertiaY: positive(input.momentOfInertiaY, "frameSection.momentOfInertiaY"),
    momentOfInertiaZ: positive(input.momentOfInertiaZ, "frameSection.momentOfInertiaZ"),
    ...(shearAreaY === undefined ? {} : { shearAreaY }),
    ...(shearAreaZ === undefined ? {} : { shearAreaZ }),
  });
}

export function assertFrameSectionSupportsTheory(
  section: FrameSectionRecord,
  theory: FrameTheory,
): void {
  if (
    theory.kind === "timoshenko" &&
    (section.shearAreaY === undefined || section.shearAreaZ === undefined)
  ) {
    sectionError(
      "frameSection",
      "positive shearAreaY and shearAreaZ for Timoshenko theory",
      `${String(section.shearAreaY)},${String(section.shearAreaZ)}`,
    );
  }
}
