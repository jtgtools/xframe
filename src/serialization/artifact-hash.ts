import { XFrameError } from "../errors/xframe-error.js";
import { canonicalJson } from "./canonical-json.js";

/** Returns the SHA-256 digest of canonical JSON using the browser-compatible Web Crypto API. */
export async function artifactHash(value: unknown): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (subtle === undefined) {
    throw new XFrameError("UNSUPPORTED_FEATURE", "Web Crypto is unavailable in this runtime.", {
      kind: "unsupported-feature",
      feature: "SHA-256 artifact hashing",
      reason: "globalThis.crypto.subtle is unavailable",
    });
  }
  const digest = await subtle.digest("SHA-256", new TextEncoder().encode(canonicalJson(value)));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
