const rules = [
  { pattern: /(?:from\s+|import\s*\()\s*["']node:/u, reason: "Node built-in import" },
  { pattern: /\bprocess\s*\./u, reason: "process global" },
  { pattern: /\bBuffer\b/u, reason: "Buffer global" },
  { pattern: /\b__dirname\b|\b__filename\b/u, reason: "CommonJS path global" },
  { pattern: /\brequire\s*\(/u, reason: "CommonJS require" },
];

/** Returns the distinct browser-runtime boundary violation reasons found in source text. */
export function findRuntimeBoundaryViolations(source) {
  const violations = [];
  for (const rule of rules) {
    if (rule.pattern.test(source)) violations.push(rule.reason);
  }
  return violations;
}
