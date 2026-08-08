import { describe, expect, it } from "vitest";
import { Registry } from "../../src/model/registry.js";
import { parseIdentifier } from "../../src/model/identifier.js";
import { XFrameError } from "../../src/errors/xframe-error.js";

interface Item {
  readonly id: ReturnType<typeof parseIdentifier>;
  readonly value: number;
}

function item(id: string, value: number): Item {
  return Object.freeze({ id: parseIdentifier(id, "item.id"), value });
}

describe("Registry", () => {
  it("FR-MOD-003: preserves deterministic insertion order for prototype-like IDs", () => {
    const registry = new Registry<Item>("item");
    registry.add(item("constructor", 1));
    registry.add(item("__proto__", 2));
    registry.add(item("alpha", 3));

    expect(registry.values().map((entry) => entry.id)).toEqual([
      "constructor",
      "__proto__",
      "alpha",
    ]);
  });

  it("FR-MOD-003: rejects duplicates with a stable code and entity context", () => {
    const registry = new Registry<Item>("item");
    registry.add(item("alpha", 1));

    let caught: unknown;
    try {
      registry.add(item("alpha", 2));
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(XFrameError);
    if (!(caught instanceof XFrameError)) throw new Error("Expected duplicate identifier failure.");
    expect(caught.code).toBe("DUPLICATE_IDENTIFIER");
    expect(caught.context).toEqual({
      kind: "duplicate-identifier",
      entityType: "item",
      id: "alpha",
    });
  });

  it("FR-MOD-005: commits registry transactions atomically and rolls back failures", () => {
    const registry = new Registry<Item>("item");
    registry.add(item("base", 0));

    expect(() =>
      registry.transaction((draft) => {
        draft.add(item("new", 1));
        draft.add(item("base", 2));
      }),
    ).toThrow(XFrameError);
    expect(registry.values()).toEqual([item("base", 0)]);

    registry.transaction((draft) => {
      draft.add(item("new", 1));
      draft.add(item("next", 2));
    });
    expect(registry.values().map((entry) => entry.id)).toEqual(["base", "new", "next"]);
  });
});
