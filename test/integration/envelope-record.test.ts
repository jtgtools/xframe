import { expect, it } from "vitest";
import { prepareAnalysis } from "../../src/analysis/prepare-analysis.js";
import { XFrameError } from "../../src/errors/xframe-error.js";
import { createModelBuilder } from "../../src/model/model-builder.js";
import { createEnvelopeCompatibility, streamEnvelope } from "../../src/results/stream-envelope.js";
import { envelopeRecord } from "../../src/results/envelope-record.js";
import type { EnvelopeComponent } from "../../src/results/result-types.js";
import { unitsSI } from "../../src/units/unit-presets.js";

function cantilever() {
  const builder = createModelBuilder()
    .setUnitSystem(unitsSI())
    .addNode({ id: "a", coordinates: [0, 0, 0] })
    .addNode({ id: "b", coordinates: [4, 0, 0] })
    .addMaterial({ id: "m", elasticModulus: 200e9, poissonRatio: 0.3 })
    .addFrameSection({
      id: "s",
      area: 0.02,
      torsionalConstant: 1e-5,
      momentOfInertiaY: 3e-5,
      momentOfInertiaZ: 4e-5,
    })
    .addTrussSection({ id: "t", area: 0.003 })
    .addFrame({
      id: "f",
      startNodeId: "a",
      endNodeId: "b",
      materialId: "m",
      sectionId: "s",
      theory: { kind: "euler-bernoulli" },
      orientation: [0, 1, 0],
    })
    .addTruss({ id: "t", startNodeId: "a", endNodeId: "b", materialId: "m", sectionId: "t" })
    .addSpring({ id: "k", startNodeId: "b", stiffness: { uy: 10e6 } })
    .fixNode("a")
    .addLoadCase({ id: "P", loads: [{ kind: "nodal", nodeId: "b", force: [0, -8000, 0] }] })
    .addLoadCase({ id: "2P", loads: [{ kind: "nodal", nodeId: "b", force: [0, -16000, 0] }] });
  return prepareAnalysis(builder.finalize());
}

const components = Object.freeze([
  { component: "uy", entityId: "b" },
  { component: "reaction.uy", entityId: "a" },
  { component: "axialForce", entityId: "t" },
  { component: "force.uy", entityId: "k" },
] satisfies readonly EnvelopeComponent[]);

function handValues(result: ReturnType<ReturnType<typeof prepareAnalysis>["solveCase"]>) {
  const tip = result.nodes.find(({ id }) => id === "b")!;
  const base = result.nodes.find(({ id }) => id === "a")!;
  return [
    tip.displacements.find(({ dof }) => dof === "uy")!.value,
    base.reactions.find(({ dof }) => dof === "uy")!.value,
    result.trusses.find(({ id }) => id === "t")!.axialForce,
    result.springs.find(({ id }) => id === "k")!.globalEndForces[1]!,
  ];
}

function incompatible(action: () => unknown): XFrameError {
  let thrown: unknown;
  try {
    action();
  } catch (error) {
    thrown = error;
  }
  if (!(thrown instanceof XFrameError)) throw new Error("expected RESULT_INCOMPATIBLE");
  expect(thrown.code).toBe("RESULT_INCOMPATIBLE");
  return thrown;
}

it("resolves nodal, truss, and spring values in component order", () => {
  const prepared = cantilever();
  const result = prepared.solveCase("P");
  const record = envelopeRecord(result, components);
  expect(record.resultId).toBe(result.id);
  expect(record.resultKind).toBe("case");
  expect(record.compatibility).toEqual(createEnvelopeCompatibility(result, components));
  expect(Array.from(record.values)).toEqual(handValues(result));
  expect(Object.isFrozen(record)).toBe(true);
});

it("streams records from two load cases into exact extrema", () => {
  const prepared = cantilever();
  const first = prepared.solveCase("P");
  const second = prepared.solveCase("2P");
  const envelope = streamEnvelope(
    [envelopeRecord(first, components), envelopeRecord(second, components)],
    components,
  );
  expect(envelope.count).toBe(2);
  const expected = handValues(first);
  const doubled = handValues(second);
  for (let index = 0; index < expected.length; index += 1) {
    expect(envelope.minimum[index]!.value).toBe(Math.min(expected[index]!, doubled[index]!));
    expect(envelope.maximum[index]!.value).toBe(Math.max(expected[index]!, doubled[index]!));
  }
});

it("rejects an unknown component name", () => {
  const result = cantilever().solveCase("P");
  const error = incompatible(() =>
    envelopeRecord(result, [{ component: "bendingZ", entityId: "f" }]),
  );
  expect(error.context).toMatchObject({ reason: "unknown envelope component" });
});

it("rejects a component location without frame station support", () => {
  const result = cantilever().solveCase("P");
  const error = incompatible(() =>
    envelopeRecord(result, [{ component: "uy", entityId: "b", location: 2 }]),
  );
  expect(error.context).toMatchObject({ reason: "component location is not supported" });
});

it("rejects an entity missing from the result", () => {
  const result = cantilever().solveCase("P");
  const error = incompatible(() =>
    envelopeRecord(result, [{ component: "uy", entityId: "ghost" }]),
  );
  expect(error.context).toMatchObject({ reason: "missing entity" });
});

it("rejects a two-node spring force without an explicit end", () => {
  const builder = createModelBuilder()
    .setUnitSystem(unitsSI())
    .addNode({ id: "a", coordinates: [0, 0, 0] })
    .addNode({ id: "b", coordinates: [3, 0, 0] })
    .addMaterial({ id: "m", elasticModulus: 200e9, poissonRatio: 0.3 })
    .addFrameSection({
      id: "s",
      area: 0.02,
      torsionalConstant: 1e-5,
      momentOfInertiaY: 3e-5,
      momentOfInertiaZ: 4e-5,
    })
    .addFrame({
      id: "f",
      startNodeId: "a",
      endNodeId: "b",
      materialId: "m",
      sectionId: "s",
      theory: { kind: "euler-bernoulli" },
      orientation: [0, 1, 0],
    })
    .addSpring({ id: "k", startNodeId: "a", endNodeId: "b", stiffness: { uy: 10e6 } })
    .fixNode("a")
    .addLoadCase({ id: "P", loads: [{ kind: "nodal", nodeId: "b", force: [0, -8000, 0] }] });
  const result = prepareAnalysis(builder.finalize()).solveCase("P");
  const error = incompatible(() =>
    envelopeRecord(result, [{ component: "force.uy", entityId: "k" }]),
  );
  expect(error.context).toMatchObject({ reason: "two-node spring forces need an explicit end" });
});

it("rejects a non-finite extracted value", () => {
  const result = cantilever().solveCase("P");
  const forged = {
    ...result,
    nodes: result.nodes.map((node) =>
      node.id === "b"
        ? {
            ...node,
            displacements: node.displacements.map((entry) =>
              entry.dof === "uy" ? { ...entry, value: Number.NaN } : entry,
            ),
          }
        : node,
    ),
  };
  const error = incompatible(() => envelopeRecord(forged, [{ component: "uy", entityId: "b" }]));
  expect(error.context).toMatchObject({ reason: "non-finite value for b.uy" });
});

it("rejects a degree of freedom absent from the node result", () => {
  const builder = createModelBuilder()
    .setUnitSystem(unitsSI())
    .addNode({ id: "a", coordinates: [0, 0, 0] })
    .addNode({ id: "b", coordinates: [3, 0, 0] })
    .addMaterial({ id: "m", elasticModulus: 210e9, poissonRatio: 0.3 })
    .addTrussSection({ id: "s", area: 0.003 })
    .addTruss({ id: "t", startNodeId: "a", endNodeId: "b", materialId: "m", sectionId: "s" })
    .supportNode("a", ["ux", "uy", "uz"])
    .supportNode("b", ["uy", "uz"])
    .addLoadCase({ id: "P", loads: [{ kind: "nodal", nodeId: "b", force: [12000, 0, 0] }] });
  const result = prepareAnalysis(builder.finalize()).solveCase("P");
  const error = incompatible(() =>
    envelopeRecord(result, [{ component: "reaction.rx", entityId: "a" }]),
  );
  expect(error.context).toMatchObject({ reason: "missing degree of freedom" });
});
