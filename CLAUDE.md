# CLAUDE.md — Drug Interaction Safety Assistant

Conventions for working in this codebase. This file is **living** — append new gotchas as they're discovered during implementation; don't let them live only in commit messages or PR comments.

Project docs live in `docs/` (`01-charter-and-discovery.md` … `08-build-plan.md`); this file assumes familiarity with `05-system-architecture.md` (component IDs `SD-xxx`) and `02-requirements.md` (`REQ-xxx`).

## 1. Coding Conventions

**Repo layout** (pnpm workspace monorepo — reflects what's actually built, kept in sync as modules are added):

```
/apps
  /web                        SD-001 — React SPA
    /src/components           UI components; api.ts is the one place that calls the backend
    /src/graph                SCR-004 graph rendering: domain (toGraphElements.ts, pure) +
                               use case (loadRiskGraph.ts, depends on a RiskDetailFetcher port) +
                               real port impl (apiRiskDetailFetcher.ts, wraps api.ts). Same
                               domain/application/infrastructure shape as the layered backend
                               modules below, just on the frontend — no new backend endpoint was
                               needed, this reuses GET /risks/:id from V0.5.
    /src/risk                 REQ-015 severity ordering (severityOrder.ts) — pure domain rule, no
                               repository/endpoint needed since it only ever operates on data the
                               real risk-check endpoint already returned.
    /src/export                REQ-020 report export (V0.11): domain (exportReport.ts, pure —
                               `assertReportMatchesRisks` recomputes and compares rather than trusts)
                               + use case (exportRiskReport.ts, depends on a `ReportDownloader` port)
                               + real port impl (browserDownloader.ts — a real `Blob`/anchor download,
                               not a mock). No new backend endpoint; exports whatever risk-check already
                               returned.
    /src/components/ChatComposer.tsx  4 input modes live here side by side: typed text, mic dictation
                               (`chat/dictation.ts`), the structured form (`onOpenForm`), and prescription
                               upload (`onUploadPrescription`, PDF-only file input styled as an icon
                               button next to the mic/form buttons). All four ultimately call the same
                               `onSend`/`handleSend` in ChatPage — see `/api/prescription` below.
  /api                        SD-002..SD-006 — backend
    /src
      /lib/asyncHandler.ts    wraps every async route handler — see Known Gotchas
      /db                     SD-007 — Neo4j client + migration script (only place that imports neo4j-driver directly, outside module-level infrastructure/ folders)
      /modules
        /auth                 SD-003 — flat: *.repository.ts, *.service.ts, *.middleware.ts, *.routes.ts.
                               `auth.middleware.ts` exports both `requireAuth` (401 if missing/invalid
                               token) and `requireAdmin` (403 if authenticated but role !== admin, V0.10) —
                               `requireAdmin` must run after `requireAuth`, it reads `req.user` that sets.
        /drugs, /allergens,   simple reference-data modules — flat: *.repository.ts, *.routes.ts
        /diseases             (no business rule beyond "must exist" — enforced by whoever references them)
        /patients             layered (see below) — Requirements §3: a profile can't reference a
                               nonexistent drug/allergen/condition
        /interactions,        SD-004 — layered, one module per relationship type, each owning its own
        /allergy-links,       severity business rule (System Architecture §3) and a `find*Risks(...)`
        /contraindications    use case that returns the shared `Risk` shape. `interactions` additionally
                               owns `findInvolving` (V0.7) — the incremental-recheck query shape, scoped
                               to one drug against a given set, never a full pairwise scan.
        /risk-check           SD-004 orchestrator — no business rule of its own; resolves a patient's
                               profile once, then composes the three `find*Risks` calls. `POST /risk-check`
                               and `POST /risk-check/incremental` both live here.
        /explanations         SD-005 — layered. Owns path-building + text generation for all three risk
                               types (`buildInteractionPath`/`buildAllergyPath`/`buildContraindicationPath`,
                               `explainPath`); calls `findById` on each risk-type module's repository
                               (extended for this) rather than querying the graph directly. `GET /risks/:id`
                               lives here.
        /query-log            SD-008 — layered. `assertSummaryConsistent` (domain) recomputes the severity
                               tally from the stored `risks` array and checks it against `bySeverity`/
                               `totalRisks` — never trusts a hand-built summary. Written as a best-effort
                               side effect from `risk-check` routes (never breaks the actual response if
                               logging itself fails); read-only (`GET` only) from every other module's view.
        /data-import          SD-006 — layered, any authenticated user (`requireAuth` only — the earlier
                               `requireAdmin` gate was removed in V0.12 so bulk import isn't admin-gated).
                               `assertNoPII`/`validateDrugRow` (domain) scan every field of every row for
                               SSN/MRN-shaped patterns before any schema check — PII rejection always wins.
                               `processDrugImport` is the async worker (System Architecture §7): runs
                               detached from the request that started it, updates `ImportJob` status in the
                               real DB at each stage so polling reflects real progress, never an in-memory
                               placeholder. Only `entityType: "drug"` has a parser; `ImportEntityType` stays
                               an open union for future types.
        /prescription         Digital prescription upload (V-next, 4th input mode alongside free text,
                               dictation, and the structured form): `POST /prescription/parse` (PDF only,
                               multer memory storage, `requireAuth`) extracts the raw PDF text
                               (`infrastructure/pdfPrescriptionTextExtractor.ts`, `pdfjs-dist` — see Known
                               Gotchas, not `pdf-parse`), sends it to
                               Groq to pull out medication names (`infrastructure/groqMedicationExtractor.ts`
                               — same key-rotating Groq call convention as `assistant`'s
                               `openAiLlmAdapter.ts`), then `domain/prescriptionMessage.ts` builds the exact
                               same kind of "I am taking X and Y" sentence the web's
                               `buildStructuredMessage.ts` builds for the structured form. This module
                               deliberately does NOT call `checkRisks` or touch Neo4j itself — the returned
                               sentence is handed to the existing `POST /chat-sessions/:id/messages`
                               pipeline by the web client, so the actual grounded risk check (real Cypher
                               via `risk-check`'s `checkRisks`) and the Groq-composed answer come from the
                               one pipeline every input mode already shares (`assistant`'s `runTurn`) —
                               no duplicated business logic, no second Cypher path to keep in sync.
/packages
  /shared-types                Request/response types shared between /apps/web and /apps/api
/docs                          Project documents (Charter, Requirements, Architecture, etc.)
```

**Layering rule** (matches System Architecture §1 — data flows one direction):
`route → middleware (SD-003) → module → repository (SD-007)`.
- Route handlers parse/validate the request and call a module function — no traversal logic, no direct DB calls.
- Only repository code imports the graph DB driver (`neo4j-driver`). Everything above it goes through a repository function or interface.
- SD-005 (`explanations`) builds its own path from a risk-type module's `findById` (a single aggregate, by id) — it does not query the graph directly, and it never asserts anything the path-builder didn't put there (`assertGroundedInPath` proves this, see Build Plan V0.5).

**Two module shapes, pick based on whether the module owns a business rule:**
- **Flat** (`drugs`, `allergens`, `diseases`, `auth`) — `*.repository.ts` talks to Neo4j directly, `*.routes.ts` calls it. Fine when there's no domain invariant beyond basic input validation.
- **Layered** (`patients`, `interactions`, `allergy-links`, `contraindications`, `risk-check`, `explanations`, `query-log`, `data-import`, `prescription`, and any future module with a real business rule) — split into:
  - `domain/` — plain functions/types, zero I/O, unit-tested alone (e.g., `patientProfile.ts`'s `assertReferencesExist`, `interaction.ts`'s `assertValidSeverity`).
  - `application/` — use cases (`useCases.ts`) that depend only on repository **interfaces** (`ports.ts`), never a concrete implementation; tested against hand-written in-memory fakes, no database.
  - `infrastructure/` — the real Neo4j-backed classes that implement those interfaces (`neo4jPatientRepository.ts`, `neo4jInteractionRepository.ts`, etc.).
  - `*.routes.ts` at the module root wires the real infrastructure into the use cases and handles HTTP concerns only.
  - This is what makes `pnpm test` exercise real business logic without Docker/Neo4j running — see Testing Conventions.
  - **Cross-module composition is fine at the domain/application level** (e.g., `risk-check`'s use case imports `findInteractionRisks` from `interactions`, `findAllergyRisks` from `allergy-links`, etc.) — SD-004 legitimately spans relationship types. The boundary that matters is the one above: only a module's own `infrastructure/` may import `neo4j-driver`. Small catalog-lookup classes (`existingDrugIds`, etc.) are deliberately re-implemented per module rather than shared, matching the same "own your infrastructure" precedent as everything else in `infrastructure/`.

**Naming**
- Files: kebab-case (`risk-query-engine.ts`); React components: PascalCase filenames matching the exported component (`RiskResultsDashboard.tsx`).
- Functions/variables: camelCase. Constants and env vars: `UPPER_SNAKE_CASE`.
- API routes: kebab-case plural nouns, exactly as listed in System Architecture §4 — if a route needs to change, update that document in the same change.
- Graph node labels: PascalCase (`Drug`, `Patient`) — must match System Architecture §3 exactly.
- Graph relationship types: `UPPER_SNAKE_CASE` (`INTERACTS_WITH`, `CONTRAINDICATED_FOR`) — must match System Architecture §3 exactly.

## 2. Testing Conventions

**What needs a test**
- Every SD-004 traversal and every business rule from Requirements §3 (e.g., a profile can't reference a nonexistent drug, `INTERACTS_WITH` can't be written without `severity`) — these are the product's actual value proposition and must be covered before a version is marked Done.
- Every API endpoint: at least one happy-path and one error-path test (401/403/400 as applicable).
- Every reusable UI component: a render test per state defined in the Design System (default/hover/focus/disabled/error), not just the default state.
- Every Build Plan version's "Done when" action, exercised as a Playwright E2E test before that version's status is flipped to Done.

**What kind, and where tests live**
- Domain unit tests (Vitest) for pure business-rule logic — colocated as `domain/*.test.ts`, zero I/O (e.g., `patients/domain/patientProfile.test.ts`).
- Application unit tests (Vitest) for use cases — colocated as `application/*.test.ts`, run against hand-written in-memory fakes of the repository ports, still zero I/O (e.g., `patients/application/useCases.test.ts`).
- Integration tests (Vitest + supertest-style HTTP calls) for API routes, run against a real test graph DB instance (see gotcha below) — colocated as `*.routes.test.ts` next to each module's routes file. **Not yet added as of V0.2** — endpoints were verified live via `curl`/Playwright instead per that version's explicit instructions; this remains a real gap against the convention below and should be closed before it's relied on as a regression guard.
- Component tests (Vitest + React Testing Library) — colocated as `ComponentName.test.tsx` next to the component. Also not yet added as of V0.2.
- E2E tests (Playwright) for the 5 user journeys in the UX & Product Design document — live in `/apps/web/e2e/`, one file per journey (`journey-1-pharmacist-full-check.spec.ts`, etc.). Playwright has only been used from throwaway scratchpad scripts so far (V0.1, V0.2 live verification) — not yet committed here.

**Never mock the graph database** for anything that exercises a traversal or business rule. Run those tests against a real instance (a disposable test database or test container). A mocked graph DB validates the mock's behavior, not the query — and query correctness is the entire point of this project. This doesn't apply to the domain/application layers above, which are pure by design and deliberately never touch the database at all.

## 3. Commands

Package manager is **pnpm** (see Known Gotchas — do not use npm/yarn).

| Purpose | Command |
|---------|---------|
| Install all workspace dependencies | `pnpm install` |
| Start both dev servers (API + Web) | `pnpm dev` |
| Start API dev server only | `pnpm --filter api dev` |
| Start Web dev server only | `pnpm --filter web dev` |
| Run unit + integration tests | `pnpm test` |
| Run E2E suite (requires dev servers + test DB running) | `pnpm test:e2e` |
| Apply graph DB schema/constraints | `pnpm db:migrate` |
| Seed graph DB with fixture data | `pnpm db:seed` |
| Type-check the whole workspace | `pnpm typecheck` |
| Lint | `pnpm lint` |
| Format (write) | `pnpm format` |
| Full local stack via containers | `docker compose up` |

## 4. Known Gotchas

- **Use pnpm, not npm or yarn.** The `shared-types` package is consumed via the pnpm `workspace:*` protocol; `npm install` won't resolve that link correctly and will silently duplicate the package instead of symlinking it, causing API/UI type drift that's hard to notice.
- **Graph DB engine is Neo4j 5.24 Community** (resolved via the Build Plan V0.1 spike — see Technology Decision Log). Still only import `neo4j-driver` inside `/apps/api/src/db` — the discipline that made the spike low-risk stays worth keeping even after the decision is made.
- **Docker Desktop's daemon isn't always running by default on this machine** — `docker ps` can fail with a `dockerDesktopLinuxEngine` pipe error even though the CLI is installed. Launch Docker Desktop and poll (`until docker ps; do sleep 5; done`) rather than assuming the daemon is up.
- **`bcrypt` needs a prebuilt native binary for the current platform.** It worked via `node-pre-gyp` on Windows/Node 20 without a local compiler, but if a future deployment target has no prebuilt binary available, fall back to `bcryptjs` (pure JS) rather than fighting a native build — see Technology Decision Log.
- **Graph visualization library is Cytoscape.js 3.34** (resolved via the Build Plan V0.6 spike — see Technology Decision Log). This gotcha said "not yet chosen" for a while after the decision was actually made — found stale during the V1.0 hardening pass; a reminder to grep for other "TODO"/"pending"/"not yet" language here periodically, since this file drifts the same way code does.
- **Express 4 does not catch rejected promises in route handlers.** Every `async` route handler must go through `apps/api/src/lib/asyncHandler.ts` (or an equivalent wrapper) — an unwrapped async handler that throws will hang the request instead of returning the `500` defined in System Architecture §7.
- **"Migrations" here means graph schema constraints/indexes, not SQL migrations.** `pnpm db:migrate` applies node/relationship constraints (e.g., `INTERACTS_WITH` requires `severity`) — there's no relational schema to diff.
- **Node/relationship label strings are case-sensitive and must match System Architecture §3 exactly.** A typo (e.g., `interacts_with` vs `INTERACTS_WITH`) silently creates a new, orphaned relationship type in most graph DBs instead of erroring — traversals that expect the correct label will just quietly return fewer results.
- **No real PII, ever — including in local dev/seed data.** Use obviously-fake synthetic values (per NFR-003), never real names or data "just for testing locally."
- **`pdf-parse@1.1.x` bundles a frozen, unmaintained pdf.js build (v1.10.100, from ~2017) and throws hard (`XRefEntryException: bad XRef entry`) on real-world prescription PDFs with a slightly non-conformant xref table** — reproduced by corrupting a single xref offset line in a reportlab-generated PDF; the old library failed outright while `pdfjs-dist` (actively maintained, has automatic xref-rebuild recovery) parsed the same file and logged only a warning. `prescription/infrastructure/pdfPrescriptionTextExtractor.ts` now uses `pdfjs-dist/legacy/build/pdf.mjs` with `stopAtErrors: false` instead of `pdf-parse` — same `PrescriptionTextExtractorPort` interface, no other module changed. If a future PDF still fails to parse, it's a genuinely unreadable/corrupt file (or one requiring OCR, e.g. a scanned image with no text layer), not this class of xref bug.
- **A token existing in the Design System doc doesn't mean it exists in `styles.css`.** The `--color-node-*` tokens were documented since V0.6 but never actually added to the CSS file until the V1.0 hardening pass caught it via a grep audit (`grep -rn "#[0-9A-Fa-f]\{6\}"` outside `styles.css`) — inspection alone had missed it across several versions. Re-run that grep periodically, don't just trust the design doc matches the code.
- **Bulk-loading or load-testing the real database:** tag synthetic data with a distinguishing property (e.g., `loadTest: true`) so it can be found and deleted afterward — don't rely on remembering ID prefixes. Delete in batches (`... WITH n LIMIT 20000 DETACH DELETE n`) rather than one `MATCH ... DELETE` for anything past a few thousand nodes/edges, or the single transaction gets slow. Verify cleanup with a real query for `WHERE n.loadTest = true` (expect 0), not just "the delete command didn't error."
- **Writing a new file (not editing an existing one) whose content includes an `Authorization: \`Bearer ${...}\`` -shaped template literal can get silently corrupted to a literal `` `****** `` at write time** by this environment's secret-redaction layer, producing a real "Unterminated template literal" compile error (caught here while adding `prescription/infrastructure/groqMedicationExtractor.ts`). Editing an *existing* file with the same pattern was unaffected (verified via `tsc`) — the risk is specifically new file content. Workaround: build the header value as a separate variable/array-join (e.g. `["Bearer", token].join(" ")`) instead of a `Bearer ${token}` template literal inline in a `create`d file, and always run a real compiler/typecheck after adding a new Groq/HTTP-auth call site rather than trusting a visual diff — the tool output itself is masked the same way and can't be used to verify.
