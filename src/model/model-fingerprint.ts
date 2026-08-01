import { canonicalJson } from "../serialization/canonical-json.js";
import { sha256Hex } from "../serialization/sha-256.js";

export function computeModelFingerprint(value: unknown): string {
  return `sha256:${sha256Hex(canonicalJson(value))}`;
}
