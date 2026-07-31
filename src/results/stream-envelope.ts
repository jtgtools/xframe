import { XFrameError } from "../errors/xframe-error.js";
import { parseIdentifier } from "../model/identifier.js";
import type {
  EnvelopeComponent,
  EnvelopeExtreme,
  EnvelopeGoverning,
  EnvelopeInputRecord,
  StreamingEnvelope,
} from "./result-types.js";

function incompatible(resultIds: readonly string[], reason: string): never {
  throw new XFrameError("RESULT_INCOMPATIBLE", "Envelope input is incompatible.", {
    kind: "result",
    resultIds: Object.freeze([...resultIds]),
    reason,
  });
}

function normalized(value: number, resultId: string, index: number): number {
  if (!Number.isFinite(value)) incompatible([resultId], `nonfinite value at index ${index}`);
  return Object.is(value, -0) ? 0 : value;
}

function governor(
  record: EnvelopeInputRecord,
  component: EnvelopeComponent,
  extremum: "minimum" | "maximum",
): EnvelopeGoverning {
  return Object.freeze({
    resultId: parseIdentifier(record.resultId, "envelope.resultId"),
    resultKind: record.resultKind,
    component: component.component,
    entityId: component.entityId,
    ...(component.location === undefined ? {} : { location: component.location }),
    extremum,
  });
}

function frozen(values: readonly { readonly value: number; readonly governing: readonly EnvelopeGoverning[] }[]): readonly EnvelopeExtreme[] {
  return Object.freeze(
    values.map(({ value, governing }) =>
      Object.freeze({ value, governing: Object.freeze([...governing]) }),
    ),
  );
}

export function streamEnvelope(
  records: Iterable<EnvelopeInputRecord>,
  componentsInput: readonly EnvelopeComponent[],
): StreamingEnvelope {
  if (componentsInput.length === 0) incompatible([], "at least one component is required");
  const components = Object.freeze(
    componentsInput.map((component, index) => {
      if (typeof component.component !== "string" || component.component.length === 0) {
        incompatible([], `component ${index} has an invalid name`);
      }
      const entityId = parseIdentifier(component.entityId, `envelope.components[${index}].entityId`);
      if (component.location !== undefined && !Number.isFinite(component.location)) {
        incompatible([], `component ${index} has a nonfinite location`);
      }
      return Object.freeze({
        component: component.component,
        entityId,
        ...(component.location === undefined ? {} : { location: Object.is(component.location, -0) ? 0 : component.location }),
      });
    }),
  );
  const seen = new Set<string>();
  const minimum: { value: number; governing: EnvelopeGoverning[] }[] = [];
  const maximum: { value: number; governing: EnvelopeGoverning[] }[] = [];
  let count = 0;
  for (const record of records) {
    const resultId = parseIdentifier(record.resultId, "envelope.resultId");
    if (record.resultKind !== "case" && record.resultKind !== "combination") {
      incompatible([resultId], "resultKind must be case or combination");
    }
    if (seen.has(resultId)) incompatible([resultId], "duplicate result identifier");
    seen.add(resultId);
    if (record.values.length !== components.length) {
      incompatible([resultId], `expected ${components.length} values, received ${record.values.length}`);
    }
    for (let index = 0; index < components.length; index += 1) {
      const value = normalized(record.values[index]!, resultId, index);
      if (count === 0) {
        minimum.push({ value, governing: [governor(record, components[index]!, "minimum")] });
        maximum.push({ value, governing: [governor(record, components[index]!, "maximum")] });
        continue;
      }
      if (value < minimum[index]!.value) {
        minimum[index] = { value, governing: [governor(record, components[index]!, "minimum")] };
      } else if (value === minimum[index]!.value) {
        minimum[index]!.governing.push(governor(record, components[index]!, "minimum"));
      }
      if (value > maximum[index]!.value) {
        maximum[index] = { value, governing: [governor(record, components[index]!, "maximum")] };
      } else if (value === maximum[index]!.value) {
        maximum[index]!.governing.push(governor(record, components[index]!, "maximum"));
      }
    }
    count += 1;
  }
  if (count === 0) incompatible([], "empty source");
  return Object.freeze({ count, components, minimum: frozen(minimum), maximum: frozen(maximum) });
}
