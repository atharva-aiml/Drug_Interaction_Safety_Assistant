# UX & Product Design — Drug Interaction Safety Assistant (v2 — Conversational Assistant)

Supersedes `docs/03-ux-product-design.md`'s screen inventory and journeys. The original stays as the V1 historical record.

## 1. Screen Inventory

| ID | Name | Purpose |
|----|------|---------|
| SCR-010 | Chat Page | Single-page conversational interface: sidebar of sessions + message transcript + composer. Replaces SCR-001/002/003/005 entirely. |
| SCR-011 | Session Sidebar | List the current user's chat sessions, newest first; start a new one. Contextual part of SCR-010, not a separate route. |
| SCR-012 | Quick-Check Popup | Pick medications/allergies/conditions directly (typeahead against the real catalog, same interaction pattern as the old `ReferencePicker`) and get an answer without typing a question. Reached from a button on the composer. |
| SCR-013 | Cypher View | Expandable panel under an assistant message showing the literal Cypher query template(s) used for that turn. Contextual, part of a message bubble. |
| SCR-014 | Graph View (reused) | Same component as the old SCR-004, reached from a "View graph" button per risk card inside an assistant message instead of from a standalone risk-detail screen. |
| SCR-015 | Body Diagram (Could, REQ-034) | Inline SVG figure next to an assistant message, highlighting a body region tied to a flagged risk's disease/allergen. Only rendered when at least one risk maps to a seeded `bodyRegion`. |

**Removed** (superseded, no longer reachable): SCR-001 (Patient & Query Start), SCR-002 (Risk Results Dashboard), SCR-003 (Risk Detail Panel), SCR-005 (Patient Profile Editor), SCR-007 (Query History Log), SCR-008 (Data Import), SCR-009 (Deleted Items). SCR-006 (Multi-hop Explorer) was already unbuilt (V0.8) and stays out of scope.

## 2. Navigation / Information Architecture

There is exactly one top-level entry point now: SCR-010 (Chat Page), reached immediately after login. Everything else is contextual within it:

- SCR-011 (Session Sidebar) is always visible alongside the transcript, not a separate navigation state.
- SCR-012 (Quick-Check Popup) opens from a button on the composer, closes back to the transcript.
- SCR-013 (Cypher View) and SCR-014 (Graph View) are both reached from controls on an individual assistant message, never independently.
- SCR-015 (Body Diagram), if built, renders inline next to the message that produced the risk it maps to — never a separate screen.

## 3. User Journeys

**Journey 1 — User asks a free-text question about two medications**
1. User lands on SCR-010 (already logged in, or through SCR (login) first), sidebar shows prior sessions or is empty on first use.
2. User clicks "New chat," types "I'm taking aspirin and warfarin together, am I at risk?"
3. Assistant message appears: grounded natural-language answer, risk card(s) with severity badge and precaution tips.
4. User clicks "View Cypher" on the message, sees SCR-013 expand inline.
5. User clicks "View graph" on a risk card, sees SCR-014 (same Cytoscape component as before) render that risk's path.

**Journey 2 — User asks a follow-up in the same session**
1. Continuing Journey 1's session, user types "I just started ibuprofen too, is that a problem?"
2. The session's backing profile gains ibuprofen; a fresh risk-check runs against the full set (aspirin, warfarin, ibuprofen); the new assistant message reflects all currently-flagged risks, not just the new drug's.

**Journey 3 — User prefers the quick-check popup over typing**
1. User clicks the quick-check button on the composer, opens SCR-012.
2. User picks known medications/allergies/conditions via typeahead (same `ReferencePicker` interaction as V1's patient form), clicks "Check."
3. Popup closes; the same grounded answer format appears as a new message in the transcript, no free-text extraction involved.

**Journey 4 — User starts a new session**
1. User clicks "New chat" in the sidebar.
2. A new, empty session appears and becomes active; the previous session's history is still reachable from the sidebar, but its accumulated profile does not carry over (per project decision — no cross-session memory).

**Journey 5 (Could, REQ-034) — Body diagram**
1. Continuing Journey 1 (warfarin has a contraindication mapped to a seeded body region), the assistant message shows a small inline body diagram alongside the risk card, with the relevant region highlighted.

## 4. Per-Screen Detail

### SCR-010 — Chat Page
- **Primary action:** Type a question and send; or open the quick-check popup.
- **Key data shown:** Message transcript (user/assistant bubbles), composer input, sidebar session list.
- **Empty state:** New session with no messages yet — composer shown with a few example queries as placeholder/hint text (matching the user's own example phrasings, e.g. "I am taking aspirin and warfarin together, am I exposed to any risks?").
- **Loading state:** Assistant message shows a typing/processing indicator while extraction → risk-check → composition runs.
- **Error state:** LLM/extraction failure shows a plain assistant message asking the user to rephrase (NFR-007) — never a raw error banner mid-transcript.

### SCR-011 — Session Sidebar
- **Primary action:** Switch to a prior session, or start a new one.
- **Key data shown:** Session title (deterministic truncation of its first message), most-recently-updated first.
- **Empty state:** "No sessions yet" with a prominent "New chat" affordance (also always available even when the list isn't empty).
- **Loading state:** Skeleton rows while the list loads.
- **Error state:** Fetch failure shows a retry affordance; doesn't block using the currently-open session.

### SCR-012 — Quick-Check Popup
- **Primary action:** Select medications/allergies/conditions, click "Check."
- **Key data shown:** Three typeahead pickers (medications/allergies/conditions), same inline "not found" / "create new" pattern as the old `ReferencePicker`.
- **Empty state:** All three pickers empty — "Check" stays disabled until at least one medication is selected.
- **Loading state:** "Check" button shows a spinner while the turn runs.
- **Error state:** A picked name that somehow fails to resolve server-side shows the same inline error pattern `ReferencePicker` already has.

### SCR-013 — Cypher View
- **Primary action:** Toggle open/closed.
- **Key data shown:** One or more labeled, monospace-formatted Cypher query templates (no bound parameter values — see System Architecture §4).
- **Empty state:** Not applicable — only rendered on a message that produced at least one query.
- **Loading state:** Not applicable — data arrives with the message.
- **Error state:** Not applicable.

### SCR-014 — Graph View (reused)
Unchanged from `docs/03-ux-product-design.md`'s SCR-004 detail — same component, same states, now reached from a risk card's "View graph" button instead of SCR-003.

### SCR-015 — Body Diagram (Could)
- **Primary action:** None — passive visual aid alongside a message.
- **Key data shown:** A simplified body outline with the mapped region highlighted, plus the region's name as text (never relies on color alone, matching the existing WCAG 1.4.1 node-type-label precedent from V0.6).
- **Empty state:** Not rendered at all when no risk in the message maps to a seeded region — no placeholder shown.
- **Loading/Error state:** Not applicable — client-side-only mapping, no separate fetch.
