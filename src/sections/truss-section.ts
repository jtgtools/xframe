import { XFrameError } from "../errors/xframe-error.js";
import type { TrussSectionInput, TrussSectionRecord } from "../model/domain-records.js";
import { parseIdentifier } from "../model/identifier.js";

const ALLOWED_KEYS = new Set(["id", "area"]);

function sectionError(path: string, expected: string, actual: unknown): never {
  throw new XFrameError("SECTION_INVALID", "Truss section data is invalid.", {
    kind: "input",
    path,
    expected,
    actual: String(actual),
  });
}

export function createTrussSection(input: TrussSectionInput): TrussSectionRecord {
  for (const key of Object.keys(input)) {
    if (!ALLOWED_KEYS.has(key)) {
      sectionError(`trussSection.${key}`, "id or area only", key);
    }
  }
  if (typeof input.area !== "number" || !Number.isFinite(input.area) || input.area <= 0) {
    sectionError("trussSection.area", "positive finite number", input.area);
  }
  return Object.freeze({ id: parseIdentifier(input.id, "trussSection.id"), area: input.area });
}
