import { XFrameError } from "../errors/xframe-error.js";
import type { DofName, SpringInput, SpringRecord, SpringStiffnessInput } from "../model/domain-records.js";
import { parseIdentifier } from "../model/identifier.js";

const DOFS: readonly DofName[] = ["tx", "ty", "tz", "rx", "ry", "rz"];
type SpringComponents = readonly [number, number, number, number, number, number];

function springError(path: string, expected: string, actual: unknown): never {
  throw new XFrameError("INPUT_INVALID", "Spring element data is invalid.", {
    kind: "input",
    path,
    expected,
    actual: String(actual),
  });
}

function component(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    springError(path, "nonnegative finite stiffness", value);
  }
  return Object.is(value, -0) ? 0 : value;
}

function normalizeStiffness(value: SpringStiffnessInput): SpringComponents {
  let components: number[];
  if (Array.isArray(value)) {
    if (value.length !== 6) springError("spring.stiffness", "array of six component stiffnesses", value.length);
    components = value.map((entry, index) => component(entry, `spring.stiffness[${index}]`));
  } else if (value !== null && typeof value === "object") {
    const record = value as Readonly<Partial<Record<DofName, number>>>;
    for (const key of Object.keys(record)) {
      if (!DOFS.includes(key as DofName)) springError(`spring.stiffness.${key}`, "recognized DOF component", key);
    }
    components = DOFS.map((dof) => component(record[dof] ?? 0, `spring.stiffness.${dof}`));
  } else {
    springError("spring.stiffness", "array or component object", typeof value);
  }
  if (!components.some((entry) => entry > 0)) {
    springError("spring.stiffness", "at least one positive component", components.join(","));
  }
  return Object.freeze(components) as SpringComponents;
}

export function createSpringElement(input: SpringInput): SpringRecord {
  const startNodeId = parseIdentifier(input.startNodeId, "spring.startNodeId");
  const endNodeId = input.endNodeId === undefined ? undefined : parseIdentifier(input.endNodeId, "spring.endNodeId");
  if (endNodeId === startNodeId) {
    springError("spring.endNodeId", "identifier different from startNodeId", endNodeId);
  }
  const stiffness = normalizeStiffness(input.stiffness);
  return Object.freeze({
    id: parseIdentifier(input.id, "spring.id"),
    startNodeId,
    ...(endNodeId === undefined ? {} : { endNodeId }),
    stiffness,
  });
}
