# Chatbot Improvement Backlog — Drug Interaction Safety Assistant

This is a specialist review of the **current, real, live-tested** conversational flow (Build Plan V2.0.0–V2.0.3.6) — not a generic chatbot checklist. Every item below is grounded in the actual code (`apps/web/src/components/Chat*.tsx`, `apps/api/src/modules/assistant/`) or in a real behavior observed during live verification this build, not a hypothetical. Each item notes *why it matters specifically for a drug-interaction-safety tool*, since a chat UX flaw here can mean more than an annoyed user — it can mean a missed risk or a false sense of confidence.

**Section 0 is the build-order roadmap** — every item below has been assigned a target version, following the same `Version X.Y.Z` numbering scheme as `docs/08-build-plan.md` (continuing on from the last shipped version, V2.0.3.6). Sections 1–5 remain the detailed backlog reference, each item now tagged with its assigned version. Versions 2.1, 2.2, and 2.3 (Section 0) have been built and live-verified in full — see `docs/08-build-plan.md`'s "Version 2.1"/"Version 2.2"/"Version 2.2.0 / 2.2.7"/"Version 2.3" addenda for the full writeups — except **2.1.6** and **2.1.8** (explicitly excluded at the user's request) and V2.3.3's archiving sub-feature (scoped out as a separate, more speculative feature bundled into one Low-priority item). Versions 2.4–2.5 remain unbuilt.

## How to read this

Priority follows the same idea as severity elsewhere in this app: **Critical** (safety/trust-relevant, should not ship a "real" version without it), **High** (materially hurts the product), **Medium** (real but not urgent), **Low** (polish). Each item names the current behavior, not a strawman. Status is one of **Planned** (not started), **In Progress**, or **Done** — updated in place as work lands, same convention as the Build Plan.

---

## 0. Version Roadmap

Grouping and ordering rules used below:
1. **Safety/trust-critical items ship first** (Version 2.1), since this is a drug-safety tool, not a generic chatbot — a UX polish item never jumps ahead of a trust/safety gap.
2. Within Version 2.1, the three items the earlier "suggested order of attack" flagged as highest safety-to-effort ratio (severity rendering, emergency escalation, disclaimer banner) ship first, ahead of the rest of the Critical/High items.
3. Each item ships as **its own small addendum version** (`2.1.0`, `2.1.1`, ...) — matching how V2.0.3.1–V2.0.3.6 were actually built and verified one at a time, not as one large batch.
4. A dependency ordering is honored where one exists: **2.2.7 (stop-generating control) is sequenced after 2.2.0 (streaming)**, since a "stop" control is meaningless without a stream to stop (this was called out explicitly in the original item 2.8).
5. Versions 2.2–2.5 correspond 1:1 with backlog sections 2–5 (Conversational Quality, Session & Memory, Reliability, Accessibility) and internally sort Critical → High → Medium → Low.

### Version 2.1 — Domain-Critical Safety & Trust

| Version | Backlog # | Priority | Feature | Status |
|---------|-----------|----------|---------|--------|
| 2.1.0 | 1.5 | High | Render severity/risk data in the chat transcript (severity badges per message) | **Done** (2026-08-22) |
| 2.1.1 | 1.1 | Critical | Emergency-symptom escalation (deterministic keyword short-circuit before the intake gate) | **Done** (2026-08-22) |
| 2.1.2 | 1.2 | Critical | Persistent, always-visible medical disclaimer banner (static UI element, not LLM-generated prose) | **Done** (2026-08-22) |
| 2.1.3 | 1.6 | High | Visual distinction between grounded risk-check answers and general-chat answers | **Done** (2026-08-22) |
| 2.1.4 | 1.3 | High | Confirm fuzzy drug-name matches with the user instead of silently accepting the best match | **Done** (2026-08-22) |
| 2.1.5 | 1.4 | High | Disambiguation prompt when a name plausibly matches more than one catalog entry | **Done** (2026-08-22) |
| 2.1.6 | 1.7 | Medium | Disclose demo-catalog scope (~40 drugs) instead of implying "not found = doesn't exist" | Excluded from the V2.1 build pass at the user's explicit request — still Planned |
| 2.1.7 | 1.8 | Medium | Let a user remove/correct an item already accumulated in the session profile | **Done** (2026-08-22) — conversational only (e.g. "I stopped taking X"), since V2.1.8's panel was excluded |
| 2.1.8 | 1.9 | Medium | "Currently tracking" panel showing the session's accumulated medications/allergies/conditions | Excluded from the V2.1 build pass at the user's explicit request — still Planned |
| 2.1.9 | 1.10 | Low | Document caregiver/multi-person support as an explicit known limitation | **Done** (2026-08-22) |
| 2.1.10 | 1.11 | Low | Disclose dosage/frequency exclusion as an explicit, user-facing limitation | **Done** (2026-08-22) |

### Version 2.2 — Conversational Quality

| Version | Backlog # | Priority | Feature | Status |
|---------|-----------|----------|---------|--------|
| 2.2.0 | 2.1 | High | Stream `composeAnswer`/`composeGeneralAnswer` responses token-by-token | **Done** (2026-08-23) |
| 2.2.1 | 2.2 | High | "Assistant is typing" placeholder bubble in the transcript during a turn | **Done** (2026-08-23) |
| 2.2.2 | 2.3 | High | Reduce/parallelize sequential LLM round-trips per turn (e.g. lighter model for extraction) | **Done** (2026-08-23) |
| 2.2.3 | 2.4 | Medium | Stop repeating the same boilerplate safety closing line every turn | **Done** (2026-08-23) |
| 2.2.4 | 2.5 | Medium | Adaptive response length based on answer complexity | **Done** (2026-08-23) |
| 2.2.5 | 2.6 | Medium | Render markdown (bold/lists) instead of literal `**asterisks**` | **Done** (2026-08-23) |
| 2.2.6 | 2.7 | Low | Message regeneration/retry control | **Done** (2026-08-23) |
| 2.2.7 | 2.8 | Low | Stop-generating control (depends on 2.2.0 shipping first) | **Done** (2026-08-23) |
| 2.2.8 | 2.9 | Low | Only auto-scroll to bottom when the user is already near the bottom | **Done** (2026-08-23) |
| 2.2.9 | 2.10 | Low | Assistant persona/name and per-message timestamps | **Done** (2026-08-23) |

### Version 2.3 — Session & Memory Management

| Version | Backlog # | Priority | Feature | Status |
|---------|-----------|----------|---------|--------|
| 2.3.0 | 3.1 | Medium | Wire up the already-built delete-session control in `ChatSidebar.tsx` | **Done** (2026-08-23) |
| 2.3.1 | 3.2 | Medium | Replace blunt-truncation session titles with a short LLM-generated summary | **Done** (2026-08-23) |
| 2.3.2 | 3.3 | Medium | Summarize/preserve older turns instead of silently dropping them past the 10-turn cap | **Done** (2026-08-23) |
| 2.3.3 | 3.4 | Low | Session rename, search, and archiving | **Done** (2026-08-23) — rename + search only; archiving scoped out as a separate, more speculative feature bundled into this item, see Build Plan |
| 2.3.4 | 3.5 | Low | Paginate `listMessages` instead of fetching entire session history unconditionally | **Done** (2026-08-23) |

### Version 2.4 — Reliability, Performance & Observability

| Version | Backlog # | Priority | Feature | Status |
|---------|-----------|----------|---------|--------|
| 2.4.0 | 4.1 | High | In-process reference-data cache with short TTL (per System Architecture §7, never implemented) | Planned |
| 2.4.1 | 4.2 | Medium | Run catalog fetch and entity extraction in parallel instead of sequentially | Planned |
| 2.4.2 | 4.3 | Medium | Retry/backoff on transient OpenAI failures before falling back to the static message | Planned |
| 2.4.3 | 4.4 | Medium | Rate limiting on `POST /chat-sessions/:id/messages` | Planned |
| 2.4.4 | 4.5 | Medium | Log OpenAI token usage per turn/session alongside existing query-log entries | Planned |
| 2.4.5 | 4.6 | Low | Explicit request timeout configured on the OpenAI client | Planned |
| 2.4.6 | 4.7 | Low | Always-on structured debug log of raw extraction output (flagged, not user-visible) | Planned |

### Version 2.5 — Accessibility & Polish

| Version | Backlog # | Priority | Feature | Status |
|---------|-----------|----------|---------|--------|
| 2.5.0 | 5.1 | Medium | Verify and fix chat layout at common mobile/narrow viewports | Planned |
| 2.5.1 | 5.2 | Low | Dark mode | Planned |
| 2.5.2 | 5.3 | Low | Accessibility audit of chat components (ARIA roles, `aria-live`, focus management) | Planned |

---

## 1. Domain-Critical — Drug Safety & Trust

These matter more here than in a generic chatbot, because the entire value proposition is "don't let the user draw a wrong or overconfident conclusion about a medication risk."

| # | Version | Priority | Item |
|---|---------|----------|------|
| 1.1 | 2.1.1 | **Critical** | **No emergency-symptom escalation.** If a user describes something that could be an acute emergency ("I can't breathe," "my throat is closing," "chest pain"), the message just flows through the normal symptom-intake gate (`runTurn` in `assistant/application/useCases.ts`) like any other symptom — there's no hardcoded, deterministic override that immediately says "this could be a medical emergency — call your local emergency number now" before anything else. This should never depend on the LLM's judgment alone; it should be a keyword/pattern check that runs *before* the intake gate and short-circuits everything else. |
| 1.2 | 2.1.2 | **Critical** | **No persistent, always-visible medical disclaimer.** The "this isn't medical advice, consult a professional" language only appears when the LLM happens to include it in generated prose (`COMPOSE_SYSTEM_PROMPT` / `GENERAL_CHAT_SYSTEM_PROMPT` rule 6/4). It's not a fixed UI element. A generated sentence can be phrased away, forgotten under prompt drift, or simply not fit a 3-sentence answer. A static disclaimer banner (e.g., pinned above the composer or below the app header) shouldn't depend on the model remembering to say it. |
| 1.3 | 2.1.4 | **High** | **Silent fuzzy-match on drug names, no confirmation.** `entityResolution.ts`'s `resolveEntityName` picks the best fuzzy match above a similarity threshold and moves on — the user is never told "I matched 'pennicilin' to Penicillin, is that right?" A wrong silent match (two similarly-spelled but different drugs) is exactly the failure mode this app exists to prevent, and it's currently invisible to the user. |
| 1.4 | 2.1.5 | **High** | **No disambiguation when a name could plausibly match more than one catalog entry.** Right now it's "best match wins," full stop. For a safety tool, "ask, don't guess" should apply here the same way it already applies to the intake gate (REQ-035) — if two candidates are close, ask which one was meant instead of silently picking one. |
| 1.5 | 2.1.0 | **High** | **The severity signal is lost in the chat UI.** The old dashboard (`RiskDashboard.tsx`/`SeverityBadge.tsx`, pre-V2.0) color-coded every risk by severity so it was visible at a glance. `MessageBubble.tsx` today renders only `message.text` — the `risks[]` array (with real `severity`/`type`/`drugsInvolved` per risk) that the backend already returns is computed and sent but never rendered. A "severe" interaction currently looks exactly like a "minor" one in the transcript: same paragraph, same color, no badge. This is a real regression from the pre-chat UI, and severity is the single most safety-relevant piece of data this app produces. |
| 1.6 | 2.1.3 | **High** | **No visible distinction between "checked against real data" and "general knowledge" answers.** A risk-check answer (grounded in `checkRisks`) and a general-chat answer (`composeGeneralAnswer`, general pharmacology knowledge, not checked against anything) currently render identically — same bubble, same styling. A user can't tell, at a glance, which category of trust applies to what they're reading. Given REQ-037 explicitly forbids the general-chat path from asserting personalized conclusions, the UI should make that boundary visible too, not just enforce it in the prompt. |
| 1.7 | 2.1.6 | **Medium** | **No indicator that this is a small demo catalog, not a real/complete drug database.** When a name doesn't resolve, the message says "I couldn't find X in our records — could you check the spelling?" — which reads as "this drug might not exist" rather than "our demo only knows ~40 drugs." A first-time user has no way to know the catalog's actual scope. Worth a one-time note or a visible "what I currently know about" affordance (ties to 1.9). |
| 1.8 | 2.1.7 | **Medium** | **The accumulated session profile can only grow, never be corrected.** Once a drug enters the session's backing `Patient` profile (via `updatePatient` in `runTurn`), there's no conversational or UI path to remove it — if a user says "actually I stopped taking that" or a name was mis-resolved, the profile keeps including it for every future turn in that session. The only fix is starting a new chat. For a tool whose whole job is tracking "what is this person actually taking," this is a meaningful gap. |
| 1.9 | 2.1.8 | **Medium** | **No way to see what the assistant currently "knows" about you.** There's no UI surface showing the session's current accumulated medications/allergies/conditions (`Patient.medicationIds/allergyIds/conditionIds`) — the user has to infer it from re-reading the conversation. A small "currently tracking: Aspirin, Warfarin" strip would let a user catch a wrong resolution immediately instead of it silently affecting every future answer in the session. |
| 1.10 | 2.1.9 | **Low** | **No caregiver / multiple-person support.** "My daughter takes X, I take Y" isn't a supported shape — everything in a session collapses into one undifferentiated profile. Worth documenting as an explicit known limitation even if not fixed soon, so it isn't discovered by accident. |
| 1.11 | 2.1.10 | **Low** | **Dosage/frequency is explicitly discarded during extraction** (`EXTRACTION_SYSTEM_PROMPT`: "Do not include dosages, frequencies"). Reasonable given the graph model doesn't have dose-dependent edges, but this should be a documented, intentional limitation the user can be told about ("I don't currently factor in dose or frequency") rather than a silent gap. |

---

## 2. Conversational Quality — Making It Feel Like Talking to Someone

| # | Version | Priority | Item |
|---|---------|----------|------|
| 2.1 | 2.2.0 | **High** | **No streaming.** `OpenAiLlmAdapter.composeAnswer`/`composeGeneralAnswer` use `chat.completions.create` non-streaming — the full response is generated server-side before anything reaches the browser. Combined with the extraction call that runs first, a real turn takes ~5-9 seconds of dead air (measured live: aspirin/warfarin turns landed around 5-7s) before *any* text appears. Streaming token-by-token would make the same latency feel completely different. |
| 2.2 | 2.2.1 | **High** | **No "assistant is typing" indicator in the transcript itself.** The only busy feedback is a spinner glyph swapped into the Send button (`ChatComposer.tsx`); there's no placeholder bubble in the message list. During a 5-9s wait, the transcript just... sits there. A skeleton/typing-dots bubble (the same pattern already used elsewhere in this app for loading states, e.g. `loading-panel`) would make the wait legible. |
| 2.3 | 2.2.2 | **High** | **Two-to-three sequential LLM round-trips per turn.** A normal risk-answering turn is `extractEntities` → (sometimes) intake question → `composeAnswer`; a from-scratch conversation can hit extraction twice before ever reaching a conclusion. Each is a full network round trip to OpenAI. Real latency reduction options: use a smaller/faster model for the extraction call specifically (it's a narrow classification task, not open-ended generation) while keeping the higher-quality model for the user-facing composition; or reduce round-trips where the intake gate and extraction could plausibly be merged. |
| 2.4 | 2.2.3 | **Medium** | **Repetitive boilerplate closing lines.** Live-tested responses very consistently end with some variant of "consult a healthcare professional / never stop or change medication without guidance." Necessary the first time; by the third or fourth turn in one session it reads as robotic filler. `GENERAL_CHAT_SYSTEM_PROMPT` already has a "don't repeat this every single turn" instruction for one of its rules — `COMPOSE_SYSTEM_PROMPT` doesn't have the equivalent for its own safety-reminder rule, and should. |
| 2.5 | 2.2.4 | **Medium** | **No adaptive response length.** Every risk answer runs the full 3-6 sentence template regardless of how simple the situation is. A "no risks found, everything's fine" answer probably doesn't need the same length as a multi-risk severe-interaction explanation. |
| 2.6 | 2.2.5 | **Medium** | **No markdown rendering.** `MessageBubble.tsx` renders `{message.text}` as a raw string inside a `<div>`. If the model ever produces markdown-style emphasis or a list (which LLMs do fairly often, prompted or not), it shows as literal `**asterisks**` rather than bold text or bullets — this would look broken, not stylistic. |
| 2.7 | 2.2.6 | **Low** | **No message regeneration / retry.** If an answer is unhelpful or oddly phrased, there's no "regenerate" action — the only recourse is rephrasing the question manually. |
| 2.8 | 2.2.7 | **Low** | **No stop-generating control**, relevant mainly once streaming (2.1) exists — flagging now so it's designed in together, not bolted on after. |
| 2.9 | 2.2.8 | **Low** | **Auto-scroll always forces the transcript to the bottom** (`ChatPage.tsx`'s `useEffect` on `messages`) — if a user scrolls up to re-read an earlier explanation and a new message arrives (e.g. in a future multi-device or notification scenario), they'd get yanked back down. Low risk today (single active tab, user-initiated sends only) but worth a "only auto-scroll if already near the bottom" guard before it becomes a real annoyance. |
| 2.10 | 2.2.9 | **Low** | **No assistant persona/name**, and no timestamps shown per message (`ChatMessage.createdAt` exists in the data model, unused in `MessageBubble.tsx`). Minor, but both are cheap, standard chat-UX signals currently missing. |

---

## 3. Session & Memory Management

| # | Version | Priority | Item |
|---|---------|----------|------|
| 3.1 | 2.3.0 | **Medium** | **No delete-session control in the UI.** The backend (`DELETE /chat-sessions/:id`, `deleteSession` in `chat-sessions/application/useCases.ts`) and the API client (`api.deleteChatSession`) both already exist and are tested — but `ChatSidebar.tsx` never renders a delete affordance per session. The feature is fully built and simply not wired up. |
| 3.2 | 2.3.1 | **Medium** | **Session titles are a blunt truncation, not a real summary.** `deriveTitle` (chat-sessions `domain/chatSession.ts`) just truncates the first message to 60 characters — so a title can read as an awkward half-sentence ("i am taking aspirin and warfarin, am i exposed to any…"). A short LLM-generated title (one extra cheap call, or folded into the first turn's existing extraction call) would read much better in the sidebar. |
| 3.3 | 2.3.2 | **Medium** | **10-message history cap could silently drop the relevant context in a long conversation.** `HISTORY_TURNS_FOR_CONTEXT = 10` in `chat-sessions/application/useCases.ts` means a conversation with more than ~5 back-and-forth exchanges starts losing its earliest turns from what the LLM sees — including, potentially, the original intake exchange. Worth either summarizing older turns instead of dropping them, or explicitly re-injecting the accumulated profile as a standing fact (it's already grounded via `checkRisks` regardless, so this is about conversational coherence, not correctness). |
| 3.4 | 2.3.3 | **Low** | **No session rename, search, or archiving** — fine at low session counts, will matter once a user accumulates dozens of chats. |
| 3.5 | 2.3.4 | **Low** | **`listMessages` fetches a session's entire history unconditionally** (`Neo4jChatSessionRepository.listMessages`) — no pagination. Not a problem yet at demo scale, but worth flagging before it becomes one. |

---

## 4. Reliability, Performance & Observability

| # | Version | Priority | Item |
|---|---------|----------|------|
| 4.1 | 2.4.0 | **High** | **No caching for reference-data reads, despite the project's own architecture doc calling for it.** `System Architecture §7` documents: "Reference data that changes rarely... is cached in-process with a short TTL (5 min)." `Neo4jAssistantCatalog` (and the flat `drugs`/`allergens`/`diseases` modules) hit Neo4j fresh on every single turn regardless — a grep across `apps/api/src` turns up no cache/TTL implementation anywhere in the codebase. This is a concrete, previously-documented, never-implemented gap, not a new idea. |
| 4.2 | 2.4.1 | **Medium** | **Catalog fetch and entity extraction run sequentially when they don't need to.** In `runTurn`, `extractEntities` is awaited first, then `Promise.all([listDrugs, listAllergens, listDiseases])` runs after — but the catalog reads don't depend on the extraction result at all. Kicking both off in parallel (`Promise.all([extractEntities(...), listDrugs(), ...])`) would shave a real chunk of the OpenAI round-trip off the perceived latency for free. |
| 4.3 | 2.4.2 | **Medium** | **No retry/backoff on transient OpenAI failures.** `extractEntities`/`composeAnswer`/`composeGeneralAnswer` all fail straight to their static fallback on the first error — a single transient network blip degrades the whole turn immediately rather than getting one quick retry first. |
| 4.4 | 2.4.3 | **Medium** | **No rate limiting on `POST /chat-sessions/:id/messages`.** Each message can trigger 1-3 real OpenAI calls; there's currently nothing stopping a single account (or a stray script) from sending messages in a tight loop, which is both a cost risk and an abuse vector. |
| 4.5 | 2.4.4 | **Medium** | **No usage/cost visibility.** Nothing logs OpenAI token usage per turn or per session — worth at least logging `usage.total_tokens` alongside the existing query-log entries, given every chat turn now has a real per-message cost that didn't exist before V2.0. |
| 4.6 | 2.4.5 | **Low** | **No explicit request timeout configured on the OpenAI client** — relying entirely on SDK defaults; a slow/hung upstream call has no app-level ceiling before the NFR-007 fallback kicks in. |
| 4.7 | 2.4.6 | **Low** | **No structured debug logging of what extraction actually returned per turn.** Diagnosing the exact `confirmedNone`-style misclassification bug fixed in V2.0.3.5 required a one-off standalone script; a lightweight, always-on debug log of raw extraction JSON (behind a flag, not user-visible) would make the next such issue much faster to catch. |

---

## 5. Accessibility & Polish

| # | Version | Priority | Item |
|---|---------|----------|------|
| 5.1 | 2.5.0 | **Medium** | **Mobile/narrow-viewport layout is untested.** The chat layout (`--sidebar-width`, fixed flex panes in `styles.css`) has only been verified at a 1400×900 desktop viewport throughout this build's live checks. Worth an explicit pass at common mobile widths. |
| 5.2 | 2.5.1 | **Low** | **No dark mode** — the app is light-theme-only; increasingly a baseline expectation for a chat-style interface used for extended sessions. |
| 5.3 | 2.5.2 | **Low** | **Accessibility pass not yet done for the new chat components** — ARIA roles/labels for the message list (e.g. `role="log"`, `aria-live` for new messages so a screen reader announces incoming answers), composer labeling, and focus management when switching sessions haven't been specifically audited the way the original Design System's WCAG 1.4.1 node-label rule was for the graph view back in V0.6. |

---

## Suggested order of attack

Superseded by the version roadmap in Section 0, which encodes this same reasoning as concrete version numbers: **2.1.0** (render risk/severity data that's already computed and already flowing over the wire, just not rendered), **2.1.1** (emergency-keyword short-circuit, small and self-contained), **2.1.2** (static disclaimer banner, a UI-only change), then **2.2.0/2.2.1** (streaming + typing indicator, the single biggest perceived-quality lever, though the largest change of this list). **2.3.0** (wire up the already-built delete-session button) is the cheapest win in the whole document — the feature exists end-to-end and is simply not connected to a UI control.
