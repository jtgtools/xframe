import { XFrameError } from "../errors/xframe-error.js";
import type { CombinationRecord, LoadCaseRecord } from "../model/domain-records.js";
import type { EntityId } from "../model/identifier.js";

export interface ResultGraph {
  readonly evaluationOrder: readonly EntityId[];
}

export function validateResultGraph(
  loadCases: readonly LoadCaseRecord[],
  combinations: readonly CombinationRecord[],
): ResultGraph {
  const kinds = new Map<EntityId, "case" | "combination">();
  for (const loadCase of loadCases) kinds.set(loadCase.id, "case");
  for (const combination of combinations) {
    if (kinds.has(combination.id)) {
      throw new XFrameError(
        "RESULT_INCOMPATIBLE",
        "Cases and combinations share one result identifier domain.",
        {
          kind: "result",
          resultIds: [combination.id],
          reason: "duplicate case/combination result identifier",
        },
      );
    }
    kinds.set(combination.id, "combination");
  }
  const byId = new Map(combinations.map((combination) => [combination.id, combination]));
  for (const combination of combinations) {
    for (const factor of combination.factors) {
      if (!kinds.has(factor.resultId)) {
        throw new XFrameError("RESULT_INCOMPATIBLE", "Combination references a missing result.", {
          kind: "result",
          resultIds: [combination.id, factor.resultId],
          reason: "missing result reference",
        });
      }
    }
  }

  const state = new Map<EntityId, "visiting" | "done">();
  const stack: EntityId[] = [];
  const order: EntityId[] = [];
  const visit = (id: EntityId): void => {
    const current = state.get(id);
    if (current === "done") return;
    if (current === "visiting") {
      const start = stack.indexOf(id);
      const cycle = [...stack.slice(start), id];
      throw new XFrameError("RESULT_INCOMPATIBLE", "Combination graph contains a cycle.", {
        kind: "result",
        resultIds: Object.freeze(cycle),
        reason: "combination cycle",
      });
    }
    state.set(id, "visiting");
    stack.push(id);
    const combination = byId.get(id)!;
    for (const factor of combination.factors) if (byId.has(factor.resultId)) visit(factor.resultId);
    stack.pop();
    state.set(id, "done");
    order.push(id);
  };
  for (const combination of combinations) visit(combination.id);
  return Object.freeze({ evaluationOrder: Object.freeze(order) });
}
