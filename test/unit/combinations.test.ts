import { describe, expect, it } from "vitest";
import { XFrameError } from "../../src/errors/xframe-error.js";
import { createLoadCombination } from "../../src/loads/load-combination.js";
import { createModelBuilder } from "../../src/model/model-builder.js";

const units = { version: "1", length: "m", force: "N", moment: "N*m", modulus: "Pa", distributedForce: "N/m", density: "kg/m^3", rotation: "rad" } as const;
function base() {
  return createModelBuilder().setUnitSystem(units)
    .addNode({ id: "a", coordinates: [0, 0, 0] })
    .addSpring({ id: "s", startNodeId: "a", stiffness: { tx: 1 } });
}

describe("load combinations", () => {
  it("FR-MOD-004: validates nonempty finite unique factor arrays", () => {
    expect(createLoadCombination({ id: "C", factors: [{ resultId: "L", factor: 1.2 }] })).toEqual({ id: "C", factors: [{ resultId: "L", factor: 1.2 }] });
    expect(() => createLoadCombination({ id: "C", factors: [] })).toThrow(XFrameError);
    expect(() => createLoadCombination({ id: "C", factors: [{ resultId: "L", factor: 1 }, { resultId: "L", factor: 2 }] })).toThrow(XFrameError);
  });

  it("FR-MOD-004: cases and combinations share one result identifier domain", () => {
    const builder = base().addLoadCase({ id: "same", loads: [] }).addCombination({ id: "same", factors: [{ resultId: "same", factor: 1 }] });
    try { builder.finalize(); throw new Error("expected failure"); } catch (error) {
      expect(error).toBeInstanceOf(XFrameError);
      expect((error as XFrameError).code).toBe("RESULT_INCOMPATIBLE");
    }
  });

  it("FR-MOD-004: rejects missing result references and deterministic nested cycles", () => {
    expect(() => base().addCombination({ id: "C", factors: [{ resultId: "missing", factor: 1 }] }).finalize()).toThrow(XFrameError);
    const cyclic = base()
      .addCombination({ id: "A", factors: [{ resultId: "B", factor: 1 }] })
      .addCombination({ id: "B", factors: [{ resultId: "A", factor: 1 }] });
    try { cyclic.finalize(); throw new Error("expected failure"); } catch (error) {
      expect(error).toBeInstanceOf(XFrameError);
      expect((error as XFrameError).code).toBe("RESULT_INCOMPATIBLE");
      expect((error as XFrameError).context).toEqual({ kind: "result", resultIds: ["A", "B", "A"], reason: "combination cycle" });
    }
  });

  it("FR-RES-006: stores deterministic combination evaluation order", () => {
    const model = base()
      .addLoadCase({ id: "L", loads: [] })
      .addCombination({ id: "B", factors: [{ resultId: "L", factor: 2 }] })
      .addCombination({ id: "A", factors: [{ resultId: "B", factor: 3 }] })
      .finalize();
    expect(model.combinationEvaluationOrder).toEqual(["B", "A"]);
  });
});
