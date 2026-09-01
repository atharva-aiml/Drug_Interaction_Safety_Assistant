# Build Plan — Drug Interaction Safety Assistant

This document is **living**: update the Status column and per-version notes in place as work completes. Don't regenerate the file from scratch — append findings (e.g., spike outcomes) to the relevant version instead.

## Status Overview

| Version | Name | Status |
|---------|------|--------|
| 0.1 | Walking Skeleton | **Done** (2026-08-17) |
| 0.2 | Patient Profiles | **Done** (2026-08-17) |
| 0.3 | Drug–Drug Interaction Detection | **Done** (2026-08-17) |
| 0.4 | Allergy & Contraindication Conflicts | **Done** (2026-08-17) |
| 0.5 | Explainable Risk Paths | **Done** (2026-08-17) |
| 0.6 | Graph Visualization | **Done** (2026-08-17) |
| 0.7 | Severity Filtering & Incremental Recheck | **Done** (2026-08-17) |
| 0.8 | Multi-hop Explorer | Not Started |
| 0.9 | Query History Log | **Done** (2026-08-17) |
| 0.10 | Bulk Data Import | **Done** (2026-08-17) |
| 0.11 | Export Report (stretch) | **Done** (2026-08-17) |
| 1.0 | Hardening | **Done** (2026-08-17) — one known, accepted gap: Journey 3 isn't executable (V0.8 stays unbuilt) |
| 1.1 | Soft Delete (Patients & Drugs) + PDF Export | **Done** (2026-08-19) |
| 1.2 | Edit Drug + Graph View Patient-Connection Fix | **Done** (2026-08-19) |
| 1.3 | Patient/Drug Forms as Pop-up Modals | **Done** (2026-08-19) |
| 2.0.0 | Conversational Interface — Groundwork | **Done** (2026-08-21) |
| 2.0.1 | Conversational Interface — Session Plumbing | **Done** (2026-08-21) |
| 2.0.2 | Conversational Interface — Grounded Risk Pipeline | **Done** (2026-08-21) |
| 2.0.3 | Conversational Interface — LLM Answer Composition | **Done** (2026-08-21) |
| 2.0.3.1 | Interaction Risk/Tip Demo-Data Enrichment (addendum) | **Done** (2026-08-21) |
| 2.0.3.2 | Symptom-Report Clarification Flow (bugfix/addendum) | **Done** (2026-08-21) — generalized by V2.0.3.3 |
| 2.0.3.3 | Unified Intake Gate — Gather Before Concluding (bugfix/addendum) | **Done** (2026-08-22) — retry behavior generalized by V2.0.3.4 |
| 2.0.3.4 | Intake Retry — Re-ask for Partially-Answered Categories (bugfix/addendum) | **Done** (2026-08-22) — denial detection redesigned by V2.0.3.5 |
| 2.0.3.5 | Denial Detection Redesign — Independent Per-Category Booleans (bugfix/addendum) | **Done** (2026-08-22) |
| 2.0.3.6 | Conversation Memory + General Chat (feature addendum) | **Done** (2026-08-22) |
| 2.0.4 | Conversational Interface — Cypher View | Not Started |
| 2.0.5 | Conversational Interface — Quick-Check Popup | Not Started |
| 2.0.6 | Conversational Interface — Remove Legacy UI | Done |
| 2.0.7 | Conversational Interface — Body Diagram (Could) | Not Started |
| 2.1.0 | Chatbot Improvements — Severity Rendering in Chat | **Done** (2026-08-22) |
| 2.1.1 | Chatbot Improvements — Emergency-Symptom Escalation | **Done** (2026-08-22) |
| 2.1.2 | Chatbot Improvements — Persistent Medical Disclaimer | **Done** (2026-08-22) |
| 2.1.3 | Chatbot Improvements — Grounded vs. General Answer Tag | **Done** (2026-08-22) |
| 2.1.4 | Chatbot Improvements — Fuzzy-Match Confirmation | **Done** (2026-08-22) |
| 2.1.5 | Chatbot Improvements — Ambiguous-Match Disambiguation | **Done** (2026-08-22) |
| 2.1.6 | Chatbot Improvements — Demo-Catalog-Scope Disclosure | Not Started — explicitly excluded from the V2.1 build pass at the user's request |
| 2.1.7 | Chatbot Improvements — Session Profile Correction (Remove) | **Done** (2026-08-22) |
| 2.1.8 | Chatbot Improvements — "Currently Tracking" Profile Panel | Not Started — explicitly excluded from the V2.1 build pass at the user's request |
| 2.1.9 | Chatbot Improvements — Caregiver/Multi-Person Notice | **Done** (2026-08-22) |
| 2.1.10 | Chatbot Improvements — Dosage/Frequency Disclosure | **Done** (2026-08-22) |
| 2.1.11 | Follow-up Question Mislabeled as a Fresh Grounded Check (bugfix/addendum) | **Done** (2026-08-22) |
| 2.2.0 | Chatbot Improvements — Streaming Responses | **Done** (2026-08-23) |
| 2.2.1 | Chatbot Improvements — "Assistant Is Typing" Indicator | **Done** (2026-08-23) |
| 2.2.2 | Chatbot Improvements — Parallelized Catalog Fetch + Configurable Extraction Model | **Done** (2026-08-23) |
| 2.2.3 | Chatbot Improvements — Stop Repeating Boilerplate Closing Lines | **Done** (2026-08-23) |
| 2.2.4 | Chatbot Improvements — Adaptive Response Length | **Done** (2026-08-23) |
| 2.2.5 | Chatbot Improvements — Markdown Rendering | **Done** (2026-08-23) |
| 2.2.6 | Chatbot Improvements — Message Regeneration | **Done** (2026-08-23) |
| 2.2.7 | Chatbot Improvements — Stop-Generating Control | **Done** (2026-08-23) |
| 2.2.8 | Chatbot Improvements — Smart Auto-Scroll | **Done** (2026-08-23) |
| 2.2.9 | Chatbot Improvements — Assistant Persona + Timestamps | **Done** (2026-08-23) |
| 2.3.0 | Chatbot Improvements — Delete-Session Control Wired Up | **Done** (2026-08-23) |
| 2.3.1 | Chatbot Improvements — LLM-Generated Session Titles | **Done** (2026-08-23) |
| 2.3.2 | Chatbot Improvements — History Summarization Beyond the Context Window | **Done** (2026-08-23) |
| 2.3.3 | Chatbot Improvements — Session Rename + Search | **Done** (2026-08-23) — archiving scoped out, see addendum |
| 2.3.4 | Chatbot Improvements — Paginated Message History | **Done** (2026-08-23) |
| 2.4.1 | Dictate Query (Voice Input) | **Done** (2026-08-23) |

---

## Version 0.1 — Walking Skeleton — **Done** (2026-08-17)

**Entity:** Drug (REQ-001) — the simplest, most foundational entity in the schema.

**Thinnest real end-to-end path:** log in with a real credential → UI calls a real API → API authenticates the request through SD-003 → reads real Drug records from a real running graph database → renders them in a minimally but genuinely styled UI. No mock data, no stubbed auth, no in-memory placeholder DB. No other entity, relationship, or screen is in scope for this version.

**Tasks — as built**
1. **Spiked + decided the graph database engine**: Neo4j 5.24 Community. Full rationale (including the rejected `kuzu` alternative) in the [Technology Decision Log](07-technology-decision-log.md). Constraints applied via `pnpm db:migrate` (`apps/api/src/db/migrate.ts`), not hand-run Cypher.
2. Defined the `Drug` node (`id`, `name`, `genericName`, `drugClass`, `dosageForm` — camelCase, System Architecture §3 updated to match) and, in addition, a `User` node for real auth — not originally in the schema, added because real login needs somewhere to store credentials (System Architecture §3 updated).
3. Implemented SD-003 for two paths, not the one originally scoped: `POST /api/v1/auth/register` **and** `/auth/login`, both issuing/validating a real JWT (`bcrypt` for password hashing). Registration was added beyond the original task list because the verification pass needed to prove a real account could be created, not just a pre-seeded one.
4. Implemented both `GET /api/v1/drugs` and `POST /api/v1/drugs` (the original task list only called for `GET`; `POST` was added so the UI's "add a drug" action is real, not a seed script) — both on SD-002/SD-004, backed by the live graph DB.
5. Built the UI (`apps/web`, React + Vite + TS): a login/register card and a Drug list + "Add a drug" form, styled with the Design System's actual CSS custom properties (`apps/web/src/styles.css`), not placeholder markup.

**Verification performed:**
- API-level, via `curl`: register → login → create a drug → list it back → confirmed a request with no token gets `401`.
- Killed the API process outright (not just closed the terminal — confirmed the port was free), restarted it fresh, logged in again, and the previously-created drug was still there — proving persistence lives in Neo4j, not server memory.
- Browser-level, via a Playwright script driving real Chromium: loaded the app, registered a second real user, logged in, added a drug through the actual form, confirmed it rendered, did a full page reload, and confirmed both the session and the drug survived the reload. Zero browser console errors. Screenshots taken at each step.

**Not yet done, deliberately out of scope for this version:** seeding 5–10 records (not needed — verification created real records live instead); the graph-visualization library spike (that's V0.6); committing the Playwright script into `apps/web/e2e/` per CLAUDE.md's testing conventions (it was a throwaway verification script in the scratchpad, not a maintained test — logged as such in the Technology Decision Log).

---

## Version 0.2 — Patient Profiles — **Done** (2026-08-17)

**Touches:** REQ-002, SCR-001 (patient list portion), SCR-005, business rule "a profile cannot reference a nonexistent drug."

**Built as a true vertical slice, layer by layer:**
1. **Domain rule** (`apps/api/src/modules/patients/domain/patientProfile.ts`) — pure functions, no I/O: `normalizeProfileInput` (trims/dedupes) and `assertReferencesExist`, which encodes the business rule from Requirements §3 / System Architecture §3 — a patient profile can't reference a drug/allergen/condition id that doesn't exist — generalized to all three reference types per System Architecture's fuller statement of the rule, not just drugs. Unit-tested alone in `patientProfile.test.ts` (8 tests, no database involved).
2. **Use cases + repository ports** (`application/ports.ts`, `application/useCases.ts`) — `createPatient`/`updatePatient`/`getPatient`/`listPatients` depend only on `PatientRepository` and `ReferenceCatalogPort` interfaces. Tested in `useCases.test.ts` (6 tests) against hand-written in-memory fakes — proves the rejection path never calls the repository's `create`, with no real database involved.
3. **Real repository** (`infrastructure/neo4jPatientRepository.ts`, `infrastructure/neo4jReferenceCatalog.ts`) — implements those same ports against live Neo4j: `Patient` nodes, `TAKES`/`HAS_ALLERGY`/`HAS_CONDITION` edges, full-replace semantics on update.
4. **API** (`patient.routes.ts`) — `POST/GET /patients`, `GET/PUT /patients/{id}`, wired to the real use cases and real repositories, mapping `ProfileValidationError`/`PatientNotFoundError` to `400`/`404` per System Architecture §7. Also added minimal `GET/POST /allergens` and `/diseases` (not in the original System Architecture API table) since the Patient Profile Editor needs somewhere real to reference — same simple pattern as `/drugs` from V0.1.
5. **UI** — a Patients tab (now the default) alongside Drugs: `PatientList` (SCR-001 slice), `PatientForm` + `ReferencePicker` (SCR-005 slice) — type a name, it resolves against the real fetched catalog or shows an inline error; allergens/conditions also support inline "Create '<name>'" since no other screen makes those yet.

**Automated tests:** `pnpm test` — 14/14 passing (8 domain, 6 use-case), zero database dependency. `pnpm typecheck` clean across both apps.

**Live verification performed:**
- API via `curl`: created a real allergen and disease, created a patient referencing a real drug/allergen/disease (`201`), attempted a patient referencing a nonexistent drug id (`400 DRUG_NOT_FOUND`), listed patients, fetched by id, did a partial `PUT` (rename only) and confirmed medications/allergies/conditions were untouched, fetched a nonexistent id (`404 PATIENT_NOT_FOUND`).
- Browser via Playwright against the real running app: logged in, opened the Patients tab, created a patient, added a real medication by typing its name, typed a fake drug name and got a visible inline error with nothing added, added a real allergy and condition, saved, did a **full page reload**, and confirmed the patient and all three references were still there — then reopened it and confirmed the medication/allergy/condition chips matched exactly. Zero console errors.

**Deviation from the original task list, noted for accuracy:** the original wording only anticipated drugs already existing (from V0.1); allergens and diseases had no source yet, so minimal create/list endpoints for both were added as a small necessary extension, not a new feature module.

---

## Version 0.3 — Drug–Drug Interaction Detection — **Done** (2026-08-17)

**Touches:** REQ-003, REQ-007, business rule "`INTERACTS_WITH` cannot exist without a severity."

**Built as a true vertical slice, layer by layer (new `interactions` module, layered like `patients` — see CLAUDE.md §1):**
1. **Domain rule** (`domain/interaction.ts`) — pure, no I/O: `assertValidSeverity` (the core business rule — `INTERACTS_WITH` cannot exist without one of the four defined severities), `assertDistinctDrugs` (a drug can't interact with itself), `dedupeSymmetricPairs` (since the edge is modeled as symmetric, guards against the same pair surfacing twice), and `toRisk` (pure formatting from an interaction edge to the `Risk`/SCR-002 shape — every word in the summary comes from the edge itself). Unit-tested alone in `interaction.test.ts` (8 tests).
2. **Use cases + repository ports** (`application/ports.ts`, `useCases.ts`) — `createInteraction` and `checkRisks` depend only on `InteractionRepository`, `DrugCatalogPort`, `PatientMedicationsPort` interfaces. `checkRisks` accepts either a `patientId` (resolves medications first) or a direct `medications` array, matching System Architecture §4's documented request shape. Tested against in-memory fakes in `useCases.test.ts` (9 tests) — including proving the create path never touches the repository when severity is missing or a drug id doesn't exist, and that a single-medication list can't produce a pairwise risk.
3. **Real repository** (`infrastructure/neo4jInteractionRepository.ts`, `neo4jDrugCatalog.ts`, `neo4jPatientMedications.ts`) — real Cypher against Neo4j. Confirmed during migration that Neo4j 5.24 **Community Edition does support a relationship-property uniqueness constraint** (`FOR ()-[r:INTERACTS_WITH]-() REQUIRE r.id IS UNIQUE`) — not something to have assumed, since many graph engines gate that behind Enterprise.
4. **API** (`interaction.routes.ts`) — `POST /interactions` (create, enforcing the severity/distinct-drug/drug-existence rules) and `POST /risk-check` (accepts `patientId` or `medications`, returns `{ risks, checkedAt }`), wired to the real use cases.
5. **UI** — `SeverityBadge` (new Design System severity color tokens actually wired into `styles.css` for the first time) and `RiskDashboard`, reached via a "Check for risks" button on each patient card. Distinct positive empty state (`.empty-state-positive`, green-tinted) per SCR-002's spec — visually different from the loading/error states so a clean result doesn't read as a stall.

**Automated tests:** `pnpm test` — 31/31 passing (17 new: 8 domain + 9 use-case), zero database dependency. `pnpm typecheck` clean.

**Live verification performed:**
- API via `curl`: created a real interaction (Warfarin + Ibuprofen, severe — a clinically real pairing), confirmed missing/invalid severity is rejected (`400 SEVERITY_REQUIRED`), ran `risk-check` directly against a medication list and got the interaction back, ran it against a single unrelated drug and got an empty list, gave a real patient both interacting drugs via `PUT`, ran `risk-check` by `patientId` and got the same result, and confirmed a nonexistent `patientId` returns `404`.
- Browser via Playwright: logged in, clicked "Check for risks" on the patient with both interacting drugs → saw the risk with a correctly colored/labeled "Severe" badge and its plain-language summary; clicked it on a patient with only one medication → saw the distinct positive empty state, not a blank screen; **did a full page reload**, re-ran the check, and the same persisted interaction was still found. Zero console errors.

**Scope note:** `POST /interactions` has no dedicated UI screen this round (not on any SCR list yet, unlike Drug/Allergen/Disease creation) — created via `curl` for verification, same precedent as V0.1/V0.2's minimal reference-data endpoints. Allergy and contraindication risk types are intentionally absent from `checkRisks`' output until V0.4.

---

## Version 0.4 — Allergy & Contraindication Conflicts — **Done** (2026-08-17)

**Touches:** REQ-004, REQ-005, REQ-008, REQ-009.

**Schema decision made this version:** `CONTAINS_ALLERGEN` and `CONTRAINDICATED_FOR` had no properties in System Architecture §3. Extended both with `severity` (same rule `INTERACTS_WITH` already had) since an allergy conflict ranges from a mild rash to anaphylaxis and a contraindication can be relative or absolute — a risk without a severity can't be sorted/filtered (REQ-015) or badged (Design System §1). Documented in System Architecture §3.

**Built as two new layered modules plus a refactor, not a bolt-on:**
1. **`allergy-links` and `contraindications`** — new modules, structured exactly like `interactions` (domain → application ports/use cases → infrastructure → routes). Each has its own `assertValidSeverity` domain rule (deliberately duplicated per-module, same precedent as `interactions`/`patients` — see CLAUDE.md), its own `create*` use case enforcing severity + both-endpoints-exist, and a `find*Risks` use case that maps straight to the shared `Risk` shape.
2. **Refactored `interactions`** — pulled `checkRisks`/`PatientMedicationsPort`/`PatientNotFoundError` out entirely; it now only owns `INTERACTS_WITH` (create + `findInteractionRisks`). Orchestration doesn't belong in one risk-type's module.
3. **New `risk-check` module** — the actual SD-004 orchestrator: resolves a patient's full profile (medications/allergies/conditions) once via its own `Neo4jPatientProfileLookup`, then composes `findInteractionRisks` + `findAllergyRisks` + `findContraindicationRisks` in parallel and concatenates. `POST /risk-check` moved here from `interactions`.
4. **API** — `POST /drug-allergens`, `POST /contraindications` (new), `POST /risk-check` (now returns all three types together).
5. **UI** — `RiskDashboard` now shows a `RiskTypeLabel` (Interaction/Allergy/Contraindication) alongside the existing `SeverityBadge` on every risk card, satisfying "visually distinguishable by type as well as severity."

**Automated tests:** `pnpm test` — **56/56 passing** (25 new: 4+4 domain, 7+7+5 application), zero database dependency. The `risk-check` use-case tests include the exact Build Plan scenario — one patient, three simultaneous risk types, asserted together. `pnpm typecheck` clean.

**Live verification performed:**
- API via `curl`: created a real allergy link (Ibuprofen contains Penicillin, moderate) and a real contraindication (Ibuprofen contraindicated for Chronic Kidney Disease); confirmed missing severity and nonexistent-allergen/-disease are all rejected with the right error codes; ran a full risk check for a patient who has Warfarin+Ibuprofen (interaction), is allergic to Penicillin (allergy conflict via Ibuprofen), and has CKD (contraindication via Ibuprofen) — **all three risks came back together in one response**, each correctly typed and severity-labeled.
- Browser via Playwright: logged in, clicked "Check for risks" on that same patient, saw all three risk cards rendered with distinct type labels and correctly colored severity badges (screenshot confirms Severe/Moderate/Contraindicated render as visually distinct colors); **did a full page reload**, redid the check, all three risks still there. Zero console errors.

**Done when** (verified exactly as scoped): a patient with a known allergy to an ingredient in one of their medications and a known contraindicated condition shows both conflicts in the same result list alongside the drug–drug interaction, each correctly labeled by type — confirmed live, screenshot in this session's record.

---

## Version 0.5 — Explainable Risk Paths — **Done** (2026-08-17)

**Touches:** REQ-006, REQ-010, REQ-011, SD-005.

**Decision confirmed:** template-based string generation, no LLM — resolved as planned, no spike needed (see Technology Decision Log).

**Not built this version:** `HAS_SIDE_EFFECT` edges — the original task list assumed they'd be needed for "path completeness," but none of the three risk types built so far (interaction/allergy/contraindication) traverse through a side effect, so there was nothing for that edge type to complete. Left for whichever future version actually needs it (side effects aren't consumed by any risk type yet).

**Built as a new `explanations` module (SD-005), not folded into an existing one:**
1. **Domain** (`domain/riskPath.ts`) — `buildInteractionPath`/`buildAllergyPath`/`buildContraindicationPath` (pure path construction from each risk type's own aggregate), `explainPath` (pure text generation), and `assertGroundedInPath` — the actual enforcement of "an explanation may only state facts present in the path." Implemented as **reference-tracking, not prose-parsing**: `explainPath` records every node id it actually looks a name up for as it builds the sentence; `assertGroundedInPath` checks that receipt against the path's real node set. A hallucination test proves this catches a fabricated reference that substring-matching prose could miss. 10 unit tests, zero I/O.
2. **Use case + ports** (`application/useCases.ts`, `ports.ts`) — `getRiskDetail(riskId, patientId?, deps)` tries the interaction/allergy/contraindication lookup ports in turn (a risk id is just its edge's own id, not namespaced by type) and returns the first match's explanation + path. `patientId` is optional and only affects allergy/contraindication paths — it adds the Patient node and the `HAS_ALLERGY`/`HAS_CONDITION` edge that actually completes the reasoning; without it the path is still correct, just showing only the drug's half of the story. 5 tests against in-memory fakes.
3. **Real repositories** — extended `InteractionRepository`, `AllergyLinkRepository`, `ContraindicationRepository` (from V0.3/V0.4) with a `findById`, the natural next capability for aggregates each module already owns, plus a small new `Neo4jPatientLookup` for the optional patient context.
4. **API** — `GET /risks/{riskId}?patientId=` (optional query param), returning `{ id, type, severity, explanation, path }` exactly as documented.
5. **UI** — `RiskDetailPanel` (SCR-003), reached by clicking any risk card in the dashboard: explanation sentence, color-coded path-node chips (Drug/Patient/Allergen/Disease, matching the Design System's categorical node colors), and the raw relationship lines in monospace underneath.

**Automated tests:** `pnpm test` — **71/71 passing** (15 new: 10 domain, 5 application), zero database dependency. `pnpm typecheck` clean — which also caught, at compile time, every real Neo4j repository that still needed the new `findById` method before this could even build.

**Live verification performed:**
- API via `curl`: fetched detail for all three of Jane Renamed's existing risks. Interaction risk needed no `patientId` (self-contained). Allergy risk fetched twice — without `patientId` the path/explanation correctly omitted the patient ("...a moderate allergy risk **if** the patient is allergic to it"); with `patientId` it named her explicitly and the path grew a `Patient` node + `HAS_ALLERGY` edge. Same for the contraindication risk. A nonexistent risk id returned `404 RISK_NOT_FOUND`.
- Browser via Playwright: clicked into the allergy risk, saw the explanation naming Ibuprofen, Penicillin, and Jane Renamed, with all three present as path chips and in the raw edge lines below (`(Ibuprofen) —[CONTAINS_ALLERGEN: moderate]→ (Penicillin)`, `(Jane Renamed) —[HAS_ALLERGY]→ (Penicillin)`); clicked into the interaction risk, saw its own self-contained path; **did a full page reload**, redid the flow, clicked into the contraindication risk, still resolved correctly from the real API. Zero console errors.

**Done when** (verified exactly as scoped): every entity named in each risk's explanation sentence was visibly present in its displayed path — checked by eye on one interaction, one allergy, and one contraindication risk, per the screenshot in this session's record — and additionally proven structurally (not just by eye) via the `assertGroundedInPath` unit tests.

---

## Version 0.6 — Graph Visualization — **Done** (2026-08-17)

**Touches:** REQ-014, NFR-002, SCR-004.

**Spike resolved: Cytoscape.js.** Installed all three candidates and checked dependency health first — `react-force-graph` pulls a **git+ssh dependency** (`three-bmfont-text`, via `aframe` via `3d-force-graph-vr`) purely because the package bundles 2D/3D/VR/AR variants together; that's a real installability risk (breaks anywhere without git+SSH access to GitHub) for VR capability this project doesn't need, so it was eliminated without a render benchmark — same logic as rejecting `kuzu` in V0.1. Benchmarked the remaining two headless at 50 synthetic nodes: both blew the NFR-002 1s budget with their default physics layouts (cytoscape `cose` ~1201ms, vis-network physics-stabilization ~1190ms) — a real finding, not assumed. Switched to non-physics layouts appropriate for what this product actually renders (a small tree-shaped relationship *path*, never an arbitrary dense graph): cytoscape `breadthfirst` dropped to ~189ms, `grid` ~93ms; vis-network with physics off ~252ms. Picked **Cytoscape.js** — lighter dependency footprint (6MB vs. vis-network's 81MB, all from bundled prebuilt variants), npm-registry-only dependency chain, and purpose-built for exactly this kind of typed relationship graph. Full rationale in the Technology Decision Log.

**Adapted vertical slice, explained:** this version reuses V0.5's already-real `GET /risks/:id` endpoint verbatim (Build Plan said so explicitly: "using the path payload already returned by `GET /risks/{risk_id}`") — there's no new backend business rule or persisted entity here, so "repository" and "API endpoint" map onto what already exists rather than new ones invented to fit the template:
1. **Domain rule** (`apps/web/src/graph/toGraphElements.ts`) — pure mapping from a `RiskPath` to Cytoscape-ready elements, plus `assertNodesHaveTypeLabel`: the actual business rule (Design System §1 / WCAG 1.4.1) that a node's color is never the only signal — every node also carries a `typeLabel`. A regression test proves this catches a node stripped of its label. 6 tests, zero I/O.
2. **Use case + port** (`apps/web/src/graph/loadRiskGraph.ts`) — depends on a `RiskDetailFetcher` interface, not a concrete implementation; fetches, maps, and asserts the label rule before returning. Tested against an in-memory fake fetcher (3 tests) — including that a fetch error propagates rather than being swallowed.
3. **Real "repository"** (`apps/web/src/graph/apiRiskDetailFetcher.ts`) — wraps the real `api.getRiskDetail` call, which really does hit Neo4j via the V0.5 endpoint. No new backend code.
4. **API endpoint** — none new; `GET /risks/:id?patientId=` from V0.5, reused as-is.
5. **UI** (`GraphView.tsx`, SCR-004) — Cytoscape mounted imperatively via a ref, `breadthfirst` layout, node colors from the Design System's categorical tokens with visible type+name labels, pan/zoom (Cytoscape defaults), and a click-for-attributes panel below the canvas. Reached via a new "View as graph" button in `RiskDetailPanel` (SCR-003).

**First real use of Vitest in `apps/web`** — wired up via `vitest/config`'s `defineConfig` merged into `vite.config.ts` (already decided in System Architecture, just not installed there yet, same pattern as V0.2 for the API).

**Automated tests:** `pnpm --filter web test` — **9/9 passing** (6 domain, 3 use-case), zero network/DOM dependency. `pnpm --filter api test` still **71/71**. `pnpm typecheck` clean across both apps.

**Live verification performed** (browser-only — no new backend surface to `curl`):
- Playwright against the real running app: opened the allergy risk's detail panel, clicked "View as graph," measured wall-clock time from click to the canvas actually painting — **465–812ms across two runs**, under the NFR-002 1s budget, and that time includes the real network round-trip to the API, not just layout computation. Saw the exact same three nodes/two edges from the text explanation rendered as colored, labeled circles with directed, labeled arrows. Clicked the Drug node and got back its real attributes (`Drug: Ibuprofen (id: 60bad108-...)` — the actual database id). Scrolled to zoom and dragged to pan with no errors. **Did a full page reload**, redid the flow on a different risk (the interaction), graph view still resolved correctly. Zero console errors throughout.

**Done when** (verified exactly as scoped): opened a risk's detail panel, clicked "View as graph," saw the same nodes/edges from the text explanation as an interactive graph (pan/zoom confirmed, click-for-attributes confirmed with real data) within the NFR-002 time budget — screenshots in this session's record.

---

## Version 0.7 — Severity Filtering & Incremental Recheck — **Done** (2026-08-17)

**Touches:** REQ-015, REQ-016.

**Two genuinely different-shaped slices bundled under one version — built accordingly, not force-fit into one template:**

**REQ-016 (incremental recheck) — real new backend logic, full 5 layers:**
1. **Domain rule** (`interactions/domain/interaction.ts`) — `assertOnlyInvolvesDrug`: the actual business rule ("only traverse paths touching the newly added drug"), enforced as a runtime guard against the repository's result, not just hoped for from the query shape. A regression test proves it catches a pre-existing pair that shouldn't have come back. 3 new tests.
2. **Use case + port** (`interactions/application/useCases.ts` + extended `ports.ts`) — new `InteractionRepository.findInvolving(drugId, otherDrugIds)` port method and `findIncrementalInteractionRisks` use case. Tested against an in-memory fake (4 new tests) — including the exact scenario that makes this feature real: a pre-existing interaction between two already-known medications must **not** reappear when a third, unrelated drug is added.
3. **Real repository** (`neo4jInteractionRepository.ts`) — new Cypher: `MATCH (d:Drug {id: $drugId})-[r:INTERACTS_WITH]-(other:Drug) WHERE other.id IN $otherDrugIds`, an undirected pattern scoped to exactly the new drug, never touching pairs among `otherDrugIds` themselves.
4. **API** — new `POST /risk-check/incremental` in the `risk-check` module, orchestrating `findIncrementalInteractionRisks` (new) alongside `findAllergyRisks`/`findContraindicationRisks` (V0.4's, reused unchanged — they were already "incremental" by construction, since they take an explicit drug id list rather than deriving pairs from it). 4 new orchestration tests, including one proving a pre-existing interaction risk truly doesn't resurface.
5. **UI** — `AddMedicationRecheck` (inline in the risk dashboard, not a separate screen — see note below): persists the addition via the existing `PUT /patients/:id` (V0.2), then calls the new incremental endpoint and merges the result into the currently-displayed list, marking only the freshly-returned risks `isNew`.

**REQ-015 (severity filter/sort) — pure frontend, no new repository or endpoint needed:**
- **Domain rule** (`apps/web/src/risk/severityOrder.ts`) — severity is an ordered scale (minor < moderate < severe < contraindicated), not four unordered labels; `meetsSeverityThreshold`, `filterBySeverity`, `sortBySeverityDesc`. Operates entirely on data the already-real risk-check endpoint returns — no I/O of its own, so no use-case/repository layer applies here, same reasoning as V0.6's graph domain rule. 8 unit tests.
- **UI** — a severity `<select>` on the dashboard filtering to "at or above" the chosen threshold (matching the Build Plan's exact wording: selecting "Severe" hides *lower* severities, not higher ones), plus risks always sorted most-severe-first.

**Scope note:** the original task list said this UI work belongs to SCR-005 (Patient Profile Editor); built it inline in SCR-002 (Risk Dashboard) instead, since the actual "Done when" wording — "a user adds a new candidate drug to an existing patient **with prior results still on screen**" — describes staying on the dashboard throughout, not navigating to the profile editor and back.

**Automated tests:** `pnpm test` (both workspaces) — **99/99 passing** (82 API + 17 web, 18 new this version). `pnpm typecheck` clean across both apps.

**Live verification performed:**
- API via `curl`: created a fresh drug (Aspirin) and a fresh interaction (Aspirin+Warfarin, severe); created a fresh patient already having Warfarin+Ibuprofen (a known interacting pair); confirmed the full risk-check shows that pre-existing risk; added Aspirin via `PUT`; called `POST /risk-check/incremental` — **it returned only the new Aspirin↔Warfarin risk, correctly omitting the pre-existing Warfarin↔Ibuprofen one.**
- Browser via Playwright: filtered a mixed-severity dashboard to "Severe" minimum — the moderate-severity badge disappeared with no page reload, then reset back and it reappeared; added a fresh drug (Naproxen, interacting with Warfarin at moderate severity) to the "Incremental Test Patient" via the live UI — the new risk appeared instantly with a blue "NEW" pill and highlighted left border, while the two pre-existing risks on screen stayed unmarked; **did a full page reload**, ran a fresh full check, Naproxen's interaction was still there — the add had really persisted, not just appeared client-side. Zero console errors. Screenshot confirms the visual distinction.

**Done when** (verified exactly as scoped): added a new candidate drug to a patient with prior results on screen, clicked recheck, saw the updated list with the new risk visibly flagged — confirmed live, screenshot in this session's record. Filtering to "Severe" hid all lower-severity rows without a reload — confirmed via DOM assertions before/after the filter change.

---

## Version 0.8 — Multi-hop Explorer

**Touches:** REQ-017, REQ-021, SCR-006.

**Vertical slice**
- Domain rule: queries exceeding a configured hop/complexity limit are rejected server-side with a specific, actionable message (not silently truncated).
- API: `POST /explore`.
- UI: SCR-006 query builder, result list, and the relational-comparison panel (a documented equivalent query + join count, not a live-executed second query).

**Done when:** a user builds a 3-hop query (e.g., "drugs sharing a side effect with Drug X") in the explorer, runs it, sees matched paths, and can toggle a panel showing the equivalent relational-join query alongside it; a query that exceeds the configured hop limit shows the limit-exceeded message instead of hanging or erroring generically.

---

## Version 0.9 — Query History Log — **Done** (2026-08-17)

**Touches:** REQ-018, SD-008, SCR-007.

**Built out of order, at the user's explicit request** — V0.8 (Multi-hop Explorer) remains Not Started; skipped intentionally, not silently.

**Schema note:** logged only for `risk-check`/`risk-check/incremental` — `explore` (V0.8, REQ-017) doesn't exist yet, so there's nothing there to log yet. Also extended `resultSummary`'s documented JSON shape (System Architecture §3 said "risk counts by severity, or match count") to additionally embed the full original `risks` array on success — needed so a reopened entry can show the real original result without re-running the traversal (the actual "Done when" requirement), not just its counts. `queryType` also gained a fourth value, `incremental`, alongside the three System Architecture originally listed (`patient_check`, `ad_hoc`, `multi_hop`) — accurately describing what happened matters for a review/demo log.

**Built as a new `query-log` module (SD-008), full 5 layers:**
1. **Domain rule** (`domain/queryLog.ts`) — `summarizeResult`/`summarizeFailure` build the summary directly from the real risks/error; `assertSummaryConsistent` is the actual enforced business rule (REQ-018 — "log... result"): recomputes the severity tally from the summary's own stored `risks` array and compares it against `bySeverity`/`totalRisks`, rather than trusting them — the same reference-checking pattern as the explanation-grounding rule in V0.5, applied here to prevent a logged summary from silently drifting out of sync with what actually happened. 9 unit tests, including one proving the guard catches a fabricated mismatch.
2. **Use case + port** (`application/useCases.ts`, `ports.ts`) — `recordQuery`, `listQueryLog`, `getQueryLogEntry` against a `QueryLogRepository` interface. Tested against an in-memory fake (6 tests) — including that a fabricated summary is rejected *before* the repository is ever called.
3. **Real repository** (`neo4jQueryLogRepository.ts`) — `QueryLogEntry` nodes with `inputSummary`/`resultSummary` stored as JSON-string properties (Neo4j properties can't hold arbitrary nested objects); writes an optional `REFERENCED` edge to the `Patient` node when one exists, exactly matching the documented "absent for ad-hoc queries" cardinality.
4. **API** — `GET /query-log`, `GET /query-log/:id`, both read-only from the client's perspective (no `POST` exposed — matches SD-008's "read-only from the UI's perspective"). The actual write happens as a **best-effort side effect** wired into the existing `POST /risk-check` and `POST /risk-check/incremental` handlers (both success and failure paths, per SD-008) — a logging failure is caught and swallowed so it can never break the risk-check response the user is actually waiting on.
5. **UI** — new "History" tab (`QueryLogView`, SCR-007) listing past queries with an accurate summary line; clicking one opens `QueryLogDetail`, a genuinely read-only view (no filter, no "Add & Recheck," no click-through) rendering the exact original risk list pulled from the stored entry.

**Automated tests:** `pnpm test` (both workspaces) — **114/114 passing** (97 API + 17 web, 15 new this version). `pnpm typecheck` clean.

**Live verification performed:**
- API via `curl`: ran one real successful risk-check and one deliberately failing one (nonexistent patient id); `GET /query-log` showed both, most-recent-first — the failed entry with `status:"failed"` and the real error message, zero risks; the successful one with an accurate `bySeverity` tally and the **full original risks array** embedded. `GET /query-log/:id` returned the same entry directly; a nonexistent id returned `404 QUERY_LOG_ENTRY_NOT_FOUND`.
- Browser via Playwright: ran a fresh risk check for Jane Renamed, opened the new History tab, saw it listed with an accurate summary alongside the earlier failed entry from the `curl` test; clicked it and confirmed the reopened view is truly read-only (no recheck button, no severity filter present) while showing the exact same three risks (interaction/allergy/contraindication) as the original check; **did a full page reload**, reopened History, all four entries were still there. Zero console errors.

**Done when** (verified exactly as scoped): ran a risk check, navigated to history, saw it listed with an accurate summary, clicked it, and was shown the original result read-only without re-running the traversal — confirmed live, screenshots in this session's record.

---

## Version 0.10 — Bulk Data Import — **Done** (2026-08-17)

**Touches:** REQ-019, NFR-003, NFR-005, SD-006, SCR-008.

**Scope decision made explicit:** only the `drug` entity type is implemented (matching this version's exact "Done when" wording — a CSV of drug records). REQ-019/SD-006 speak more broadly of "drugs, interactions, etc.," but building parsers for every entity type wasn't needed to satisfy this version's scope; `ImportEntityType` is kept as an open union (`"drug"` today) and the pipeline (validate → job status → write) is entity-agnostic, so adding a second type later is a new domain validator + repository, not a redesign.

**PII detection is pattern-based, not a general PII-detection system** — the business rule text ("SSN-like, real-name+real-MRN pairs") is approximated with two concrete regexes: an SSN-shaped pattern (`XXX-XX-XXXX`) and an MRN-labeled-number pattern. Detecting "real names" generically would need an ML/NLP model — a separate project, explicitly out of scope here. Documented as a real limitation, not glossed over.

**No admin bootstrap flow exists** (by design — System Architecture never specified one; admins are provisioned out of band, same as machine API keys). Verified this version's admin gating by promoting a real user's role directly against the live database via a one-off script — a real operational action, not a shortcut around the feature.

**Built as a new `data-import` module (SD-006), full 5 layers:**
1. **Domain rule** (`domain/importValidation.ts`) — `assertNoPII`/`detectPII` (the actual business rule: any field value matching an SSN or MRN-labeled pattern is rejected, checked across *every* column regardless of entity type, since a bad file could put PII in any field) and `validateDrugRow` (PII check first, then required-field schema check). 11 unit tests, including the fixture-of-known-bad-records style NFR-003 explicitly asks for.
2. **Use case + ports** (`application/useCases.ts`, `ports.ts`) — `startImportJob`, `processDrugImport` (the actual async worker: validating → importing → complete/failed, writing only accepted rows), `getImportJob`. Tested against in-memory fakes (6 tests) — including the literal claim in the business rule, "never written": a PII/schema-rejected row is proven to never reach the writer, not just excluded from a count.
3. **Real repositories** (`neo4jImportJobRepository.ts`, `neo4jDrugImportRepository.ts`) — `ImportJob` nodes (errors stored as a JSON-string property, same pattern as `QueryLogEntry`); a dedicated Drug-writer instance, independent of the `drugs` module's own repository (same "own your infrastructure" precedent as every other module this session).
4. **API** — `POST /admin/import` (multipart, `multer` + `csv-parse`) returns `202` + `jobId` immediately; the actual validate/write work runs detached (System Architecture §7's in-process async worker, no external queue), polled via `GET /admin/import/:jobId`. New `requireAdmin` middleware (auth module) gates both routes — `401` unauthenticated, `403` authenticated-but-not-admin.
5. **UI** — `DataImportView` (SCR-008): file picker, fixed "Drug" entity-type selector, live status as the client polls, final accepted/rejected counts with per-row rejection reasons. A new "Admin" nav tab, present in the DOM only when `role === "admin"` — confirmed live that a standard user's page genuinely has no such button, not a disabled one.

**Automated tests:** `pnpm test` (both workspaces) — **131/131 passing** (114 API + 17 web, 17 new this version). `pnpm typecheck` clean.

**Live verification performed:**
- API via `curl`: confirmed a standard user gets `403 FORBIDDEN` on `POST /admin/import`; uploaded a real 4-row CSV as the promoted admin (2 clean drug rows, 1 SSN-shaped row, 1 row missing a required field) — got `202` + `jobId` immediately; polled `GET /admin/import/:jobId` to `status: "complete"` with `acceptedCount: 2, rejectedCount: 2`, each rejected row carrying its own specific reason (not a generic "invalid row"); confirmed both accepted drugs (Amlodipine, Metformin) were immediately queryable via the real `GET /drugs`.
- Browser via Playwright: confirmed a non-admin user's page has zero "Admin" buttons in the DOM; logged in as the real admin, uploaded a different real CSV through the actual file input, watched the job reach "Complete" with "2 accepted, 1 rejected" and the SSN row's specific rejection reason displayed; switched to the Drugs tab and saw both new drugs immediately, no reload needed; **did a full page reload**, they were still there. Zero console errors.

**Done when** (verified exactly as scoped): uploaded a real CSV, watched validating → importing → complete with accurate counts, new drugs immediately queryable elsewhere in the app, and the SSN-shaped row rejected with a specific reason, never silently dropped — confirmed live twice (API and browser), screenshots in this session's record.

---

## Version 0.11 — Export Report (stretch) — **Done** (2026-08-17)

**Touches:** REQ-020 (Could).

Built at the user's explicit request, ahead of the "only if time remains" condition — that condition was for autonomous pacing, not a blocker once directed.

**Format decision (original, V0.11):** JSON only, not PDF. The "Done when" wording ("opened separately, contains the same risks currently on screen") is fully satisfied by a readable JSON file; PDF generation would mean a new rendering dependency for a stretch feature with no requirement actually asking for a printable/visual document. Build Plan said "JSON or PDF" — this exercises that "or."

**Superseded in V1.1:** at explicit user request, the export was changed from a JSON dump to a natural-language PDF with severity highlighted — see Version 1.1 below. `buildExportReport`/`assertReportMatchesRisks` (the actual grounding business rule, item 1 below) are unchanged; only the rendering step changed.

**Shape of this slice, explained (same reasoning as V0.6):** no new backend endpoint or persistence — the risks being exported are already real data from the already-real, already-tested `POST /risk-check` endpoint. The "repository" for this slice is genuinely the browser's own download mechanism, injected as a testable port:
1. **Domain rule** (`apps/web/src/export/exportReport.ts`) — `buildExportReport` (pure assembly) and `assertReportMatchesRisks`, the actual enforced business rule matching this version's "Done when" literally: the exported report's risks must be exactly what's on screen — same ids, same severity tally — recomputed and compared, not trusted. Same reference-checking pattern as V0.5's explanation grounding, V0.7's incremental-scope guard, and V0.9's query-log summary check. 6 unit tests, including one proving the guard catches a report containing a risk id not on screen.
2. **Use case + port** (`exportRiskReport.ts`) — depends on a `ReportDownloader` interface, not a concrete implementation. Tested against an in-memory fake downloader (4 tests) that captures the filename/content instead of touching the DOM.
3. **Real "repository"** (`browserDownloader.ts`) — the actual browser download API: `Blob` + `URL.createObjectURL` + a programmatic anchor click. Real, not mocked — verified via a real captured download event, not a stubbed call.
4. **API endpoint** — none new, deliberately; nothing here needs the backend beyond what already-real risk-check data provides.
5. **UI** — an "Export report" button on the risk dashboard (SCR-002), next to "Back."

**Automated tests:** `pnpm test` (both workspaces) — **141/141 passing** (10 new this version, all in `apps/web`). `pnpm typecheck` clean.

**Live verification performed** (browser only — nothing new to `curl`):
- Playwright against the real running app: ran a real risk check for a patient with all three risk types, captured the exact on-screen risk summaries via the DOM, clicked "Export report," captured the **real browser download event**, saved the actual file to disk, and parsed it — its `risks` array's summaries matched the on-screen set exactly (order differs, content identical), `riskCount` and `bySeverity` were accurate. **Did a full page reload**, re-ran the check, exported again — the second file reflected freshly-fetched live data, not a stale client-side cache. Zero console errors.

**Done when** (verified exactly as scoped): ran a risk check, downloaded a report file, and — opened separately (parsed straight off disk, not through the app) — it contained the same risks as the screen. Confirmed by direct file inspection, included in this session's record.

---

## Version 1.0 — Hardening — **Done** (2026-08-17)

**Scope:** no new features. This version's shape doesn't match the domain/use-case/repository/API/UI template every prior version used — Build Plan says so explicitly ("no new features") — so it wasn't forced into one. What follows is the actual audit-and-fix work the four tasks below called for, including two real defects found and fixed along the way.

### 1. Full click-through — 4 of 5 journeys PASS end-to-end, 1 not executable by design

Ran all 5 UX-document journeys as continuous flows (not isolated feature checks) via Playwright against the live app, zero console/page errors throughout:

- **Journey 1 (pharmacist, full check):** PASS. Login → patient risk check → severity-badged risk list → risk detail with explanation + path → "View as graph" → real Cytoscape render → back through every step cleanly.
- **Journey 2 (doctor, incremental recheck):** PASS. Prior results stayed on screen while adding a candidate medication; severity filter and "Export report" both worked mid-journey without disrupting the displayed results.
- **Journey 3 (researcher, multi-hop exploration):** **NOT EXECUTABLE.** SCR-006 doesn't exist — V0.8 was intentionally skipped earlier at the user's direction, not a defect introduced here. Confirmed no exploration entry point exists anywhere in the nav. This is a known, accepted gap, not something "fixed" by this version (fixing it would mean building V0.8, which is out of this version's "no new features" scope).
- **Journey 4 (decision-support, query-log review):** PASS. History tab listed real past queries (including ones from this session's own testing); reopening one is genuinely read-only — no recheck button, no severity filter present in that view.
- **Journey 5 (admin, dataset import):** PASS. Real CSV upload → accurate accepted/rejected counts → new drug immediately visible in the Drugs tab.

One non-issue investigated and ruled out: a script-timing race during Journey 2 (Playwright counted risk cards before the async fetch resolved) looked like a possible bug; directly queried the real API and confirmed the patient's 3 risks were correct all along — not an application defect.

### 2. Consistency pass — 2 real fixes made, not just an inspection

A grep-based audit (not just visual inspection) for hardcoded hex colors and off-scale spacing outside `styles.css` surfaced two genuine, fixable gaps:

- **Missing tokens:** the Design System document has defined `--color-node-patient/-drug/-disease/-allergen/-side-effect` since V0.6, but they were never actually added to `styles.css` — a real drift between the documented system and the shipped CSS. Added them.
- **Wrong + duplicated values:** `RiskDetailPanel.tsx`'s path-node chips referenced `var(--color-action-default)` for Drug (a different blue, `#1D4ED8` vs. the correct `#2563EB`) and hardcoded raw hex for Patient/Allergen/Disease instead of referencing tokens — now fixed to reference the real tokens. Verified live via computed-style inspection: the Drug chip now renders `rgb(37, 99, 235)` (`#2563EB`, correct) instead of the old wrong value.
- **Off-scale badge/chip padding:** four independently-built pill components (`RiskTypeLabel`, `ReferencePicker` chips, `RiskDetailPanel` node chips, the "NEW" badge in `RiskDashboard`) each invented slightly different padding (`1px 6px`, `2px 10px`, `2px 8px`, `1px 8px`) instead of the Design System's documented `space-1 space-2` (4px 8px) badge spec — which the actual severity `.badge` CSS class already followed correctly. Standardized all four to `var(--space-1) var(--space-2)`. Also replaced several `gap`/`margin` values that were numerically on-scale (4px, 8px) but written as raw numbers instead of token references, for the same reason: consistency should come from referencing the token, not from a coincidentally-matching literal.
- **Deliberately left as-is:** `GraphView.tsx`'s Cytoscape style config uses hardcoded hex — a real, unavoidable constraint (Cytoscape renders to `<canvas>` via its own style engine, which cannot resolve CSS custom properties). Verified each value still matches its corresponding token exactly and annotated each with an inline comment naming the token, so a future edit to the token doesn't silently desync from the canvas config.

### 3. NFR verification — measured, not estimated

- **NFR-001** (`POST /risk-check` p95 ≤ 2s, ≥5,000 drugs / ≥50,000 edges, ≤20 medications): bulk-seeded 50,000 real Drug nodes and 500,000 real `INTERACTS_WITH` edges directly into the live database (batched `UNWIND`, ~113s total), created a real patient with 20 medications drawn from that pool plus 5 genuine interactions among them, then ran `POST /risk-check` against the live API 30 times. **Result: min 94.0ms, p50 120.9ms, p95 259.9ms, max 2043.9ms — PASS** (p95 target is 2000ms). Worth reporting honestly: the very first cold-cache request hit 2043.9ms, right at the boundary — Neo4j's query-plan/page cache visibly warming up against freshly bulk-loaded data. Every subsequent run dropped to the 94–260ms range. NFR-001 specifies p95, which comfortably passes; the cold-start behavior is a real, normal characteristic worth knowing about (e.g., for a production deploy that wants a warm-up query), not a defect.
- **NFR-002** (SCR-004 render ≤1s for up to 50 nodes): the domain model as actually built never produces a path anywhere near 50 nodes — every real `RiskPath` is 2–3 nodes (an interaction is 2 drugs; an allergy/contraindication with patient context is 3 nodes). The literal 50-node scenario isn't reachable through the live app as scoped, and won't be until some future feature produces larger subgraphs (V0.8 territory). Two honest data points instead: the V0.6 synthetic benchmark proved the rendering technology itself handles 50 nodes in ~93–252ms depending on layout (well under budget), and the V0.6 live-app measurement of the actual achievable case (a real 3-node path, real network round trip included) was 465–812ms across two runs — also under budget.
- **NFR-005** (≥50,000 drug nodes, ≥500,000 edges, no redesign): the same bulk seed above **is** this load test. The schema, all relationship-uniqueness constraints, and normal read/write operations all continued working correctly at full scale — spot-checked by attempting to create a duplicate relationship id (correctly rejected by the constraint even with 500,000+ existing edges) and timing an ordinary node create+delete (~1s round trip, unremarkable). **PASS.** Synthetic data was tagged (`loadTest: true`) and fully deleted afterward — verified zero tagged nodes remain and the real demo dataset (10 real drugs, all real patients/risks) survived untouched.
- **NFR-006** (`/health` reflects real DB reachability): stopped the real Neo4j container mid-session. `/health` correctly returned `503 {"status":"degraded","graphDb":"unreachable"}`. **PASS.**

### 4. Security review — one real gap found and fixed

- **Every protected endpoint rejects unauthenticated requests:** swept all 20 real protected endpoints with no token — **20/20 correctly returned 401.** Public endpoints (`/health`, `/auth/login`, `/auth/register`) correctly don't require auth.
- **Admin-only routes reject non-admin:** both `POST /admin/import` and `GET /admin/import/:id`, hit with a real authenticated-but-standard-role token — **2/2 correctly returned 403.**
- **PII-pattern validator exercised against a fixture of known-bad records:** already covered by the 11 unit tests in `importValidation.test.ts` from V0.10 — re-confirmed passing, no new fixture work needed.
- **Error responses never leak internal details, only a correlation ID:** **found a real gap.** System Architecture §7 documented this behavior since it was first written, but the actual global error handler never implemented it — a plain `{code, message}` with no correlation ID, and no server-side log correlation at all. **Fixed:** the handler now generates a real UUID per unhandled error, logs `[id] <error>` server-side, and returns `{error:{code,message,correlationId}}` to the client — nothing else. Verified live: stopped the database mid-session, hit an endpoint that needed it, got back a real `500` with a correlation ID and no stack trace or internal detail, while `/health` on the same outage correctly reported `503`.

---

## Version 1.1 — Soft Delete (Patients & Drugs) + PDF Export — **Done** (2026-08-19)

**Touches:** REQ-027 (new, this version), REQ-020 (format change, Could).

Built at the user's explicit request. Two independent pieces, planned together and confirmed with the user before implementation since the delete feature is new capability (not covered by any prior REQ/SD entry) — `02-requirements.md`, `05-system-architecture.md` §3/§4, and `03-ux-product-design.md` (new SCR-009) were updated first, then implemented to match, per the user's own stated rule for spec-changing work.

### 1. Soft delete — Patients & Drugs, unified Deleted view

**Design decision:** soft delete, not hard delete. A hard `DETACH DELETE` on a Drug would destroy its `INTERACTS_WITH`/`CONTRAINDICATED_FOR`/`CONTAINS_ALLERGEN` edges and any patient's `TAKES` edge to it, corrupting historical query-log entries that reference it. Instead, a `deletedAt` property is set; active-list queries filter it out, `findById`/direct lookups stay unfiltered so history keeps resolving.

1. **Patients** (extended the existing layered module): `domain/patientProfile.ts` gained `assertNotAlreadyDeleted`/`AlreadyDeletedError` (idempotency guard — delete is a one-way transition, re-deleting is a 409, not a silent no-op); `application/useCases.ts` gained `deletePatient`/`listDeletedPatients`; `infrastructure/neo4jPatientRepository.ts` gained `softDelete`/`listDeleted`, and `list()` now filters `deletedAt IS NULL`. `patient.routes.ts`: `DELETE /patients/:id` (200/404/409), `GET /patients/deleted` (registered before `/:id` to avoid route collision). 5 new domain/application tests.
2. **Drugs** (stayed flat — deletion here has no real new invariant beyond the same not-found/already-deleted check the flat create path already does inline): `drug.repository.ts` gained `deleteDrug`/`listDeletedDrugs`, `listDrugs()` filters `deletedAt IS NULL`. `drug.routes.ts`: `DELETE /drugs/:id`, `GET /drugs/deleted`.
3. **Cross-module effect**: `patients/infrastructure/neo4jReferenceCatalog.ts`'s `existingDrugIds` (and, as a side effect of one shared query shape, `existingAllergenIds`/`existingConditionIds`) now excludes soft-deleted nodes — a deleted drug can no longer be referenced by a new or updated patient profile, verified live (see below).
4. **UI**: `PatientList.tsx`/`DrugList.tsx` each gained a `.btn-ghost-danger` trash-icon button per card (new `IconTrash` in `icons.tsx`, new `.btn-ghost-danger` CSS rule), `window.confirm()` before calling through — no new confirm component, matching the rest of the app's lack of multi-step confirms. New `DeletedView.tsx` (SCR-009): fetches both deleted lists, merges client-side, filterable by type via the same `<select>` pattern as the severity filter. New "Deleted" sidebar nav item.

**Automated tests:** `pnpm test` — API 119/119 passing (5 new), web 27/27 passing (unaffected by this piece). `pnpm typecheck` clean on both workspaces.

**Live verification (Playwright against the real running app, real Neo4j):**
- Created a drug and a patient, deleted both from the UI — both disappeared from their active lists immediately (confirmed via DOM query, not assumed from the click), no console errors.
- Deleted page showed both, mixed with real pre-existing deleted records (a patient named "atharva" the user had apparently already deleted independently while this was being built — an authentic third data point, not one of the test's own fixtures).
- Type filter (`All`/`Patients`/`Drugs`) correctly scoped the list both ways — drug filter showed only the deleted drug, patient filter showed only the deleted patient.
- Full page reload: deleted record still present (real persistence, not client cache).
- Attempted to add the deleted drug's name to a brand-new patient profile: correctly rejected — `"<name>" was not found in the drug catalog.` — proving the catalog exclusion actually took effect end-to-end, not just at the repository-unit level.

### 2. Export Report — JSON → natural-language PDF

**Constraint honored:** "rest all implementations remain unchanged" — `exportReport.ts`'s `buildExportReport`/`assertReportMatchesRisks` (the actual grounding business rule from V0.11) are untouched. Only the rendering step changed.

1. New `apps/web/src/export/pdfRenderer.ts` — `renderReportPdf(report)` turns the existing `ExportReport` into prose via **jsPDF** (new dependency, Technology Decision Log updated): title, patient context, generated-at timestamp, a summary sentence, then one paragraph per risk (`"SEVERE — INTERACTION" / "Aspirin and Warfarin have a severe interaction."`) with the severity tag colored using the same hex values as `styles.css`'s severity tokens (hand-synced, same pattern as `GraphView.tsx`'s Cytoscape config, since a PDF canvas can't read CSS custom properties either).
2. `ReportDownloader` port widened from `content: string` to `content: Blob`; `browserDownloader.ts` passes the Blob straight through. `exportRiskReport.ts` now calls `renderReportPdf` instead of `JSON.stringify`, filename `.json` → `.pdf`, mime type `application/pdf`.
3. `exportRiskReport.test.ts` updated to assert on the returned Blob (type, non-zero size, filename pattern) instead of parsed JSON — `exportReport.test.ts` (the grounding-rule tests) untouched, as expected.

**Automated tests:** `apps/web` 27/27 passing (4 in `exportRiskReport.test.ts`, updated for the Blob-based flow).

**Live verification:**
- Ran a real risk check against "Incremental Test Patient" (3 real risks: 2 severe, 1 moderate), clicked "Export report," captured the real browser download event, saved the actual `.pdf` to disk.
- Parsed the file's text **off disk, independent of the app** (`pdf-parse`, not the app's own code): confirmed natural-language sentences and severity labels are genuinely present —
  ```
  Drug Interaction Risk Report
  Patient: Incremental Test Patient
  Generated 19/08/2026, 20:07:13
  3 risks found: 1 moderate, 2 severe.
  SEVERE — INTERACTION
  Aspirin and Warfarin have a severe interaction.
  SEVERE — INTERACTION
  Warfarin and Ibuprofen have a severe interaction.
  MODERATE — INTERACTION
  Naproxen and Warfarin have a moderate interaction.
  ```
  — matches the on-screen risk set exactly, same as V0.11's original JSON check.

### Regression pass (both pieces together, real app)

Severity filter (3 risks → 2 at "severe" minimum), risk detail panel, and graph view (SCR-004) all re-verified working unchanged. Incremental recheck's own pre-existing "already on this patient's medication list" validation correctly fired for a repeat drug — confirming that code path is untouched and still live, not merely that no error was thrown. Zero console errors across every script.

**Done when:** delete removes a patient/drug from its active list and surfaces it in a filterable Deleted view without breaking existing references (verified live); Export Report produces a real PDF, parseable off disk, containing natural-language sentences with severity called out per risk (verified live); all other implementations (risk-check, severity filter, incremental recheck, graph view, query log) unchanged (verified live + 146/146 automated tests passing).

---

## Version 1.2 — Edit Drug + Graph View Patient-Connection Fix — **Done** (2026-08-19)

**Touches:** REQ-001 (drug entity CRUD completeness, behavior-only), System Architecture §4 (`GET /risks/{riskId}`'s documented scope, extended — not a new endpoint).

Two independent pieces from the same request.

### 1. Edit drug

Behavior-only — no REQ needed beyond the existing REQ-001 (drug storage); this is CRUD completeness, not new capability, so no spec document had to move first.

1. **Backend** (`drugs` stayed flat — editing has no new invariant beyond the same required-fields check `POST` already does inline): `drug.repository.ts` gained `updateDrug(id, fields)` (plain `SET` on all four fields, throws the existing `DrugNotFoundError` if the id doesn't match). `drug.routes.ts` gained `PUT /drugs/:id` (200/400/404), sharing a `parseDrugFields` helper with `POST` instead of duplicating the same validation block twice.
2. **Frontend**: `DrugForm.tsx` extended to mirror `PatientForm.tsx`'s exact edit-mode shape — takes `editingDrug: Drug | null` + `onCancel`, pre-fills via `useEffect`, swaps "Add a drug"/"Add drug" for "Edit {name}"/"Save changes" + a Cancel button. `DrugList.tsx` gained an edit pencil button (new `IconEdit` in `icons.tsx`) next to the existing delete trash icon on every card. `App.tsx` gained `editingDrug` state, cleared on save/cancel/logout.
3. System Architecture §4 updated with the new `PUT /drugs/{id}` row (all four fields required, unlike patient's partial `PUT`).

**Live verification:** clicked the edit icon on a real drug, changed its drug class, saved — the card updated immediately with the new value (confirmed via DOM, not assumed). Verified the Cancel button correctly returns the form to "Add a drug" without submitting. Zero console errors.

### 2. Graph View — interaction risks now show the patient connection

**Root cause (found, not assumed):** `buildInteractionPath` never accepted a patient, unlike `buildAllergyPath`/`buildContraindicationPath` which already did (V0.5) — verified live *before* changing anything that allergy and contraindication graphs both already correctly showed the Patient node (created a real allergy link and a real contraindication link, a real patient referencing both, and viewed each as a graph — both showed `Patient —[HAS_ALLERGY]→ Allergen` / `Patient —[HAS_CONDITION]→ Disease` correctly). Only the interaction path was missing this — an inconsistency across the three risk types, not a broken data-fetch chain (confirmed `patientId` was already threaded correctly end-to-end from `GraphView.tsx` → `loadRiskGraph.ts` → `apiRiskDetailFetcher.ts` → `GET /risks/:id?patientId=`).

**Fix:** `buildInteractionPath(interaction, patient?)` now optionally adds the Patient node and a `TAKES` edge to each interacting drug, mirroring the existing allergy/contraindication pattern exactly. `TAKES` was already a documented relationship type (§3, used for `Patient → Drug` medication-list edges) — added to the frontend's `PathEdgeType` union in `packages/shared-types`. `getRiskDetail` (explanations `useCases.ts`) now resolves and passes the patient into `buildInteractionPath` the same way it already did for the other two risk types. No frontend rendering change needed — `toGraphElements.ts`/`GraphView.tsx` already map any path generically, no hardcoded edge-type list.

**Automated tests:** 2 new (`riskPath.test.ts`, `useCases.test.ts`) — API 121/121 passing.

**Live verification:** reproduced the exact reported repro (Patients → Incremental Test Patient → Check for risks → Aspirin + Warfarin → View as graph) — now shows `Incremental Test Patient` connected via `TAKES` to both Aspirin and Warfarin, alongside `INTERACTS_WITH (severe)` between the drugs. Confirmed against real data, not a fixture.

### Regression pass (both pieces, real app)

Full workspace test suites: API 121/121, web 27/27 (148 total). `pnpm typecheck` clean on both. Re-verified unrelated to this change: severity filter, incremental recheck's own validation, and the existing allergy/contraindication graph views (screenshotted again — unchanged). Zero console errors across every script.

**Done when:** a drug can be edited from its card and the change persists (verified live); the interaction graph view shows the patient's connection to both drugs, matching the already-correct allergy/contraindication behavior (verified live against the user's exact reported repro); all other implementations unchanged (verified live + 148/148 automated tests passing).

---

## Version 1.3 — Patient/Drug Forms as Pop-up Modals — **Done** (2026-08-19)

**Touches:** none (behavior/presentation-only). Checked first: neither `02-requirements.md` nor `05-system-architecture.md` prescribe inline-vs-modal presentation for SCR-005; the Design System doc's own token list already had an unused `--color-bg-overlay` for exactly this pattern. No document needed to move before implementing.

Three requests, one underlying change: replace "form appears inline on the page" with "form appears in a pop-up window," for patient create/edit and drug create/edit, without touching any of the forms' own save/validate/cancel logic.

1. New `components/Modal.tsx` — a single reusable pop-up: dimmed backdrop (`--color-bg-overlay`), renders via `createPortal` to `document.body`, closes on Escape, on click-outside, or its own `×` button. Deliberately generic — takes only `onClose` + `children`, no entity-specific logic — so both patient and drug forms reuse the same component.
2. New CSS (`.modal-overlay`, `.modal-dialog`, `.modal-close`) — the dialog itself carries no background/shadow of its own; the form rendered inside supplies the usual `.card` look (with `--shadow-lg` instead of the inline default `--shadow-xs`, for the elevated pop-up feel), so a form reads the same whether inline or modal.
3. `PatientsView.tsx`: swapped the `<div className="app-content-narrow">` wrapper around `<PatientForm>` for `<Modal>`. No change to `PatientForm` itself, or to any save/cancel/delete logic.
4. `App.tsx` (Drugs tab): the previously permanent inline `<DrugForm>` is now conditionally rendered inside `<Modal>`, gated on a new `creatingDrug` state (mirroring `PatientsView`'s existing `creatingNew`) or the existing `editingDrug` state. Added a "+ New Drug" button in `page-actions`, styled and positioned identically to "+ New patient". No change to `DrugForm`, `handleSaveDrug`, or `handleDeleteDrug`.

**Automated tests:** unaffected (`Modal` is presentation-only, not unit-tested — the domain/application layers it wraps are already covered). Web 27/27 passing, unchanged from V1.2. `pnpm typecheck` clean.

**Live verification (Playwright, real app):**
- "+ New patient" opens a real modal overlay; Escape closes it; clicking outside the dialog closes it; clicking an existing patient card opens the edit form in the same modal.
- Drugs page: confirmed the permanent inline form is gone; "+ New Drug" opens the modal; created a real drug through it (persisted, visible in the list, modal closed on success); clicked its edit pencil — modal reopened pre-filled; changed a field and saved — change persisted, modal closed.
- Zero console errors across every interaction.

**Done when:** clicking "+ New patient" shows the form as a pop-up window (verified live); the Drugs page's permanent form is replaced by a "+ New Drug" button that opens a pop-up window (verified live); the edit-drug icon opens a pop-up window instead of an inline component (verified live); all other implementations — save, validate, cancel, delete, the rest of the app — unchanged (verified live + 148/148 automated tests passing).

**Done when** (verified exactly as scoped, with one explicit exception): 4 of 5 journeys completed unaided end-to-end (Journey 3 blocked by the deliberately-unbuilt V0.8, not a defect); every screen re-audited against the Design System with two real fixes made, not just inspected; all four NFR numbers measured live and recorded above, replacing the placeholder; the security checklist passes with one real finding, found and fixed, not left open.

---

## Version 2.0 — Conversational Interface

Major structural change to the core user flow, built at the user's explicit request: replaces the multi-screen CRUD flow (login → import drugs → create patient → check risks → view graph) with a single ChatGPT-style page — free-text natural-language question in, LLM-composed grounded answer out, plus a Cypher-view button, a quick-check popup, session history, and (Could) a body-diagram highlight. Full rationale, requirements (REQ-028–034), and architecture (SD-009/SD-010) in `docs/v2-conversational-assistant/` — created as a separate folder per the user's explicit instruction rather than editing `02-requirements.md`/`05-system-architecture.md` in place, so the V1 flow stays documented as historical record.

**Core design decision** (see the approved plan and `docs/v2-conversational-assistant/05-system-architecture.md`'s "Core Design Decision" framing): the LLM (OpenAI — user's explicit choice over Anthropic, despite this build running inside a Claude Code session) is scoped to exactly two things — free-text entity/intent extraction, and rephrasing an already-graph-grounded fact set into prose. Every risk/severity/path fact still comes from the unchanged V0.3–V0.5 pipeline (`checkRisks`, `buildXPath`/`explainPath`/`assertGroundedInPath`); a chat session's backing profile reuses the existing, tested `patients` module 1:1 rather than inventing new profile storage. This is what keeps REQ-011's grounding guarantee true with an LLM newly in the loop, and it's the single biggest reuse decision in this version — see the plan for why.

Broken into 8 sequenced sub-versions, each leaving the app in a working, testable state (per CLAUDE.md's build-plan convention), status tracked in the table above:

- **2.0.0 — Groundwork**: new docs folder, `shared-types` additions, `migrate.ts` constraints for `ChatSession`/`ChatMessage`, real `db:seed` script + auto-seed-on-boot (closes the long-standing gap where `pnpm db:seed` was documented in CLAUDE.md but never implemented). Old UI untouched and still fully functional.
- **2.0.1 — Session plumbing**: `chat-sessions` module + routes, `ChatPage`/`ChatSidebar`/`ChatComposer`/`MessageBubble` wired to a stub/echo answer — proves persistence + ownership + sidebar before any LLM risk.
- **2.0.2 — Grounded risk pipeline**: `assistant` module's extraction → entity resolution → `checkRisks` → grounded explanation path; OpenAI used only for extraction, answer text still template-only.
- **2.0.3 — LLM answer composition**: `composeAnswer` wired in with precaution tips — completes the "primary skeleton flow" (REQ-028/029).
- **2.0.4 — Cypher view** (REQ-030).
- **2.0.5 — Quick-check popup** (REQ-031).
- **2.0.6 — Remove legacy UI**: delete the superseded components, rewrite `App.tsx`. Done last so the old flow stays available as a working reference while 2.0.1–2.0.5 are built and live-verified.
- **2.0.7 — Body diagram** (Could, REQ-034): only if time remains, same precedent as V0.11's stretch-feature framing.

Each sub-version gets its own "Tasks as built" / "Automated tests" / "Live verification performed" / "Done when" write-up appended below as it completes, matching every prior version's format in this document.

---

### Version 2.0.0 — Groundwork — **Done** (2026-08-21)

**Tasks as built:**
1. New `docs/v2-conversational-assistant/` folder: full updated `02-requirements.md` (REQ-028–034), `05-system-architecture.md` (SD-009/SD-010, schema/route additions), `03-ux-product-design.md` (SCR-010–015) — originals in `docs/` untouched. `07-technology-decision-log.md`/`08-build-plan.md` updated in place per their own living-doc convention.
2. `packages/shared-types`: `ChatSession`/`ChatMessage`/request-response types, `QueryType` extended with `"chat"`.
3. `apps/api/src/db/migrate.ts`: `chat_session_id_unique`/`chat_message_id_unique` constraints.
4. Real `apps/api/src/db/seed.ts`/`seedData.ts`/`runSeed.ts` — idempotent (`MERGE`-by-name) seed pipeline reusing the existing data-import repositories and each risk module's own `create*` use case; gated by `isCatalogEmpty()`. Closes the gap where `pnpm db:seed` was documented in CLAUDE.md but never implemented.
5. `server.ts` calls `seedIfEmpty()` on boot (best-effort, non-fatal on failure) before listening.
6. Two pre-existing legacy components (`QueryLogView.tsx`/`QueryLogDetail.tsx`) needed a one-line label addition for the widened `QueryType` to stay buildable.

**Automated tests:** `pnpm test` — 133 API + 27 web = 160/160 passing (no new tests this version — pure groundwork). `pnpm typecheck` clean.

**Live verification performed:**
- Migration applied cleanly to both the real dev Neo4j and a disposable fresh instance (spun up and torn down separately, never touching existing dev data).
- Seed script run against the disposable empty instance produced exactly the expected 8 drugs / 2 allergens / 2 diseases / 3 interactions / 2 allergy links / 2 contraindications, including the aspirin↔warfarin severe interaction the user's own example query names — verified directly via `cypher-shell`.
- API server boots cleanly against the real dev DB (correctly detects existing data, skips seeding, `/health` responds).

**Done when:** old UI fully functional and unchanged; new schema/seed infrastructure in place and proven against a real empty database — confirmed live.

---

### Version 2.0.1 — Session Plumbing — **Done** (2026-08-21)

**Tasks as built:**
1. New `apps/api/src/modules/chat-sessions/` (layered): `domain/chatSession.ts` (ownership + deterministic title-derivation rules), `application/ports.ts`/`useCases.ts` (create/list/get/post-message/delete — `createSession` provisions the 1:1 backing `Patient` via the existing `patients` module's own `createPatient`), `infrastructure/neo4jChatSessionRepository.ts` (new `ChatSession`/`ChatMessage` nodes, `OWNS`/`HAS_MESSAGE`/`HAS_PROFILE` edges), `chatSession.routes.ts` mounted at `/api/v1/chat-sessions`.
2. A `StubTurnAnswerer` filled the `TurnAnswerer` port for this version only — echoed the message back, proving persistence/ownership/sidebar plumbing before any LLM or risk logic. Replaced in V2.0.2 (deleted once superseded — no dead code left behind).
3. Frontend: `ChatPage`/`ChatSidebar`/`ChatComposer`/`MessageBubble`, wired into `App.tsx` as a new "Chat" tab (now the default) alongside the still-fully-functional legacy tabs — legacy removal stays deliberately deferred to V2.0.6.

**Automated tests:** `pnpm test` — 160/160 passing (no new automated tests this version — plumbing only, proven live instead). `pnpm typecheck` clean.

**Live verification performed:**
- `curl`: full create→post→get→list→delete cycle against the real dev Neo4j; ownership/auth checks — 403 cross-user access, 404 unknown session, 401 no token, 400 empty message — all correct.
- Browser (real headless Chromium via Playwright, no `chromium-cli`/project run-skill available so one was improvised in the scratchpad): register → log in → land on Chat by default → send the user's own example query → see it echoed by the stub → session appears in the sidebar with a derived title → "New chat" starts clean while the prior session stays listed. Zero console errors.

**Done when:** a user can create sessions, send messages, see history in the sidebar, and start fresh sessions — all persisted server-side, not client state — confirmed live via `curl` and browser.

---

### Version 2.0.2 — Grounded Risk Pipeline — **Done** (2026-08-21)
### Version 2.0.3 — LLM Answer Composition — **Done** (2026-08-21)

Built together in one pass (the underlying orchestration code is the same function; only the answer-text source differs) but verified as two genuinely separate safety checkpoints, per the plan: first that real OpenAI-extracted entities still satisfy the unchanged `assertGroundedInPath` guarantee with a deterministic template answer, then that layering `composeAnswer` on top never lets the LLM state a fact outside that same grounded set.

**Tasks as built:**
1. New `apps/api/src/modules/assistant/` (layered), SD-009:
   - `domain/entityResolution.ts` — exact case-insensitive match (same precedent as `data-import`'s name matching) then a small hand-rolled Levenshtein fallback (no new dependency); `domain/safetyTips.ts` — deterministic `(riskType, severity) → precaution strings`, never LLM-invented, staying inside REQ-022's "no clinical diagnosis" boundary.
   - `application/useCases.ts`'s `runTurn`: extract (LLM) → resolve names against a small own `AssistantCatalogPort` → union onto the session's backing `Patient` profile via the existing `patients` module's `updatePatient` (only when it actually changed) → `checkRisks` (SD-004, unchanged) → per risk, `getRiskDetail` (SD-005, unchanged — this is what keeps `assertGroundedInPath` enforcement verbatim) → attach precaution tips → deterministic template answer as the always-available fallback → `composeAnswer` (LLM) layered on top, falling back to the template on any LLM failure → `recordQuery` (reusing SD-008, new `queryType: "chat"`).
   - `infrastructure/openAiLlmAdapter.ts` — real `LlmPort`: `extractEntities` via OpenAI's `json_schema` structured-output mode (strict), `composeAnswer` via a plain chat completion with a system prompt that hard-forbids introducing any fact outside the supplied grounded list. `infrastructure/neo4jAssistantCatalog.ts` — small own id+name catalog reader (same "own your infrastructure" precedent as every other module's catalog lookups).
   - New dependency: `openai` ^7.5.0 (Technology Decision Log updated — this is the entry that reverses V0.5's "no LLM" decision, with the reason given explicitly). `config.ts` gained `OPENAI_API_KEY` (required) / `OPENAI_MODEL` (optional, defaults to `gpt-4o-mini`, deliberately not hardcoded as fact — see the log entry).
2. `chat-sessions/infrastructure/assistantTurnAnswerer.ts` — a small adapter from `assistant`'s own result shape to the `TurnAnswerer` port `chat-sessions` owns; `assistant` has no knowledge of `chat-sessions` at all, dependency points one way. Wired into `chatSession.routes.ts` in place of the now-deleted `StubTurnAnswerer`.

**A real bug found and fixed by the live browser check, not by unit tests:** sending the first message of a brand-new session raced the `activeId`-change effect's own transcript fetch against `handleSend`'s local optimistic append — both ended up writing the same two messages, producing a React "duplicate key" console warning and, worse, an unreliable transcript. Fixed by making `handleSend` re-fetch (`loadMessages`) instead of appending, so both code paths always converge on the same idempotent "fetch and replace" — never two independent writers of the same state. Re-verified with a dedicated multi-turn/session-switch browser script afterward: exact bubble counts at every step (2 → 4 → 0 in a new session → 4 again after switching back), zero console errors.

**Automated tests:** `pnpm test` — API 147/147 (14 new: 6 domain in `entityResolution`/`safetyTips`, 6 application in `assistant/useCases.test.ts` against in-memory fakes proving NFR-008 — the LLM's `composeAnswer` receives exactly the grounded risk set `checkRisks`/`getRiskDetail` actually produced, nothing fabricated, nothing dropped, plus the NFR-007 extraction-failure and composition-failure fallback paths), web 27/27 unchanged. `pnpm typecheck` clean on both workspaces.

**Live verification performed (real OpenAI calls throughout, not mocked):**
- `curl`, the user's own exact example query ("I am taking aspirin and warfarin together, am I exposed to any risks?") — real extraction correctly identified both drugs, real `checkRisks` found the real severe interaction, and the composed answer named exactly that drug pair and severity with no fabricated content, in ~7s round-trip.
- `curl`, a genuinely risk-free query (metformin) — positive, reassuring composed answer, empty `risks` array, not a fabricated reassurance.
- `curl`, a nonexistent drug name ("Zorbitaxil") — correctly surfaced as unresolved, composed answer asked the user to double-check spelling, never guessed a wrong match.
- `curl`, multi-turn accumulation in one session — turn 1 (aspirin only) correctly found no risk; turn 2 in the *same* session ("my doctor just added warfarin") correctly found the severe interaction using the profile accumulated from turn 1, proving REQ-016-style incremental behavior falls out of the session-is-a-patient-profile design for free.
- `GET /query-log` — confirmed real `queryType: "chat"` entries recorded for each turn.
- Browser (Playwright): the full aspirin/warfarin example rendered correctly in the actual chat UI end-to-end; a separate script drove two turns in one session plus a new-session-and-switch-back sequence, confirming exact message counts at each step and zero console errors after the race-condition fix above.

**Done when:** a free-text question about a real drug pair produces a natural-language answer that states only real, graph-grounded facts (verified by direct comparison against `checkRisks`' actual output, both in unit tests against fakes and live against the real database and real OpenAI); a risk-free question is met with a genuine, non-fabricated reassurance; an unresolvable name is surfaced, never guessed — confirmed live, both API- and browser-level.

---

### Version 2.0.3.1 — Interaction Risk/Tip Demo-Data Enrichment (addendum) — **Done** (2026-08-21)

Built at the user's explicit request, discovered mid-session: the live dev database's actual drug catalog turns out to have been loaded from `demo-data/drug-import-demo.csv` (not this build's own `seedData.ts` fixture, which never ran against this database since it wasn't empty — see V2.0.0). The user asked for two new authored columns on that CSV — `risks` (the specific physiological risk of each interaction pair) and `tips` (a mitigation tip for each) — kept aligned to the existing `interactsWith` column, then re-imported into the running backend.

**Tasks as built:**
1. **Content**: authored a risk description + mitigation tip for all 38 interaction pairs in the CSV (the 39th live edge, Naproxen–Warfarin, predates this file and was correctly left untouched), added as two new `risks`/`tips` columns in `demo-data/drug-import-demo.csv`, same `"DrugName:text;DrugName:text"` shape as `interactsWith` — every other column/value in the file is unchanged, per the user's explicit "keep the dataset the same" instruction.
2. **Parsing** (`data-import/domain/importValidation.ts`): new `parseTextList` (same split-on-`;`-then-first-`:` shape as `parseRelationshipList`, but validating "name and text present" rather than a severity enum); `validateDrugRow` now merges matching `risks`/`tips` entries onto each row's already-parsed `interactsWith` entries, by drug name.
3. **Schema** (`INTERACTS_WITH`, extending the base schema from `docs/05-system-architecture.md` §3 — documented in `docs/v2-conversational-assistant/05-system-architecture.md` per this session's "changed docs go in the new folder" convention): two new optional edge properties, `riskDescription`/`tip`. `DrugInteraction`/`CreateInteractionRequest` (shared-types) extended to match; `createInteraction` (interactions module) and `processDrugImport`'s pass-2 loop thread them through.
4. **A real idempotency bug, found and fixed before it could corrupt data**: `Neo4jInteractionRepository.create` was a bare `CREATE`, never idempotent — re-importing this same CSV (needed to pick up the new columns for pairs that already existed from the original import) would have created a second, duplicate `INTERACTS_WITH` edge for every one of the 38 pairs, corrupting every future risk-check for this dataset. Fixed to an undirected `MERGE` on the drug pair (same precedent as `neo4jDrugImportRepository.ts`'s MERGE-by-name for drugs); `severity` always overwrites, `riskDescription`/`tip` use `coalesce` so a caller that omits them (e.g. the plain `POST /interactions` endpoint) never wipes out data a prior import attached to that pair. `findAmong`/`findById`/`findInvolving` also updated to actually return the new properties (previously they didn't select them at all).
5. **Wired into the live chat, not just stored**: `assistant/application/useCases.ts`'s `runTurn` now looks up the specific interaction's `riskDescription`/`tip` (via `interactions.findById`) alongside the existing grounded explanation, leading the tip list with the authored one and appending it to the explanation text before handing the whole grounded fact set to `composeAnswer` — still fully grounded (it's data stored on the edge itself), just more specific than the generic severity/type-keyed fallback in `safetyTips.ts`.

**Automated tests:** API 155/155 passing (8 new: 3 `validateDrugRow` risk/tip-merging cases + 4 `parseTextList` domain cases + 1 `runTurn` case proving the specific authored risk/tip actually leads the grounded fact set handed to the LLM). `pnpm typecheck` clean on both workspaces.

**Live verification performed (real backend, real Neo4j, real OpenAI):**
- Edge count before and after re-upload: **78 (undirected) / 39 (directed) both times** — confirmed via direct `cypher-shell` query — proving the MERGE fix actually prevented duplication, not just in theory.
- `MATCH (a:Drug)-[r:INTERACTS_WITH]->(b:Drug) RETURN count(r), count(r.riskDescription)` → **39, 38** — every pair from the CSV now carries the authored text; the one pre-existing pair outside the CSV's scope correctly wasn't touched.
- Uploaded via the real `POST /admin/import` endpoint (multipart, exactly the pipeline `DrugImportModal` used to call) — job reached `status: "complete"`, `acceptedCount: 38`, `rejectedCount: 0`.
- A live chat turn for the user's own example query (aspirin + warfarin) now composes an answer that visibly incorporates the specific authored content — "increases the likelihood of serious bleeding, including bruising, nosebleeds, or even internal bleeding" and "keep a close eye out for any unusual bruising... adjusting your dosage or considering alternative pain relievers" — and the `tips` array in the response leads with the exact authored tip string before the generic fallback tips.

**Done when:** the CSV carries authored risk/tip text for every interaction pair, unchanged otherwise; re-uploading it into the real backend updates existing data without duplicating a single edge (verified by exact edge-count comparison, not assumed); and a live chat answer visibly surfaces the specific authored content, not just the generic template — confirmed live end-to-end.

---

### Version 2.0.3.2 — Symptom-Report Clarification Flow (bugfix/addendum) — **Done** (2026-08-21)

**Bug report from live user testing (REQ-035, new):** asking "I am facing nose bleeding." returned "I couldn't find nose bleeding in our records — could you check the spelling or try a different name?" — the extraction step was classifying a reported symptom as a `condition` and trying to resolve it against the Disease catalog (which only holds diagnosed conditions like "Chronic Kidney Disease", never symptoms), then falling into the existing "unresolved name" message. **Expected**, per the user: report a symptom → assistant asks whether they're taking any medications → if yes, check those medications for risks; if no, give generic guidance instead of a "not found" error.

**Root cause, not just the symptom:** the extraction step also had no memory of the conversation — `LlmPort.extractEntities` only ever received the current message, so even a correct "are you taking anything?" → "no" exchange couldn't be told apart from a fresh, unrelated message. Fixing the symptom-vs-condition classification alone wouldn't have been enough without also threading conversation history through.

**Tasks as built:**
1. `ExtractedEntities` (assistant `ports.ts`) gained two fields: `symptoms: string[]` (a reported complaint, explicitly never resolved against a catalog) and `deniesMedications: boolean` (true when the user is answering "no" to a medications question). `LlmPort.extractEntities` gained an optional `history: ConversationTurn[]` parameter.
2. New `assistant/domain/symptomGuidance.ts` — `buildClarifyingQuestion`/`buildGenericSymptomTemplate`, both deterministic (not LLM-composed — a safety-relevant clarifying question and a non-diagnostic disclaimer shouldn't vary turn to turn, same reasoning as `safetyTips.ts`).
3. `runTurn` (assistant `useCases.ts`) gained a new branch, checked before the existing "nothing resolved" fallback: if symptoms were reported and no medication is known (neither this turn nor already on the session's profile) — ask the clarifying question (`deniesMedications` false) or give the generic template (`deniesMedications` true), in both cases skipping `checkRisks`/`composeAnswer` entirely. If medications *are* known, the normal risk-check flow runs unchanged, with `symptoms` now passed into `composeAnswer` so the answer explicitly ties the found risks (or their absence) back to the reported symptom — still fully grounded, since it only reasons over what `checkRisks` actually returned.
4. `chat-sessions`' `postMessage` now fetches the session's prior messages (capped at the last 10) *before* appending the new one, and passes them through `TurnAnswerer.answer` → `runTurn` → `extractEntities`. `OpenAiLlmAdapter.extractEntities` includes them as real prior `user`/`assistant` turns in the OpenAI request (not just flattened text) so the model has actual conversational context, not just the latest message in isolation.
5. Extraction/composition prompts updated to describe the symptom/condition distinction and the symptom-tie-in rule.

**Automated tests:** API 162/162 passing (7 new: 3 domain in `symptomGuidance.test.ts`, 4 application in `useCases.test.ts` covering all three branches — clarify, generic template, and real-risk-check-tied-to-symptom — plus that a genuinely unresolved name reported alongside a symptom still surfaces once medications are known). `pnpm typecheck` clean on both workspaces.

**Live verification performed (real OpenAI, real conversation, the user's own exact wording):**
- Turn 1, "I am facing nose bleeding." → correctly asked "Are you currently taking any medications, or do you have any known allergies or diagnosed conditions?" — no "not found" error, no risks, nothing sent to `checkRisks`.
- Session A, turn 2 "Yes, I take aspirin and warfarin." → real risk-check found the real severe interaction; composed answer explicitly connected it to the symptom: "...increasing the risk of serious bleeding, including nosebleeds."
- Session B, turn 2 "No, I am not taking any medications." → the exact deterministic generic template, correctly recognizing the negative answer via conversation history (not just the bare word "No").
- Browser (Playwright): full two-turn flow (symptom → confirm medications → grounded, symptom-aware answer) rendered correctly, zero console errors.

**Done when:** the user's exact reported scenario produces a clarifying question instead of a "not found" error; confirming medications afterward produces a real, grounded risk-check answer that ties back to the symptom; denying medications produces generic, non-diagnostic guidance — all three confirmed live with real OpenAI calls, not simulated.

---

### Version 2.0.3.3 — Unified Intake Gate: Gather Before Concluding (bugfix/addendum) — **Done** (2026-08-22)

**Bug report from live user testing (REQ-035, generalized):** V2.0.3.2's fix only gated a *symptom* report with no medications known. A direct medication question — "I am taking aspirin and warfarin, am I exposed to any risks?" — still concluded immediately on whatever was named, never asking about allergies or conditions first. **Expected**, per the user: for *any* substantive query (medication-named or symptom-reported), gather all three categories — medications, allergies, conditions — via clarifying questions, and only draw a conclusion once everything has been gathered.

**Design change:** replaced V2.0.3.2's symptom-only, denial-detecting branch with a single, general intake gate that fires on the first substantive turn of a session regardless of what triggered it, and never fires again. This needed genuine session state — `medicationIds.length > 0` alone can't tell "nothing gathered yet" apart from "gathered, and it turns out there's nothing" — so `ChatSession` gained a persisted `intakeComplete: boolean` (§3), owned by SD-010 and passed *read-only* into SD-009's `runTurn` each call; SD-009 signals back via `TurnResult.intakeJustCompleted` when it just asked, and SD-010 persists it. This also let the now-unnecessary `deniesMedications` extraction field be removed entirely — the gate no longer needs to detect a denial, it simply asks once, then always concludes on whatever's on record afterward.

**Tasks as built:**
1. `assistant/domain/symptomGuidance.ts` renamed/expanded to `intakeGuidance.ts`: `buildIntakeQuestion(known, symptoms)` — one consolidated, deterministic question naming only the categories still missing (never re-asks about something already named this turn), leading with the symptom if one was reported; `buildGenericSymptomTemplate` kept, now the terminal response once intake is complete but nothing is on record.
2. `runTurn` (assistant `useCases.ts`): the old symptom-only branch replaced with a single `if (!input.intakeComplete)` gate ahead of everything else — fires whenever the turn said anything substantive (a resolved entity or a symptom), returns the intake question with `intakeJustCompleted: true`, and does not call `checkRisks`/`composeAnswer`. A turn with nothing substantive at all doesn't spend the one-time question. Every turn once `intakeComplete` is true (including the very next one) runs the full grounded risk-check unchanged.
3. `ChatSessionRecord`/`ChatSessionRepository` (chat-sessions `ports.ts`) gained `intakeComplete`/`setIntakeComplete`; `Neo4jChatSessionRepository` persists and reads it (defaulting `false` for any session created before this property existed — a harmless one-extra-question effect on old sessions, never a crash); `createSession` initializes it false. `postMessage` now fetches the owning session first (already did, for ownership), passes `session.intakeComplete` into `turnAnswerer.answer`, and calls `setIntakeComplete` when the turn signals it just asked.
4. `TurnAnswerer`/`AssistantTurnAnswerer` (the port/adapter pair between the two modules) threaded `intakeComplete` through — `assistant` still has no knowledge of `chat-sessions` at all, the dependency still points one way.
5. `ExtractedEntities`/extraction schema/prompt: removed `deniesMedications` (no longer needed); prompt updated to describe using conversation history to interpret short replies ("none", "just aspirin") in context.

**Automated tests:** API 165/165 passing (rewrote the `assistant/application/useCases.test.ts` symptom-flow suite into two describe blocks — "conclusion behavior" tests now explicitly pass `intakeComplete: true` to bypass the gate and exercise the risk-check path in isolation, matching the same "test one concern at a time" discipline as everywhere else in this codebase; new "intake gate" tests prove a direct medication-naming message no longer concludes on partial information, a bare symptom report asks about all three categories, a message with nothing substantive doesn't burn the one-time question, and the turn after intake completes concludes for real, tying back to a symptom when one was reported). `pnpm typecheck` clean on both workspaces.

**Live verification performed (real OpenAI, the user's own exact wording):**
- "I am taking aspirin and warfarin, am i exposed to any risks?" → *"Before I check for any risks, could you tell me about known allergies and diagnosed conditions?"* — correctly skipped re-asking about medications (already named), no `checkRisks` call.
- → "No allergies, but I have chronic kidney disease." → real, grounded conclusion: the actual severe Aspirin/Warfarin interaction, explanation and tips intact; correctly did *not* fabricate a Chronic-Kidney-Disease contraindication for either drug, since none exists in the real graph data for that pair — grounding held under the new flow, not just the old one.
- Symptom path re-verified under the new unified gate: "I am facing nose bleeding." → one consolidated question naming all three categories → "I take aspirin and warfarin, no allergies or conditions." → grounded conclusion explicitly tying the found interaction to the reported nosebleeds.
- Browser (Playwright): full two-turn medication-question flow rendered correctly end-to-end, zero console errors.

**Done when:** neither a direct medication question nor a symptom report concludes on partial information — both first gather whichever of medications/allergies/conditions aren't yet known, exactly once per session, before any risk-check runs — confirmed live with real OpenAI calls on the user's own reported scenario.

---

### Version 2.0.3.4 — Intake Retry: Re-ask for Partially-Answered Categories (bugfix/addendum) — **Done** (2026-08-22)

**Bug report from live user testing (REQ-035, generalized again):** V2.0.3.3 asked the intake question exactly once, then marked intake complete regardless of whether the reply actually answered everything asked. Reported scenario: "i am taking asparin and warfarin" → correctly asked about allergies and conditions → "no allergies" → **incorrectly concluded immediately**, never confirming conditions, which the user had been asked about but never addressed. **Expected**, per the user: re-ask for whatever's still genuinely unanswered, at least twice, before concluding.

**Root cause:** `medicationIds.length > 0` (etc.) can't distinguish "the user confirmed there's none" from "the user just didn't mention it" — V2.0.3.3 marked `intakeComplete = true` unconditionally on the turn it asked, so the very next reply — whatever it contained — was already treated as final.

**Tasks as built:**
1. `ExtractedEntities` gained `confirmedNone: ("medications"|"allergies"|"conditions")[]` — which categories the user explicitly stated are empty (e.g. "no allergies"), distinct from a category simply not being mentioned. Extraction prompt updated with an explicit worked example: if the assistant asked about two categories and the reply only addresses one, `confirmedNone` must contain only that one.
2. `runTurn`: a category now counts "answered" only via a known entry OR `confirmedNone` — never from silence. If anything is still unanswered after the turn's merge, and `ChatSession.intakeAskCount < MAX_INTAKE_ASKS` (2), SD-009 re-asks — naming only the categories still missing, via `buildIntakeQuestion(..., isFollowUp: true)` — rather than concluding. Once everything is answered, or the retry cap is hit, intake is marked complete and the turn falls through to the real risk-check in the same call (no wasted round-trip).
3. `ChatSession` gained `intakeAskCount: number` (§3) alongside `intakeComplete`; `ChatSessionRepository` gained `setIntakeAskCount`; `postMessage` persists whichever of `intakeAskCount`/`intakeComplete` the turn signals.
4. `buildIntakeQuestion` gained an `isFollowUp` parameter with distinct phrasing ("Just to make sure I have the full picture before checking...") — the first version of this fix stacked the follow-up intro onto the original template and produced an awkward doubled "before I check" sentence; live testing caught it, fixed by giving the follow-up its own template branch instead of prepending to the original.

**Automated tests:** API 168/168 passing (5 new: 1 domain in `intakeGuidance.test.ts` for the follow-up wording, 4 application in `useCases.test.ts` — the exact reported bug (a reply answering only part of what was asked triggers a targeted re-ask, not a conclusion), the retry-cap give-up path, immediate completion when the first reply already covers everything, and that a fully-answered turn still ties back to a reported symptom). `pnpm typecheck` clean on both workspaces.

**Live verification performed (real OpenAI, the user's own exact wording, full three-turn conversation):**
- "i am taking asparin and warfarin" → *"Before I check for any risks, could you tell me about known allergies and diagnosed conditions?"*
- "no allergies" → *"Just to make sure I have the full picture before checking, could you also tell me about diagnosed conditions?"* — correctly did NOT conclude, correctly did not re-ask about allergies (already answered), correctly did not re-ask about medications (already known).
- "no conditions either" → now concludes for real: the actual severe Aspirin/Warfarin interaction, grounded explanation and tips intact.
- Browser (Playwright): full three-turn flow rendered correctly end-to-end, zero console errors, exact message count at each step.

**Done when:** a reply that only partially answers the intake question triggers a targeted re-ask naming just what's still missing — not an immediate conclusion, and not a redundant re-ask of what was already answered — confirmed live against the user's own exact reported conversation.

---

### Version 2.0.3.5 — Denial Detection Redesign: Independent Per-Category Booleans (bugfix/addendum) — **Done** (2026-08-22)

**Bug report from live user testing (REQ-035, same underlying gap, different trigger):** "i am taking asparin and warfarin" → correctly asked about allergies and conditions → "i have pennicilin allergy" → **still concluded immediately**, never confirming conditions. This looked like the same V2.0.3.4 bug but wasn't: the reply here *positively* named a real allergy rather than denying one, and conditions was left completely unmentioned.

**Root cause — a genuine LLM-reliability finding, not a code bug.** `runTurn`'s gate logic was already correct given accurate input: `answeredConditions = conditionIds.length > 0 || confirmedNone.includes("conditions")`. The actual defect was upstream — a standalone diagnostic script calling `OpenAiLlmAdapter.extractEntities` directly against the real OpenAI API (isolating the extraction step before touching any other code, to avoid guessing) proved `gpt-4o-mini` was returning `confirmedNone: ["conditions"]` for "i have pennicilin allergy" — a message that never mentions conditions at all. Tightening `EXTRACTION_SYSTEM_PROMPT` with explicit counter-examples ("a positive answer to one category is not evidence another is empty") did **not** fix it — re-tested against the live API and the model still fabricated the same wrong denial. The model appeared to be reasoning "the user replied to my question, so the question is answered" holistically across the one combined array field, rather than checking each category's own negation independently.

**Fix:** restructured `confirmedNone: string[]` into three independent fields — `medicationsDenied`/`allergiesDenied`/`conditionsDenied` — each its own required boolean the model must judge separately, rather than one list it fills holistically. Verified directly via the same standalone diagnostic script across a spread of phrasings (a positive-only allergy answer, a bare "no allergies", a bare "none", a mixed "no allergies but I have diabetes", a bare "nope") before touching the real integration — every case now correctly isolates each category's judgment. Only after confirming this live was the change wired into `ExtractedEntities`, the OpenAI schema/prompt, and `runTurn`'s answered-category computation.

**Automated tests:** API 169/169 passing (1 new — the exact reported scenario: a positive allergy answer must not mark conditions denied, still triggering a targeted re-ask). `pnpm typecheck` clean on both workspaces.

**Live verification performed (real OpenAI, the user's own exact wording, full three-turn conversation, plus direct Neo4j state inspection):**
- Turn 1: "i am taking asparin and warfarin" → asks about allergies and conditions, `intakeAskCount` persisted as 1 (confirmed via direct `cypher-shell` query against the live session node, not just the response text).
- Turn 2: "i have pennicilin allergy" → correctly does **not** conclude; correctly re-asks only about conditions (not allergies, now genuinely answered); `intakeComplete` confirmed still `FALSE`, `intakeAskCount` confirmed `2` — directly queried in Neo4j, not inferred from the chat response alone.
- Turn 3: "no conditions" → concludes for real: the actual severe Aspirin/Warfarin interaction.
- Browser (Playwright): full three-turn flow rendered correctly, zero console errors.

**A note for future work in this module:** a single combined-judgment field an LLM fills holistically (one array covering several independent yes/no questions) is a real failure mode on `gpt-4o-mini`, independent of prompt quality — confirmed by testing, not assumed. Prefer one independent field per judgment whenever the categories must not influence each other; see the System Architecture doc's Intake-gate addendum for the fuller writeup.

**Done when:** a message that positively answers one intake category while leaving another unaddressed triggers a targeted re-ask for the unaddressed category — not an immediate conclusion — confirmed live against the user's own exact reported conversation, with session state verified directly in the database, not just inferred from the chat UI.

---

### Version 2.0.3.6 — Conversation Memory + General Chat (feature addendum) — **Done** (2026-08-22)

Built at the user's explicit request: (1) the assistant should remember what was said earlier in the *same* session and use it for later turns; (2) it should handle general chat (greetings, general health/pharma questions) instead of the canned "didn't catch anything" fallback — "just do not let it give any random solutions or conclusions without solid grounds." Planned as a single vertical slice via `EnterPlanMode`, confirmed with the user before implementation, per the user's own request to see a short plan first.

**Key finding during planning:** the session-history plumbing this needed was **already fully built** — `chat-sessions/application/useCases.ts`'s `postMessage` already fetches the last `HISTORY_TURNS_FOR_CONTEXT` (10) messages and threads them through `TurnAnswerer.answer` → `runTurn` → `extractEntities` (since V2.0.3.2, for interpreting short replies in context). `composeAnswer` — the call that generates the reply text the user actually reads — never received it. This made the slice small and contained: two files, no new persistence, no schema change, no frontend change.

**Tasks as built:**
1. **Memory**: `ComposeAnswerInput` (`assistant/application/ports.ts`) gained `history?: ConversationTurn[]`; `runTurn` passes `input.history` through (one line); `OpenAiLlmAdapter.composeAnswer` prepends `toOpenAiHistory(input.history)` before the facts-payload message — the exact same helper `extractEntities` already used, same shape. `COMPOSE_SYSTEM_PROMPT` gained one explicit rule: prior turns (including the assistant's own earlier prose) are for tone/continuity only, never a new fact source — every risk/interaction claim still comes only from the current turn's `groundedRisks`. This is what keeps REQ-011/029's grounding guarantee true with history now in the prompt.
2. **General chat**: new `LlmPort.composeGeneralAnswer(userMessage, history)`, implemented with a new `GENERAL_CHAT_SYSTEM_PROMPT` — friendly persona, answers greetings and general (non-personalized) health/pharmacology knowledge, but explicitly forbidden from asserting a conclusion about the user's own risk (redirects to naming specific medications/allergies/conditions instead of guessing), same "no clinical diagnosis, suggest a professional" rule already used elsewhere.
3. `runTurn` gained a small `answerGenerally` helper (same try/catch-to-static-fallback shape as `composeAnswer`'s own NFR-007 handling) wired into the **final `else` arm only** of the two existing "nothing substantive" fallback branches — the unresolved-name message, the symptom template, the intake gate's own re-ask logic, and the risk-conclusion path are all byte-for-byte unchanged, confirmed by the fact that no other file needed to change at all.

**Automated tests:** API 174/174 passing (5 new: `composeAnswer` receiving history on a normal risk-concluding turn; a greeting/general message routing to `composeGeneralAnswer` with history attached; `composeGeneralAnswer` failure falling back to the static message; a genuinely unresolved name still taking priority over general chat on the very first turn; general chat still firing post-intake when nothing was ever found). One pre-existing test's assertion was updated to reflect the new, correct behavior (a bare "hello" now gets a real reply instead of the old canned string). `pnpm typecheck` clean on both workspaces.

**Live verification performed (real OpenAI, real dev server):**
- "Hi" as the literal first message of a new session → warm, real greeting; confirmed directly in Neo4j that `intakeAskCount` stayed `0` and `intakeComplete` stayed `false` — the one-time intake question was not spent on it.
- "What is a blood thinner?" → accurate general/educational answer (anticoagulants vs. antiplatelet agents, with real drug examples), correctly making no claim about the user's own risk.
- Memory: named aspirin + warfarin, completed intake, got the real grounded severe-interaction conclusion, then asked "can you explain that in simpler terms?" with no entities re-named — the reply correctly restated the same real interaction in genuinely simpler language ("thin your blood", "bleeding too much") rather than starting cold or repeating the identical technical phrasing, proving `composeAnswer` is actually using the conversation history.
- Regression: the full name-medications → intake-question → "no allergies or conditions" → conclusion flow re-verified unaffected.
- Browser (Playwright): greeting → general-question flow rendered correctly, one session in the sidebar (no duplication), zero console errors.

**Done when:** a greeting or general health/pharma question gets a real conversational answer instead of the canned fallback, without ever asserting a personalized risk conclusion or spending the intake question; a follow-up turn with no new entities coherently references what was already discussed; the full existing risk-check/intake-gate flow is provably unaffected — confirmed live with real OpenAI calls, not simulated.

---

### Version 2.0.6 — Remove Legacy UI — **Done** (2026-08-23)

Built at the user's explicit request, per this version's original scope note above: "delete the superseded components, rewrite `App.tsx`." A **removal/refactor task, not a new-feature one** — no new domain rule, repository, or API endpoint applies. `docs/v2-conversational-assistant/03-ux-product-design.md`'s "Removed" list plus its unambiguous "there is exactly one top-level entry point now: SCR-010 (Chat Page) — everything else is contextual" line, and `05-system-architecture.md`'s confirmation that the superseded routes "stay mounted but are no longer reachable from any screen," meant the work begins and ends at the UI layer; the user's 5-layer template's steps 1–4 (domain/use-case/repository/endpoint) don't apply here.

**Scope decision — the "Drugs" tab too.** Neither the v1 nor v2 UX doc gave the Drugs catalog CRUD screen (`DrugList`/`DrugForm`) its own SCR number, and the v2 "Removed" list didn't name it explicitly — but the stronger "exactly one entry point" statement takes precedence over that silence, corroborated by the architecture doc listing `GET /drugs` as used only *internally* (the quick-check popup's typeahead) going forward, never direct UI CRUD. `DrugImportModal.tsx` (embedded in the Drugs tab) was also confirmed, by direct source comparison, to be a near-duplicate of `DataImportView.tsx` (the Admin tab) — the same bulk-CSV-import feature built twice; both removed together.

**Tasks as built:**
1. Rewrote `apps/web/src/App.tsx`: dropped the 6-tab nav (`chat`/`drugs`/`patients`/`history`/`deleted`/`admin`) and all drug-management state, leaving the auth gate, a minimal sidebar (brand + user info + logout), and `ChatPage` as the sole content.
2. Deleted 15 superseded files: `PatientsView`, `PatientList`, `PatientForm`, `AddMedicationRecheck`, `RiskDashboard`, `RiskDetailPanel`, `ReferencePicker`, `QueryLogView`, `QueryLogDetail`, `DeletedView`, `DataImportView`, `DrugImportModal`, `DrugList`, `DrugForm`, `Modal` — deletion safety confirmed beforehand via a full dependency-map pass (every importer of every candidate checked; no test file references any of them).
3. Trimmed `apps/web/src/api.ts`: removed 19 now-dead exports (`listDrugs`, `createDrug`, `updateDrug`, `deleteDrug`, `listDeletedDrugs`, `listAllergens`, `createAllergen`, `listDiseases`, `createDisease`, `listPatients`, `getPatient`, `createPatient`, `updatePatient`, `deletePatient`, `listDeletedPatients`, `createInteraction`, `checkRisks`, `checkIncrementalRisks`, `listQueryLog`, `getQueryLogEntry`, `startDrugImport`, `getImportJob`) and their now-unused type imports.
4. Trimmed `apps/web/src/components/icons.tsx`: removed `IconPatients`, `IconPill`, `IconHistory`, `IconImport` — each confirmed to have zero remaining call sites after step 1.
5. **Kept, deliberately, despite zero current callers:** `GraphView.tsx` + `apps/web/src/graph/*` (SCR-014 — documented future reuse from a chat risk card's "View graph" button, not yet wired up) and the `export/` module (REQ-020 — documented future reuse from a chat answer's risk cards). Also kept: `SeverityBadge.tsx`/`RiskTypeLabel.tsx`/`risk/severityOrder.ts` (actively used by the chat UI right now), and `api.ts`'s `getRiskDetail` (the one call `graph/apiRiskDetailFetcher.ts` still makes). Pre-existing, unrelated dead code noticed but explicitly left alone (out of scope): `api.ts`'s `createInteraction` (already had zero callers before this change), `icons.tsx`'s `IconShield`/`IconCheck`.
6. **Zero backend changes** — confirmed via the architecture doc that every route the removed screens called stays mounted, authenticated, and harmless; nothing in `apps/api` was touched.
7. `apps/web/src/styles.css` audit (per this file's own "re-run that grep periodically" gotcha): removed 16 selector rules that became orphaned by this deletion specifically (`.app-content-narrow`, `.app-nav`, `.badge-new`, `.btn-danger`, `.btn-ghost-danger`, `.card-grid`, `.card-interactive`, `.card-meta`, `.card-row`, `.chip`, `.empty-state`, `.modal-close`, `.modal-dialog`, `.modal-overlay`, `.node-chip`, `.stack`) — verified via a dependency-map pass that zero remaining `.tsx` file references any of them (including `GraphView.tsx`, which does still use `.page-header`/`.page-actions`/`.card-sunken`, correctly left alone). CSS bundle shrank from 22.08 kB to 19.38 kB. Left alone as pre-existing, unrelated dead CSS (never referenced even by the deleted files, so out of this task's scope): `.field-error`, `.field-hint`, `.gap-1`, `.gap-3`, `.input-error`, `.skeleton`, `.mono`, `.text-xs`.

**Automated tests:** API 269/269 passing, web 45/45 passing (both counts unchanged from before this change — a pure UI removal has no new business logic to test, and no existing test referenced a deleted file). `pnpm typecheck` clean on both workspaces. `vite build` clean (`dist/assets/index-*.js` 278 kB / 88 kB gzipped).

**Live verification performed** (real dev server, real Neo4j, real headless-Chromium browser, logged in as `v21tester`):
- Sidebar renders with exactly one nav control (`Log out`) — confirmed via `.app-nav-link` count (`1`) and the full sidebar text, no Patients/Drugs/History/Deleted/Admin tabs anywhere.
- Sent a real chat message ("Hi there, who are you?") and received a full real assistant reply end-to-end — proves the removal caused no regression in the one remaining feature.
- Reloaded the page: nav link count stayed `1` and the same assistant reply was still present, byte-for-byte — confirms the reduced UI and the conversation both persist across a refresh (not just an in-memory artifact of the same session).
- Zero browser console errors throughout.

**Open gap, flagged honestly, not newly caused by this change:** REQ-030 (Cypher view, V2.0.4) and REQ-031 (Quick-check popup, V2.0.5) remain unbuilt "Must" requirements — both versions are still "Not Started" in the Status Overview. This is a **pre-existing gap independent of legacy-UI removal**: the old Patients/RiskDashboard screens never satisfied these new, chat-specific requirements either, so removing them doesn't newly break anything, but the gap itself is real and should be closed before V2.0 is considered fully done.

**Technology Decision Log:** not applicable — no new external dependency was introduced; this is a net code-reduction (15 files and 19 API functions removed, zero added).

**Done when:** the app shows only the Chat screen after login, with no dead nav or unreachable tabs; the chat feature itself is provably unaffected (a real message sent and received, surviving a reload); automated tests and typecheck stay green at their pre-change counts; the backend is confirmed untouched — all verified live above.

---

### Version 2.1 — Chatbot Safety & Trust Improvements (feature addendum) — **Done** (2026-08-22)

Built at the user's explicit request: every item from `improvements.md`'s Version 2.1 roadmap (Section 1, "Domain-Critical — Drug Safety & Trust") except **2.1.6** (demo-catalog-scope disclosure) and **2.1.8** ("currently tracking" profile panel), which were explicitly excluded from this pass. Built as one vertical slice across all five layers per the user's template (domain rule → use case/repository interface → real repository → API endpoint → UI), with automated tests plus a real live check (real OpenAI, real Neo4j, real browser) before being marked done.

**Tasks as built, by item:**

1. **V2.1.1 — Emergency-symptom escalation.** New pure domain rule `assistant/domain/emergencyDetection.ts` — `detectEmergency` (11 regex-pattern categories: breathing difficulty, chest pain, allergic reaction, overdose, self-harm risk, etc.) and `buildEmergencyResponse` (fixed, deterministic text naming 911/999/112). Wired into `runTurn` as the very first check, before entity extraction or the intake gate — a true short-circuit with zero LLM dependency, since a safety-critical escalation must never depend on a model call succeeding or judging correctly. `TurnResult`/`ChatMessage` gained `isEmergency`/`emergencyCategory`, persisted as plain fields (no `JSON.stringify`) on the `ChatMessage` node. `MessageBubble.tsx` renders a distinct, unmissable red-bordered treatment (`EmergencyBubble`) instead of the normal message shape.
2. **V2.1.2 — Persistent medical disclaimer.** A static banner (`.chat-disclaimer` in `ChatPage.tsx`) pinned above the transcript on every chat screen — never LLM-generated, so it can't be phrased away or dropped under prompt drift.
3. **V2.1.0 — Severity rendering in chat.** `MessageBubble.tsx`'s new `RiskSummary` renders the `risks[]` array (already computed and sent since V2.0.2, previously discarded) as `SeverityBadge`/`RiskTypeLabel` chips, sorted by severity via the existing `sortBySeverityDesc` (REQ-015) — reusing the pre-chat dashboard's own components rather than inventing new ones.
4. **V2.1.3 — Grounded vs. general answer tag.** `runTurn`'s `TurnResult` gained `answerSource?: "grounded" | "general"` — `"grounded"` set on every return from the real `checkRisks`/`getRiskDetail` pipeline (even a zero-risk conclusion — a real check still ran), `"general"` set on every `answerGenerally` call site; omitted for turns that are neither a conclusion nor general chat (an intake or clarification question, an unresolved-name notice, an extraction failure). Persisted on `ChatMessage`; `MessageBubble.tsx` renders it as a small "✓ Checked against your data" / "ℹ General information" tag, making REQ-037's existing prompt-level boundary visible in the UI too.
5. **V2.1.4 / V2.1.5 — Fuzzy-match confirmation and disambiguation.** `entityResolution.ts`'s `resolveEntityName` was redesigned so **only an exact case-insensitive match resolves silently** — anything reached via the fuzzy fallback now returns `needsConfirmation` (one close candidate) or `ambiguous` (several candidates within `AMBIGUITY_CLUSTER_DELTA` of each other), never a silent best-guess. A new `PendingClarification` domain type (`assistant/domain/clarificationGuidance.ts`) plus deterministic `interpretYesNo`/`pickDisambiguationChoice` (never an LLM judgment call, same reasoning as `detectEmergency`) resolve the *next* turn's reply against the pending item — single-shot: an unclear or declining reply drops the item with a note rather than looping indefinitely. Persisted as `ChatSessionRecord.pendingClarifications` (JSON on the `ChatSession` node); a clarification question takes priority over the intake gate, since knowing *which* drug was meant must happen before concluding anything about it.
6. **V2.1.7 — Session profile correction (removal).** `ExtractedEntities` gained `medicationsRemoved`/`allergiesRemoved`/`conditionsRemoved` (new extraction schema/prompt fields, distinct from "denied" — a denial means "never had it", a removal means "had it, no longer do"). Removed names go through the *same* confirm/disambiguate gate as an addition before being subtracted from the accumulated profile via the existing `updatePatient` (no repository changes needed — it already accepts a full replacement array). Conversational only, per the user's exclusion of the "currently tracking" panel (V2.1.8) — "I stopped taking X" is enough.
7. **V2.1.9 / V2.1.10 — One-time limitation disclosures.** Two more deterministic pattern detectors (`assistant/domain/limitationNotices.ts`): `detectMultiPersonMention` (a caregiver phrasing like "my daughter takes X") and `detectDosageMention` (an explicit dose or frequency). Each fires at most once per session — `ChatSessionRecord` gained `multiPersonNoticeShown`/`dosageNoticeShown` booleans — and prefixes a fixed disclosure sentence onto whatever the turn was already going to say, rather than replacing it.

**Cross-cutting plumbing:** `TurnResult`/`TurnAnswerer`/`ChatSessionRecord`/`ChatSessionRepository` all extended to carry `pendingClarifications`/`multiPersonNoticeShown`/`dosageNoticeShown` end-to-end (assistant → chat-sessions → Neo4j); `runTurn`'s three new cross-turn fields are optional with safe defaults so a direct test call only needs to name the state it actually exercises. No new external dependency was introduced — every new behavior is either pure regex/deterministic logic or reuses the existing OpenAI/Neo4j infrastructure — so no Technology Decision Log entry was needed for this version.

**Automated tests:** API 230/230 passing (up from 174) — 61 new: 43 new domain tests (`emergencyDetection` x10, `entityResolution` rewritten to 14, `clarificationGuidance` x4, `limitationNotices` x8, plus the pre-existing 7 unchanged), 19 new `assistant/application/useCases.test.ts` tests (emergency escalation x4, answer-source x4, fuzzy confirmation x3, disambiguation x2, removal x2, one-time notices x4), and a brand-new `chat-sessions/application/useCases.test.ts` (7 tests — this file had no coverage before this version) proving the cross-turn state passthrough end-to-end against a hand-written fake repository. Web: 27/27 unchanged (no new component tests — this repo has none yet for any component, a pre-existing gap noted in `CLAUDE.md`, not introduced here). `pnpm typecheck` clean on both workspaces.

**Live verification performed (real OpenAI, real dev server, real Neo4j via `cypher-shell`, real headless-Chromium browser):**
- Emergency: "I can't breathe" → the fixed escalation text, `isEmergency: true`/`emergencyCategory: "breathing difficulty"` on the response *and* confirmed present on a fresh `GET /chat-sessions/:id` refetch (simulating a page refresh).
- Fuzzy confirmation: "I take Aspirn" → "Did you mean 'Aspirin'...?"; replying "yes" → confirmed via direct Neo4j query that a real `TAKES` relationship to the real Aspirin node was created, and `pendingClarifications` was cleared back to `"[]"` on the session node.
- Dosage notice: "I take 500mg of it" → the disclosure prefixed once; a later dosage mention in the same session → correctly not repeated (`dosageNoticeShown` confirmed `TRUE` in Neo4j).
- Multi-person notice: "my daughter takes amoxicillin" → the disclosure fired correctly, `multiPersonNoticeShown` confirmed `FALSE→TRUE` in Neo4j.
- Removal: "Actually I stopped taking Aspirin" → confirmed via Neo4j that the `TAKES` relationship was gone and the profile was genuinely empty again.
- Browser (Playwright, real login, real screens): disclaimer banner, severity badges + risk-type label + "✓ Checked against your data" tag all rendered correctly on a real severe-interaction conclusion; zero console errors. **One real bug caught and fixed during this pass:** the emergency bubble's red styling was initially invisible — `.chat-message-assistant .chat-message-bubble` (two combined classes) outranked the single-class `.chat-message-emergency` selector on CSS specificity, silently overriding its background/color/border. Fixed by renaming the selector to `.chat-message-bubble.chat-message-emergency`; re-verified via both a screenshot and the element's real computed styles (`rgb(246, 222, 222)` background, `rgb(127, 29, 29)` text/border) before considering the item done.

**Done when:** every included item (V2.1.0–V2.1.5, V2.1.7, V2.1.9, V2.1.10) is live-verified end-to-end — persisted correctly, surviving a refetch, and visually correct in a real browser — with V2.1.6 and V2.1.8 explicitly deferred, not built, per the user's request.

---

### Version 2.1.11 — Follow-up Question Mislabeled as a Fresh Grounded Check (bugfix/addendum) — **Done** (2026-08-22)

**Bug report from live user testing, immediately after V2.1 shipped:** a real conversation — "I am taking aspirin and warfarin" → "none" → correct severe-interaction conclusion with severity badge — followed by "what is bruising" and "what is pain reliever", both purely definitional questions unrelated to the user's own risk. Both got the **same severity badge and "✓ Checked against your data" tag** as the original interaction, which is misleading: neither question asked anything about the user's own situation.

**Root cause:** pre-existing in `runTurn` since V2.0.2/V2.0.3, just invisible until V2.1.0/V2.1.3 started rendering `risks`/`answerSource`. Once the accumulated profile has any data (`medicationIds.length > 0`, etc.), the `if (medicationIds.length === 0 && allergyIds.length === 0 && conditionIds.length === 0)` branch that routes to general chat can never be true again for the rest of the session — **every** later message, regardless of content, fell through to the full `checkRisks`/`getRiskDetail` pipeline and got labeled `"grounded"`. The V2.0.3.6 live check for general chat only ever tested a bare greeting as the *first* message of a session (before any profile existed), so this exact scenario — a general question *after* a real conclusion — was never exercised.

**Fix:** `ExtractedEntities` gained a new independent boolean, `wantsRiskRecheck` — true only when the user explicitly asks about their own risk/status ("am I still at risk?", "check again"), false for a general/definitional question, following the same "small independent LLM-judged boolean" pattern established in V2.0.3.5 rather than inferring intent from topic-word overlap. `runTurn` now only re-runs the real grounded pipeline when there's an actual reason to: something changed this turn (`profileChanged`), a symptom was reported, this is the turn intake just completed (the first real conclusion), or `wantsRiskRecheck` is true. Otherwise it routes through the existing `answerGenerally` (with full conversation history, so it can still naturally reference the prior conclusion without re-asserting it as a fresh checked result) and correctly tags the answer `"general"`.

**Automated tests:** API 234/234 passing (4 new: a definitional follow-up after a real conclusion routes to general chat with no `risks`; an explicit "am I still at risk?" still triggers a real recheck; mentioning a genuinely new drug still triggers a real recheck with no explicit request needed; the turn that completes intake still runs the real check even without an explicit recheck request). `pnpm typecheck` clean on both workspaces.

**Live verification performed (real OpenAI, real dev server, the user's own exact reported conversation):**
- Reproduced the reported conversation turn-for-turn: "I am taking aspirin and warfarin" → "none" → real severe-interaction conclusion (`answerSource: "grounded"`, severity badge) → "what is bruising" → correct general answer, **no** `risks`/`tips`, `answerSource: "general"` → "what is pain reliever" → same, correctly general.
- "am I still at risk?" as a follow-up → correctly re-ran the real check and returned the grounded interaction again with its badge.
- Confirmed the full `grounded → general → general → grounded` sequence persisted correctly via a fresh `GET /chat-sessions/:id` refetch (simulated page refresh) — not just inferred from the live responses.
- Browser (Playwright): both general answers rendered with the "ℹ General information — not a personal check" tag and no severity badge; the recheck answer rendered with the severity badge and "✓ Checked against your data" tag; zero console errors.

**Done when:** a follow-up question unrelated to the user's own risk is answered as general chat, not re-labeled as a fresh grounded check — confirmed against the user's own exact reported conversation, live, with persisted state verified via a refetch.

---

### Version 2.2 — Chatbot Conversational Quality Improvements (feature addendum) — **Done** (2026-08-23)

Built at the user's explicit request: every item from `improvements.md`'s Version 2.2 roadmap (Section 2, "Conversational Quality") except **2.2.0** (streaming) and **2.2.7** (stop-generating control), explicitly deferred after a scoping question — both change the `POST /chat-sessions/:id/messages` response from a single JSON reply to a chunked stream, a materially different risk/size category from the rest of this version's items, which are additive. Built as one vertical slice per item across the layers that actually apply, per the user's 5-layer template.

**Tasks as built, by item:**

1. **V2.2.1 — Typing indicator.** `ChatPage.tsx`'s new `TypingIndicator` renders a three-dot animated placeholder bubble in the transcript itself (not just the composer's Send-button spinner) while `sending` is true.
2. **V2.2.2 — Latency: parallelized catalog fetch + configurable extraction model.** `runTurn` now kicks off the drug/allergen/disease catalog reads concurrently with the `extractEntities` OpenAI call (they never depended on its result) instead of waiting for it to finish first. `config.ts` gained `openaiExtractionModel` (defaults to the same model as composition, override via `OPENAI_EXTRACTION_MODEL`) so a deployment can point the narrow classification task at a smaller/faster model than composition without a code change — no default behavior change until explicitly configured.
3. **V2.2.3 / V2.2.4 — Boilerplate reduction and adaptive length.** Both are `COMPOSE_SYSTEM_PROMPT`-only changes (no code): rule 6 now tells the model not to repeat the "consult a healthcare professional" safety reminder verbatim if it already gave it earlier in the visible conversation history for the same ongoing risk (still required the first time a risk is raised, or for a genuinely new risk); rule 7 replaced the flat "3-6 sentences" instruction with explicit length-to-content guidance (a single short sentence for "no risks found", 2-3 for one moderate/minor risk, the fuller range reserved for severe/multiple risks or a symptom tie-in).
4. **V2.2.5 — Markdown rendering.** Added `react-markdown` (new dependency — see Technology Decision Log) and switched `MessageBubble.tsx` from rendering `message.text` as a raw string to `<ReactMarkdown>{message.text}</ReactMarkdown>`. Chosen specifically because it parses markdown into React elements directly rather than an HTML string, so there's no `dangerouslySetInnerHTML`/sanitization surface to get wrong on LLM-produced text. `.chat-message-bubble`'s `white-space: pre-wrap` was removed (markdown now owns paragraph/line-break semantics via real `<p>` elements) and small margin resets were added so rendered markdown keeps the bubble's original tight spacing.
5. **V2.2.6 — Message regeneration.** New domain rule `findRegenerationTarget` (`chat-sessions/domain/chatSession.ts`) — regeneration only targets the session's most recent user/assistant pair, throwing `NothingToRegenerateError` otherwise. New `ChatSessionRepository.deleteMessage` (real Neo4j: `DETACH DELETE` on the message node) and application use case `regenerateLastMessage` — deletes the stale reply and re-answers the same original user message text with the history preceding it, sharing the exact same side-effect/persistence logic as `postMessage` (extracted into `applyTurnSideEffects`/`appendAssistantMessage` helpers so both stay in sync). New endpoint `POST /chat-sessions/:id/regenerate` (409 `NOTHING_TO_REGENERATE` if there's nothing to regenerate yet). UI: a "↻ Regenerate" control on the session's latest assistant message only (never on an emergency message), calling the real endpoint.
6. **V2.2.8 — Smart auto-scroll.** New pure domain rule `shouldAutoScroll` (`apps/web/src/chat/autoScroll.ts`) — near-bottom is defined as within 80px of the bottom. `ChatPage.tsx` tracks "was near bottom" in a ref updated on every scroll event (captured *before* new content changes the transcript's height, which a same-effect distance check can't do), and only auto-scrolls when that was true — except switching sessions or the user's own send, which always scroll (the sender is, by definition, at the composer).
7. **V2.2.9 — Persona + timestamps.** New pure domain rule `formatMessageTimestamp` (`apps/web/src/chat/formatTimestamp.ts`) — "Just now" / "Nm ago" / "Nh ago" / an absolute date once it's a different calendar day. `MessageBubble.tsx` gained a "🛡 Assistant" persona label above assistant replies and a timestamp in every message's footer.

**A real bug caught and fixed during this pass (not from a separate live report — caught by this feature's own verification):** regenerating the session's very first grounded conclusion silently downgraded it to a generic, non-personalized answer with no risk data. Root cause: `regenerateLastMessage` re-answers using the session's *current* cross-turn state, but by regenerate time `intakeComplete` is already `true` (the original turn already completed and persisted it) — which the V2.1.11 "was there a real reason to check" gate read as "nothing new, not the completing turn, no explicit recheck request" and rerouted to general chat. Fixed with a new `forceGroundedCheck` flag, set only by `regenerateLastMessage` when the stale message's own `answerSource` was `"grounded"` — bypasses the gate so a regenerate always lands in the same category of answer it started in. A second, smaller UI bug from the same live pass: the regenerate button read "Regenerating…" even when it was merely disabled because an unrelated new message send was in flight — split into separate `regenerating` (label) and `regenerateDisabled` (disabled-only) props on `MessageBubble`.

**Automated tests:** API 244/244 passing (up from 234 before this version — 10 new: `chatSession.test.ts` new file for `findRegenerationTarget`, 4 new `useCases.test.ts` tests for `regenerateLastMessage` including the `forceGroundedCheck` bugfix, 1 new `assistant/application/useCases.test.ts` test for `forceGroundedCheck`). Web 36/36 passing (up from 27 — 9 new: `autoScroll.test.ts`, `formatTimestamp.test.ts`). `pnpm typecheck` clean on both workspaces; `vite build` succeeds.

**Live verification performed (real OpenAI, real dev server, real Neo4j, real headless-Chromium browser):**
- Reproduced the full aspirin/warfarin intake → grounded conclusion flow unaffected by the catalog-fetch parallelization.
- Regenerate: confirmed via a fresh `GET /chat-sessions/:id` and a direct Neo4j message count that the stale reply was actually deleted and replaced (not duplicated) — 4 messages total, not 5. Confirmed the `forceGroundedCheck` fix live: before the fix, regenerating the grounded conclusion produced a `"general"`-tagged answer with no risk data; after the fix, the regenerated reply stayed `"grounded"` with the same real interaction and severity badge, just re-phrased.
- Browser (Playwright): markdown paragraphs render as real spacing (no literal `**`/`\n\n`); persona label and per-message timestamps visible on every bubble; severity badge + "✓ Checked against your data" tag still correct after a regenerate; typing-indicator dots bubble appears while a turn is in flight; regenerate button shows "Regenerating…" only while actually regenerating and "↻ Regenerate" (not falsely relabeled) while merely disabled by an unrelated send; zero console errors throughout.

**Done when:** every included item (V2.2.1–V2.2.6, V2.2.8, V2.2.9) is live-verified end-to-end — persisted correctly, surviving a refetch, and visually correct in a real browser — with V2.2.0 and V2.2.7 explicitly deferred, not built, per the user's decision.

---

### Version 2.2.0 / 2.2.7 — Streaming Responses + Stop-Generating Control (feature addendum) — **Done** (2026-08-23)

Built at the user's explicit follow-up request, after the two items were deferred from the main V2.2 pass over a real scoping concern: both change `POST /chat-sessions/:id/messages`'s response from a single JSON reply to a chunked stream — the app's core endpoint, and the one every existing consumer (tests, the frontend) was written against.

**Tasks as built:**

1. **Transport.** Both `/:id/messages` and the V2.2.6 `/:id/regenerate` endpoint now stream **NDJSON** (one JSON object per line) over the existing `POST` request/response instead of switching to Server-Sent Events — keeps auth as a normal `Authorization` header (native `EventSource` can't send custom headers) and needs no new endpoint. New shared type `ChatStreamEvent` (`packages/shared-types`): `user_message` (fires the instant the user's own message is persisted), `chunk` (a text delta), `done` (the final, fully-persisted assistant message — always the source of truth over whatever `chunk`s assembled), `error`.
2. **Streaming plumbing, LLM → HTTP.** `LlmPort`'s `ComposeAnswerInput`/`ComposeGeneralAnswerInput` gained optional `onChunk`/`signal` (a new shared `StreamControls` type) — `OpenAiLlmAdapter` uses the OpenAI SDK's `stream: true` + `for await` when `onChunk` is given, otherwise makes the original request unchanged (fully backward compatible — every existing test kept working with zero changes). `runTurn` threads the same `onChunk`/`signal` into `extractEntities` too, so a stop request halts the *whole* turn, not just the final compose call. `chat-sessions`' `postMessage`/`regenerateLastMessage` gained the same optional hooks (plus `onUserMessage` for `postMessage`), threaded through `TurnAnswerer.answer`. Every new field is optional with safe defaults, so no existing caller or test needed to change.
3. **Route handlers.** `res.on("close")` triggers an `AbortController` — passed through the whole call chain above — but only when `!res.writableEnded` (a completed response also fires `"close"`; naively wiring this up on **`req`** instead aborted every single turn immediately, since `express.json()` had already finished reading the request body before the handler even ran — a real bug caught in the very first live check, before it ever reached a browser). Headers/status are only committed on the first `res.write()`, so validation/ownership errors before any event is written still return the exact same JSON error response as before streaming existed.
4. **Frontend.** New pure domain rule `parseNdjsonChunk` (`apps/web/src/chat/ndjsonStream.ts`) — a network chunk boundary never lines up with a JSON-line boundary, so this carries a remainder buffer across reads; unit-tested against multi-chunk line-splitting scenarios. `api.ts`'s `postChatMessage`/`regenerateChatMessage` (single-JSON-response) were replaced with `postChatMessageStream`/`regenerateChatMessageStream`, reading `res.body`'s `ReadableStream` directly. `ChatPage.tsx`: a live `StreamingBubble` renders accumulating text in place of the typing indicator once the first chunk arrives (send), or in place of the stale reply being replaced (regenerate); `ChatComposer.tsx` gained a "■ Stop" control (visible only while a turn is in flight) wired to an `AbortController` ref that cancels the `fetch`.

**Two real bugs caught and fixed during this feature's own live verification (not from a separate report):**
- **Abort detection fired immediately, on every turn.** Wiring the `AbortController` off `req.on("close")` seemed reasonable (matches how "close" is usually described) but Express's `express.json()` middleware fully drains the request body before the route handler runs, so `req`'s readable side was already closed by the time the handler started — every real turn aborted before extraction even began. Fixed by moving the listener to `res.on("close")`, gated on `!res.writableEnded`, which only fires for a genuine premature disconnect.
- **A stopped generation could persist a truncated grounded claim instead of the safe fallback — a real safety issue, not just a UX one.** The design relied on the OpenAI SDK's streaming async iterator *throwing* when the request was aborted, the same way the non-streaming call path does, so an abort would flow into the existing NFR-007 fallback (the deterministic template) exactly like any other LLM failure. Live testing (deliberately clicking Stop mid-stream on a real severe-interaction answer, confirmed growing via a real browser screenshot first) showed the iterator can instead just stop yielding and end quietly — the code then treated that as a normal "successful" completion and returned whatever partial, mid-sentence text had streamed so far, complete with the severity badge and "✓ Checked against your data" tag on a **truncated claim**. Fixed by explicitly checking `controls.signal?.aborted` both inside the streaming loop and immediately after it ends, throwing regardless of how the SDK's own iterator behaved — re-verified live afterward: the same mid-stream Stop now persists the complete, correct deterministic template answer, never a cut-off sentence.

**Automated tests:** API 251/251 passing (up from 244 — 7 new: `runTurn` forwarding `onChunk`/`signal` to `composeAnswer`/`composeGeneralAnswer`/`extractEntities`, and falling back to the deterministic template when composition is aborted mid-stream; `postMessage`/`regenerateLastMessage` forwarding the same hooks, including a no-hooks-at-all case proving non-streaming callers are unaffected). Web 42/42 passing (up from 36 — 6 new: `ndjsonStream.test.ts`'s chunk-boundary parsing, including a line deliberately split across two reads). `pnpm typecheck` clean on both workspaces; `vite build` succeeds. No new external dependency — the existing `openai` package already supports `stream: true` and `signal`, so no Technology Decision Log entry applies.

**Live verification performed (real OpenAI, real dev server, real headless-Chromium browser):**
- `curl -sN` against the raw endpoint: confirmed real token-by-token `chunk` events (dozens of small deltas assembling into the final sentence) followed by a `done` event carrying the complete persisted message.
- Browser: watched a real severe-interaction answer stream in live (screenshot captured mid-sentence, cut off at "...which may include unusual bruising,"), confirmed the text was actually still growing (polled and compared lengths) before testing Stop.
- Clicked Stop mid-stream on that same real answer: confirmed (after both bugs above were found and fixed) the transcript settles on the complete, correct deterministic template text with its severity badge and "grounded" tag intact — never the truncated sentence that was visible on-screen the instant before Stop was clicked.
- Caught and fixed a third, smaller issue live: the client's re-sync after an abort raced the server's own fallback persistence (the server keeps running after the client disconnects) and could momentarily render the transcript with no assistant reply at all. Fixed with `resyncAfterAbort` — polls a few times expecting the transcript to end on an assistant message before giving up; re-verified the after-Stop screenshot shows the real persisted reply, not a gap.
- Confirmed a normal (non-aborted) send/regenerate flow still streams and persists correctly end-to-end, with zero console errors throughout every check above.

**Done when:** a real answer visibly streams token-by-token in the browser; clicking Stop mid-stream halts generation and the session always ends up with a complete, non-truncated persisted message — grounded or fallback, never a cut-off claim — confirmed live, with the two safety-relevant bugs this pass surfaced fixed and re-verified before being called done.

---

### Version 2.3 — Session & Memory Management (feature addendum) — **Done** (2026-08-23)

Built at the user's explicit request: every item from `improvements.md`'s Version 2.3 roadmap (Section 3, "Session & Memory Management"). **Scoping note:** V2.3.3's backlog item bundles three things — "session rename, search, and archiving" — archiving (a persisted archived flag + filtered views + a UI toggle) was left out as a separate, more speculative feature bundled into one Low-priority item; rename and search were built in full. Built as one vertical slice per item across the layers that actually apply, per the user's 5-layer template.

**Tasks as built, by item:**

1. **V2.3.0 — Delete-session wired up.** The `DELETE /chat-sessions/:id` endpoint and `deleteSession` use case have existed since early in the conversational build; `ChatSidebar.tsx` never rendered a control for it. Added a trash-icon button (visible on hover, matching the existing `PatientList.tsx`/`DrugList.tsx` delete-confirmation pattern) that calls the real endpoint; deleting the active session falls back to the next one in the list rather than leaving the transcript blank.
2. **V2.3.1 — LLM-generated titles.** **Reverses V0.1's original decision** ("Deterministic title derivation... an extra request for a cosmetic label isn't worth the latency/cost") — done deliberately at the user's explicit request, not accidentally. New `LlmPort.generateTitle`, adapted to a `TitleGenerator` port `chat-sessions` owns (`LlmTitleGenerator`, same one-way adapter shape as `AssistantTurnAnswerer`). Still fires at most once per session (the existing `isDefaultTitle` gate), and falls back to the original deterministic truncated title on failure (NFR-007) — the "not worth the cost" concern from V0.1 is bounded to exactly one extra call, once, ever, per session, which is what makes reversing that decision reasonable now.
3. **V2.3.2 — History summarization beyond the context window.** New pure domain rule `planHistoryWindow` (`chat-sessions/domain/chatSession.ts`) — decides which NEW older messages need folding into a running summary, never re-summarizing ones a prior turn already covered. New `ChatSessionRecord` fields `historySummary`/`historySummarizedCount`; new `HistorySummarizer` port (`LlmHistorySummarizer` adapter, wrapping `LlmPort.summarizeHistory`). New shared `buildHistoryForTurn` helper (used by both `postMessage` and `regenerateLastMessage`) — below the 10-turn window this is byte-for-byte the original "slice the last N" behavior; once exceeded, the summary is persisted and prepended as a synthetic history turn, same "never a fact source" rule as any other history turn. Falls back to the plain windowed slice on failure (NFR-007).
4. **V2.3.3 — Session rename + search.** `renameSession` reuses `deriveTitle`'s own trim/truncate/default-on-blank sanitization — "turn raw text into a valid title" is the same operation whether the text came from the first message or a rename. New `PATCH /chat-sessions/:id`. Search is a new pure domain rule `filterSessionsByTitle` (`apps/web/src/chat/filterSessions.ts`) — case-insensitive substring match over the already-loaded session list, no backend call needed. UI: a pencil icon (rename, via `window.prompt`, matching the existing `window.confirm` delete pattern) and a search input above the session list.
5. **V2.3.4 — Paginated message history.** New `ChatSessionRepository.listMessagesPage` (real Neo4j: `ORDER BY createdAt DESC LIMIT`, fetching one extra row to learn `hasMore`, reversed back to oldest-first) — kept fully separate from the existing unpaginated `listMessages`, which turn-processing still uses internally since it needs the TRUE total message count to plan the history window correctly. `getSession` gained optional `{limit, before}`, defaulting to a page size of 50 — generous enough that every conversation this app has ever had loads exactly as before pagination existed; only a session that actually exceeds 50 messages ever sees `hasMoreMessages: true`. UI: a "Load older messages" control at the top of the transcript, shown only when there's actually more to load.

**Automated tests:** API 269/269 passing (up from 256 — 13 new: `planHistoryWindow`'s domain edge cases, title-generation success/failure/one-time-only, history-summarization trigger/no-trigger/no-re-summarize/failure-fallback, rename success/blank-input/ownership, and pagination's default/limited/before-cursor behavior). Web 45/45 passing (up from 42 — 3 new: `filterSessionsByTitle`). `pnpm typecheck` clean on both workspaces; `vite build` succeeds. No new external dependency (Neo4j's `int()` cursor helper is part of the already-installed `neo4j-driver` package) — no Technology Decision Log entry applies.

**Live verification performed (real OpenAI, real dev server, real Neo4j, real headless-Chromium browser):**
- Title generation: sent "I am currently taking aspirin and warfarin together, is that risky for me?" as a first message → real generated title `"Aspirin and warfarin interaction risks"`, not the old truncated-verbatim text.
- Rename: `PATCH`'d a session to `"My Custom Chat Name"`, confirmed via a fresh `GET /chat-sessions` refetch.
- Delete: confirmed removal from the API list AND a direct Neo4j `MATCH ... RETURN count(s)` returning `0`.
- History summarization: seeded 11 messages directly via `cypher-shell` (to avoid burning real OpenAI calls purely for volume), then sent one real message through the actual API — confirmed a real summarization call fired and persisted `historySummary`/`historySummarizedCount: 1` in Neo4j. The summary was appropriately vague given the synthetic placeholder content it was fed (no fabricated medical specifics), consistent with the "never a new fact source" rule.
- Pagination: against that same 13-message session, `?limit=3` correctly returned only the last 3 messages with `hasMoreMessages: true`; `?limit=3&before=<cursor>` correctly returned the 3 messages immediately before it; the default (no params) request against the same session returned `hasMoreMessages: false`, confirming full backward compatibility.
- Browser (Playwright): rename/delete icons appear on hover, search live-filters the sidebar list, zero console errors throughout.

**Done when:** every item is live-verified end-to-end — persisted correctly, surviving a refetch, and correct against the real database — with archiving explicitly scoped out of V2.3.3, not built.

---

### Version 2.4.1 — Dictate Query (Voice Input) — **Done** (2026-08-23)

**Touches:** REQ-038 (new, Could) — the plan explicitly noted this could be treated as pure behavior since REQ-028 already covers "accept a free-text natural-language question" regardless of input method, but a small parallel line was added for the same traceability reason REQ-031 (quick-check popup) got its own line: it's a distinct way to *produce* that input. No System Architecture change — no new endpoint, no new dependency.

**Shape:** entirely frontend, entirely browser-native. `ChatComposer.tsx` is the actual input bar (a `<textarea>` + Send/Stop, single `onSend(text)` prop); dictation just needs to produce text and call that same submit path, so nothing in `ChatPage.tsx`'s send/stream/persist pipeline changes.

1. **Domain rule** (`apps/web/src/chat/dictation.ts`) — `shouldFinalizeDictation(lastSpeechAt, now, pauseMs = 3000)`, pure, matching this project's own established pattern (`shouldAutoScroll`, `parseNdjsonChunk`). It's the one actual piece of logic ("has it been quiet for 3s") and the one piece testable without a browser's speech API — 5 unit tests.
2. **`ChatComposer.tsx`** — new mic button (`IconMic`, new in `icons.tsx`, matching the existing hand-drawn SVG style). Click starts `SpeechRecognition`/`webkitSpeechRecognition` (`continuous: true, interimResults: true`); each `onresult` writes the accumulating transcript straight into the composer's `<textarea>` live (so it visibly appears "as when written manually," per the request) and records `lastSpeechAt`. A 250ms poll checks `shouldFinalizeDictation` against real wall-clock time — the pure rule is the actual decision-maker, not just a decorative proof — and once it returns true, stops recognition and calls the exact same `submit()` the Enter key and Send button already use (auto-send, not just filling the box). Clicking the mic again while listening cancels — stops recognition, leaves whatever was transcribed so far in the box, never auto-sends it. If `SpeechRecognition` isn't available (Firefox/Safari), the mic button doesn't render at all rather than showing a broken control. A `listening` CSS state pulses the button red while recording (`--color-error`/`--color-error-bg`, matching existing severity tokens).
3. **`ChatPage.tsx`** — one-line addition: passes its existing `setError` through as `ChatComposer`'s new `onError` prop, so a mic-permission-denied/no-speech/no-microphone failure surfaces in the exact same error banner every other failure in this app already uses.

**Automated tests:** web 50/50 passing (up from 45 — 5 new, all in `dictation.test.ts`). API untouched, 269/269 still passing (confirms zero backend surface was touched). `pnpm typecheck` clean on both workspaces.

**Live verification performed (real dev server, real OpenAI, real Neo4j, real headless-Chromium browser):** Playwright/headless Chromium has no real microphone, so `window.SpeechRecognition` was stubbed via `page.addInitScript` to emit synthetic `onresult` events with realistic timing — this proves the actual wiring end-to-end; it does not stand in for a manual real-device check, which is a real limitation worth stating plainly rather than glossing over.
- Clicked the mic: button entered the pulsing "listening" state; a synthetic speech result ("I am taking aspirin and warfarin, is that risky?") filled the composer live.
- Went quiet (no further synthetic results) for >3s: the poll correctly fired, recognition stopped, the message was auto-submitted through the real send pipeline — appeared in the transcript as a genuine timestamped user message, composer cleared, mic returned to idle.
- The real backend then ran its actual intake-clarification flow (asked about allergies/conditions) and the session was auto-titled by the real LLM ("Aspirin and warfarin in...") — confirming the dictated message is indistinguishable from a typed one anywhere downstream, exactly per the "next flow will be as same current flow" requirement.
- Cancel path: started dictating, then clicked the mic again before the 3-second pause elapsed — recognition stopped immediately, nothing was sent, confirmed both immediately and after waiting past what would have been the auto-send window.
- Zero console errors across every interaction.

**Done when:** clicking the mic dictates a query that fills the composer live, auto-sends after a 3-second pause, appears in the transcript exactly like a typed message, and proceeds through the identical existing chat flow — verified live; canceling mid-dictation never sends — verified live; every other implementation unchanged — verified live + 50/50 web and 269/269 API automated tests passing.