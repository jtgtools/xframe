import { describe, expect, it } from "vitest";
import { parseIdentifier } from "../../src/model/identifier.js";
import { XFrameError } from "../../src/errors/xframe-error.js";

function codeOf(action: () => unknown): string | undefined {
  try {
    action();
  } catch (error) {
    return error instanceof XFrameError ? error.code : undefined;
  }
  return undefined;
}

describe("parseIdentifier", () => {
  it("FR-MOD-003: accepts prototype-like identifiers because storage is Map-based", () => {
    for (const value of ["__proto__", "constructor", "prototype", "toString"]) {
      expect(parseIdentifier(value, "id")).toBe(value);
    }
  });

  it("FR-MOD-003: normalizes canonically equivalent Unicode identifiers to NFC", () => {
    expect(parseIdentifier("e\u0301", "id")).toBe("é");
  });

  it("FR-MOD-003: rejects empty, whitespace-bearing, control-character, and formula-prefixed identifiers", () => {
    for (const value of ["", " ", " a", "a ", "a b", "a\n", "a\u0000b", "=SUM(A1)", "+cmd", "-1", "@name"]) {
      expect(codeOf(() => parseIdentifier(value, "id"))).toBe("IDENTIFIER_INVALID");
    }
  });

  it("FR-MOD-003: rejects identifiers longer than 128 Unicode code points", () => {
    expect(codeOf(() => parseIdentifier("a".repeat(129), "id"))).toBe("IDENTIFIER_INVALID");
    expect(parseIdentifier("😀".repeat(128), "id")).toBe("😀".repeat(128));
  });
});

it("FR-MOD-003: rejects boxed strings and other non-string identifier values", () => {
  expect(codeOf(() => parseIdentifier(new String("alpha"), "id"))).toBe("IDENTIFIER_INVALID");
  expect(codeOf(() => parseIdentifier(42, "id"))).toBe("IDENTIFIER_INVALID");
});
