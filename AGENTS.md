# AGENTS.md

Rules for every agent working in this repository.

## Toolchain

- npm only. Never Bun, pnpm, or Yarn.
- Vitest only. Never Jest or the Node built-in test runner.
- TypeScript with standards-compliant ESM.
- Runtime modules stay browser-safe (no Node-only imports in runtime code).
- Bundle with tsdown into single-file `dist/index.js` plus `dist/index.d.ts`.
- Never deep-import from `dist/`; scripts and benchmarks use the public entry.

## Testing discipline

- Strict TDD: every behavior starts with a failing Vitest test.
- Use plain behavioral test titles with no ID prefixes.
- RED first, then GREEN; confirm the failure is for the intended reason.
- Never use `.skip`, `.only`, or `.todo`.
- Never weaken a tolerance without written mathematical justification.

## No silent physics

- Never add hidden restraints, arbitrary stiffness, epsilon fixes, or swallowed errors.
- Unsupported features fail with stable structured error codes; never silently approximate.

## Determinism and safety

- No dense global numerical allocation.
- Untrusted IDs and JSON are never stored in ordinary object prototypes.
- Non-finite values are rejected at public boundaries.

## Completion gate

- During work, run only what the edit touches: `npx vitest run <file>` for the narrow test, `npm run typecheck` when types changed, `npm run lint`/`npm run format:check` on the touched files.
- `npm run check` (format, lint, typecheck, tests, coverage, verify, build) runs once per part, at acceptance. Coverage is the slow gate — never run it per edit.
- Never claim completion while any of these fails.

## Naming

- Lowercase kebab-case filenames everywhere except: `AGENTS.md`, `README.md`, `LICENSE`, `SECURITY.md`, `*.config.ts`.
