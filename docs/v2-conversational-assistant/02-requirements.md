# Requirements — Drug Interaction Safety Assistant (v2 — Conversational Assistant)

This document supersedes `docs/02-requirements.md` for the screens/behavior it changes. The original stays in place as the historical record of the V1 (multi-screen CRUD) flow; REQ-001–027 below are carried forward unchanged except where explicitly marked **(superseded)**. New requirements for the conversational interface are REQ-028 and up.

## 1. Functional Requirements

### Must

| ID | Requirement |
|----|-------------|
| REQ-001 | System shall store drug entities with core attributes: name, generic name, drug class, dosage form. |
| REQ-002 | System shall store patient medication profiles: current medications, allergies, diagnosed conditions. |
| REQ-003 | System shall model drug–drug interaction relationships, each carrying a severity level. |
| REQ-004 | System shall model drug–disease contraindication relationships. |
| REQ-005 | System shall model drug–allergy relationships (drug → allergen/ingredient). |
| REQ-006 | System shall model drug–side-effect relationships. |
| REQ-007 | Given a patient's medication list, system shall traverse the graph and return all drug–drug interaction risks among those medications. |
| REQ-008 | Given a patient profile, system shall detect conflicts between prescribed/candidate drugs and the patient's allergies. |
| REQ-009 | Given a patient profile, system shall detect conflicts between prescribed/candidate drugs and the patient's diagnosed conditions (contraindications). |
| REQ-010 | For each flagged risk, system shall return the explicit relationship path (nodes and edges traversed) that produced it. |
| REQ-011 | System shall render an explanation of each flagged risk in natural language, derived only from the traversed path. This still holds with an LLM in the loop (REQ-029) — the LLM rephrases already-grounded text, it does not generate facts. |
| REQ-012 | System shall provide an API endpoint to query risks for a given patient or drug set. |
| REQ-013 | **(superseded by REQ-028)** System shall provide a UI to submit a patient's medication list and view flagged risks. The v1 form-based UI (SCR-001/002/005) is removed; the same capability is now reached via natural-language chat. |
| REQ-014 | System shall provide a graph visualization of a query result (nodes/edges involved in a flagged risk), reached from a chat answer rather than from a standalone risk-detail screen. |
| REQ-028 | System shall accept a free-text natural-language question, use an LLM to extract the medications/allergies/conditions/intent mentioned, resolve each extracted name against the real drug/allergen/disease catalog, and run the existing risk-check traversal (REQ-007–009) against the resolved set. |
| REQ-029 | System shall generate a natural-language answer to the user's question, composed by an LLM from — and constrained to — the already-grounded risk data (REQ-010/011) plus deterministic, severity/type-keyed precaution tips; the LLM must not introduce a drug, allergy, condition, or relationship absent from the supplied grounded facts. |
| REQ-030 | System shall let the user view the literal Cypher query (template, not bound parameter values) used to retrieve the data behind any given answer. |
| REQ-031 | System shall provide a quick-check popup where a user can select known medications/allergies/conditions directly (bypassing free-text extraction) and receive the same grounded, natural-language answer. |
| REQ-032 | System shall let a logged-in user create, list, and switch between chat sessions; each session's message history persists and is shown in a sidebar, matching the "start over cleanly" behavior of a new chat (no cross-session profile carry-over, per project decision). |
| REQ-036 | Within a single chat session, the composed answer (REQ-029) shall be aware of the session's prior turns for phrasing continuity (e.g. answering "explain that more simply" or "what did you just say" coherently) — never as an additional source of risk/interaction facts, which must always come only from that turn's own `checkRisks` result. (V2.0.3.6.) |
| REQ-037 | A message with nothing substantive to check (a greeting, small talk, or a general, non-personalized health/pharmacology question) shall receive a real conversational answer rather than the "didn't catch anything" fallback, and shall not spend the session's one-time intake question (REQ-035). General-knowledge answers are permitted; the system shall never assert a conclusion about the user's own personal risk, medications, or health situation without an actual `checkRisks` result behind it — a message that sounds like it wants personalized information is met with a request to name specific medications/allergies/conditions, not a guess. (V2.0.3.6.) |
| REQ-035 | The first time a session's user says anything substantive — names a medication, allergy, or condition, or reports a symptom — system shall gather whichever of medications/allergies/conditions aren't already **answered** (a category counts as answered once it has a known entry, or the user has explicitly stated there is none — never from silence, and never merely inferred from the user having positively answered a *different* category in the same message), via a clarifying question, before drawing any conclusion. This applies equally whether the message directly names medications (e.g. "I am taking aspirin and warfarin, am I at risk?") or reports a symptom (e.g. "I am facing nose bleeding") — neither triggers an immediate risk-check on partial information. A reported symptom is never resolved against the drug/allergen/disease catalog. If a reply addresses only some of what was asked — whether by leaving a category unmentioned, or by positively answering one category while leaving another unaddressed (e.g. naming a real allergy while conditions goes unmentioned) — system shall ask again, naming only the categories still unanswered, up to one follow-up (two asks total), before giving up and drawing a conclusion on whatever is known. Every turn once gathering has concluded (whether by a full answer or the retry cap) proceeds straight to a real risk-check, explicitly tying the answer back to a reported symptom when one was given, grounded only in what `checkRisks` actually returned. If nothing is ever on record, system shall respond with generic, non-diagnostic guidance rather than a "not found" error. (Found via live user testing 2026-08-21/22 — see Build Plan V2.0.3.2 through V2.0.3.5.) |

### Should

| ID | Requirement |
|----|-------------|
| REQ-015 | System should allow filtering/sorting flagged risks by severity (within a chat answer's risk cards). |
| REQ-016 | System should support adding a candidate drug to an existing patient profile and re-checking risks incrementally. In the conversational flow this happens implicitly: mentioning a new drug in a later chat turn extends the session's backing profile and triggers a fresh check. |
| REQ-017 | System should support multi-hop queries beyond direct pairs, for research/demo purposes. **(still Not Started — unaffected by this change.)** |
| REQ-018 | System should log each risk query (input + result, synthetic data only, no PII) for later review/demo purposes — now including chat-originated queries (`queryType: "chat"`). |
| REQ-027 | System should support soft-deleting a patient or drug record. **(unaffected — still applies to the underlying `Patient`/`Drug` nodes; a chat session's own delete is a hard delete, see REQ-033.)** |

### Could

| ID | Requirement |
|----|-------------|
| REQ-019 | Could support bulk import of a dataset via an admin-facing import tool. **(superseded in spirit by REQ-034 — see below; the underlying import pipeline is reused, not removed.)** |
| REQ-020 | Could support exporting a flagged-risk report as PDF/JSON — still available, reusable from a chat answer's risk cards. |
| REQ-021 | Could support a side-by-side relational-join comparison. **(still Not Started.)** |
| REQ-033 | Could support deleting a chat session outright (hard delete — nothing else references a `ChatSession` the way other records reference a `Patient`/`Drug`). |
| REQ-034 | Could support a human-body diagram next to a generated answer, highlighting the body region associated with a flagged risk's disease/allergen, via a seeded (not user-entered) `bodyRegion` mapping. |
| REQ-038 | Could support dictating a query by voice as an alternative to typing — browser speech-to-text fills the composer live and auto-submits after a pause, then proceeds through the same REQ-028 free-text pipeline as a typed message. |

### Won't (this version)

| ID | Requirement |
|----|-------------|
| REQ-022 | Will not perform actual clinical diagnosis. Precaution tips (REQ-029) are generic, severity/type-keyed guidance, never a specific clinical claim beyond what the graph returned. |
| REQ-023 | Will not autonomously generate or transmit prescriptions. |
| REQ-024 | Will not integrate with real-time hospital/EHR systems. |
| REQ-025 | Will not support regulatory/clinical approval workflows. |
| REQ-026 | Will not store real patient-identifiable data — a chat session's backing `Patient` record uses a synthetic display name, never anything the user types as their own name. |

## 2. Non-Functional Requirements

All NFR-001–006 from `docs/02-requirements.md` carry forward unchanged, plus:

| ID | Category | Requirement | Measurable Target |
|----|----------|-------------|--------------------|
| NFR-007 | Reliability | LLM extraction failure handling | If the LLM extraction call fails or times out, the user gets a clear "couldn't process that, try rephrasing" response — never a raw 500 or a silently wrong risk-check. |
| NFR-008 | Safety | Answer grounding | 100% of risks mentioned in a composed LLM answer are present in that turn's `checkRisks` result — verified by `assistant/application/useCases.test.ts` comparing the exact fact set handed to `composeAnswer` against what `checkRisks` returned. |

## 3. Business Rules

All business rules from `docs/02-requirements.md` §3 carry forward unchanged (a drug–drug interaction needs a severity, a profile can't reference a nonexistent drug, a flagged risk must be traceable to a path, an explanation may only assert what the path contains, no real PII, soft-delete semantics), plus:

- A composed natural-language answer (REQ-029) may only state a risk, severity, or relationship present in that turn's grounded fact set (the same set `assertGroundedInPath` already validates per-risk) — enforced by construction: the LLM is given only the grounded facts, never raw graph/query access.
- An entity name the user mentions that cannot be resolved against the real catalog (exact or fuzzy match) must be surfaced to the user as unresolved, never silently dropped or guessed into a wrong drug.
- A chat session's backing `Patient` profile is provisioned automatically and is never directly editable by the user outside of mentioning entities in the conversation or the quick-check popup — there is no standalone patient-editing screen anymore.

## 4. Non-Goals (this version)

Same as `docs/02-requirements.md` §4, plus: this version does not add cross-session profile memory (each new chat session starts clean, per project decision), and does not replace the LLM's role beyond entity extraction + answer composition — it never gains direct graph query authority.

## 5. Acceptance Criteria

REQ-001–012 acceptance criteria carry forward unchanged from `docs/02-requirements.md` §5. New criteria:

| Requirement | Acceptance Criteria |
|-------------|----------------------|
| REQ-028 | Given a free-text message naming two known interacting drugs, when submitted, then the extracted entities resolve to the correct catalog ids and `checkRisks` is invoked with them — verified by comparing the turn's `cypherQueries`/risk output against a direct `POST /risk-check` call with the same resolved ids. |
| REQ-029 | Given a turn that returns at least one risk, when the answer is composed, then every drug/allergy/condition name appearing in the answer text also appears in that turn's grounded risk set — checked programmatically, not just by eye. |
| REQ-030 | Given any answer with at least one risk, when the user clicks "View Cypher," then the exact query template(s) actually used for that turn are shown. |
| REQ-031 | Given the quick-check popup with valid selections, when "Check" is clicked, then a grounded answer is produced without any free-text extraction step. |
| REQ-032 | Given a logged-in user, when they click "New chat," then a fresh session with an empty backing profile is created and appears in the sidebar; switching to a prior session shows its exact prior message history. |
