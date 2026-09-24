import { XFrameError } from "../errors/xframe-error.js";
import { canonicalJson } from "./canonical-json.js";
import { DEFAULT_HASH_MEMORY_LIMIT_BYTES } from "./sha-256.js";

/** Returns the SHA-256 digest of canonical JSON using the browser-compatible Web Crypto API. */
export async function artifactHash(
  value: unknown,
  memoryLimitBytes = DEFAULT_HASH_MEMORY_LIMIT_BYTES,
): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (subtle === undefined) {
    throw new XFrameError("UNSUPPORTED_FEATURE", "Web Crypto is unavailable in this runtime.", {
      kind: "unsupported-feature",
      feature: "SHA-256 artifact hashing",
      reason: "globalThis.crypto.subtle is unavailable",
    });
  }
  const encoded = new TextEncoder().encode(canonicalJson(value));
  if (encoded.length > memoryLimitBytes) {
    throw new XFrameError(
      "MEMORY_LIMIT_EXCEEDED",
      "Artifact hash input exceeds the configured memory limit.",
      {
        kind: "memory",
        operation: "artifact-hash",
        estimatedBytes: encoded.length,
        limitBytes: memoryLimitBytes,
      },
    );
  }
  const digest = await subtle.digest("SHA-256", encoded);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
