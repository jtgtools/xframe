# Documentation Audit

Part 15 documentation is guarded by executable tests:

- `test/integration/documented-examples.test.ts` executes the public building examples (two-story frame, industrial portal, tower grid, building JSON) and checks drift, reactions, combinations, envelopes, and canonical outputs.
- `test/specification/documentation.test.ts` requires every public document, checks explicit scope/unit/CSV/professional-review/certification/schema/OpenSees statements, rejects placeholders, and resolves local Markdown links.

The public documents describe only implemented version 0.0.2 behavior. OpenSees Tcl (no openseespy) is named only as an external verification oracle. No OpenSees executable or source is distributed. Unsupported analyses and the absence of formal certification are explicit in the README and engineering-use document.

Acceptance commands and final repository scans are recorded in `final-audit.md` during Part 16.

## Acceptance result

On 2026-07-31, `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm run test`, `npm run verify`, `npm run build`, `npm run coverage`, and `npm run check` completed successfully in the available sandbox toolchain. The full behavioral suite reported 58 files and 196 passing tests; the independent verification suite reported 6 files and 35 passing tests. Native coverage metrics remain deferred to the final clean-install audit because the sandbox package mirror does not provide the pinned Vitest coverage package.
