function canonicalString(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "number") return Object.is(value, -0) ? "0" : JSON.stringify(value);
  if (typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((entry) => canonicalString(entry)).join(",")}]`;
  if (typeof value === "object") {
    const record = value as Readonly<Record<string, unknown>>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalString(record[key])}`).join(",")}}`;
  }
  return JSON.stringify(String(value));
}

export function computeModelFingerprint(value: unknown): string {
  const text = canonicalString(value);
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `fnv1a32:${hash.toString(16).padStart(8, "0")}`;
}
