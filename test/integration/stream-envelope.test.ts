import { expect, it } from "vitest";
import { XFrameError } from "../../src/errors/xframe-error.js";
import { streamEnvelope } from "../../src/results/stream-envelope.js";

const components = [
  { component: "tx", entityId: "n1" },
  { component: "bendingZ", entityId: "f1", location: 2 },
] as const;

it("FR-RES-006/FR-RES-007: streams 150000 records and retains complete deterministic extrema provenance", () => {
  function* records() {
    for (let index = 0; index < 150_000; index += 1) {
      yield { resultId: `R${index}`, resultKind: "case" as const, values: [index % 17 - 8, index % 23 - 11] };
    }
  }
  const envelope = streamEnvelope(records(), components);
  expect(envelope.count).toBe(150_000);
  expect(envelope.maximum[0]!.value).toBe(8);
  expect(envelope.maximum[0]!.governing[0]).toEqual({ resultId: "R16", resultKind: "case", component: "tx", entityId: "n1", extremum: "maximum" });
  expect(envelope.minimum[1]!.value).toBe(-11);
  expect(envelope.minimum[1]!.governing[0]).toEqual({ resultId: "R0", resultKind: "case", component: "bendingZ", entityId: "f1", location: 2, extremum: "minimum" });
  expect(Object.isFrozen(envelope)).toBe(true);
});

it("FR-RES-006: keeps every tied governor and normalizes negative zero", () => {
  const envelope = streamEnvelope([
    { resultId: "A", resultKind: "case", values: [-0, 2] },
    { resultId: "B", resultKind: "combination", values: [0, 2] },
  ], components);
  expect(Object.is(envelope.minimum[0]!.value, -0)).toBe(false);
  expect(envelope.maximum[1]!.governing.map(({ resultId }) => resultId)).toEqual(["A", "B"]);
});

it("FR-RES-006/NFR-COR-002: rejects empty, duplicate, malformed, mismatched, and non-finite records", () => {
  const invalid = [
    () => streamEnvelope([], components),
    () => streamEnvelope([{ resultId: "A", resultKind: "case", values: [1, 2] }, { resultId: "A", resultKind: "case", values: [2, 3] }], components),
    () => streamEnvelope([{ resultId: "", resultKind: "case", values: [1, 2] }], components),
    () => streamEnvelope([{ resultId: "A", resultKind: "case", values: [1] }], components),
    () => streamEnvelope([{ resultId: "A", resultKind: "case", values: [1, Number.NaN] }], components),
  ];
  for (const action of invalid) expect(action).toThrowError(XFrameError);
});
