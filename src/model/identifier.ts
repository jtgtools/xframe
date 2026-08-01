import { XFrameError } from "../errors/xframe-error.js";

const entityIdBrand: unique symbol = Symbol("EntityId");
const MAX_IDENTIFIER_CODE_POINTS = 128;
const FORMULA_PREFIX = /^[=+\-@]/u;
const UNICODE_WHITESPACE = /\p{White_Space}/u;
const CONTROL_OR_FORMAT = /[\p{Cc}\p{Cf}]/u;

export type EntityId = string & { readonly [entityIdBrand]: true };

export function compareIdentifiers(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function invalidIdentifier(
  path: string,
  reason: "type" | "empty" | "whitespace" | "control-character" | "formula-prefix" | "too-long",
  value?: string,
): never {
  throw new XFrameError("IDENTIFIER_INVALID", `Invalid identifier at ${path}.`, {
    kind: "identifier",
    path,
    reason,
    ...(value === undefined ? {} : { value }),
    ...(reason === "too-long" ? { maximumCodePoints: MAX_IDENTIFIER_CODE_POINTS } : {}),
  });
}

export function parseIdentifier(value: unknown, path: string): EntityId {
  if (typeof value !== "string") {
    invalidIdentifier(path, "type");
  }

  const normalized = value.normalize("NFC");
  if (normalized.length === 0) {
    invalidIdentifier(path, "empty", normalized);
  }
  if (UNICODE_WHITESPACE.test(normalized)) {
    invalidIdentifier(path, "whitespace", normalized);
  }
  if (CONTROL_OR_FORMAT.test(normalized)) {
    invalidIdentifier(path, "control-character", normalized);
  }
  if (FORMULA_PREFIX.test(normalized)) {
    invalidIdentifier(path, "formula-prefix", normalized);
  }
  if ([...normalized].length > MAX_IDENTIFIER_CODE_POINTS) {
    invalidIdentifier(path, "too-long", normalized);
  }

  return normalized as EntityId;
}
