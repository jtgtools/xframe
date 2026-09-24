import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Default `npm test` runs unit, integration, regression, property,
    // specification, and verification suites. `npm run verify` re-runs only
    // verification/** for focused literature/OpenSees checks.
    include: ["test/**/*.test.ts", "verification/**/*.test.ts"],
    passWithNoTests: false,
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      // Pure type declarations emit no executable statements; excluding them
      // keeps function/branch thresholds meaningful instead of vacuous.
      exclude: ["src/loads/load-types.ts", "src/model/finalized-model.ts"],
      thresholds: {
        statements: 95,
        lines: 95,
        functions: 95,
        branches: 90,
      },
    },
  },
});
