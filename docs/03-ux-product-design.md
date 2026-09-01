# UX & Product Design — Drug Interaction Safety Assistant

## 1. Screen Inventory

| ID | Name | Purpose |
|----|------|---------|
| SCR-001 | Patient & Query Start | Choose an existing synthetic patient or build an ad-hoc medication list, then launch a risk query. |
| SCR-002 | Risk Results Dashboard | Show all flagged risks for the current query, filterable/sortable by severity. |
| SCR-003 | Risk Detail Panel | Show the natural-language explanation and full relationship path for one selected risk. |
| SCR-004 | Graph Visualization View | Render the nodes/edges of a risk's traversed path (or a broader exploration) as an interactive graph. |
| SCR-005 | Patient Profile Editor | Create or edit a patient's medications, allergies, and conditions; add a candidate drug and trigger an incremental recheck. |
| SCR-006 | Multi-hop Explorer | Free-form graph query console for research/demo use, including an optional graph-vs-relational comparison view. |
| SCR-007 | Query History Log | List past risk queries (input + result) for review or demonstration purposes. |
| SCR-008 | Data Import (Admin) | Bulk-load a drug/interaction/patient dataset (CSV/JSON) into the graph. |
| SCR-009 | Deleted Items | Browse soft-deleted patients and drugs, filterable by type, reached from the dashboard nav (REQ-027). |

## 2. Navigation / Information Architecture

**Rule:** a screen gets a top-level navigation entry only if a user would want to *start there independently*, on its own, without having just come from another screen's output. A screen that only exists to show more detail about, or act on, data produced by another screen is reached contextually and has no nav entry — surfacing it in the nav would let a user land on it with nothing to act on.

Applying that rule:

- **Top-level nav** (independent starting points): SCR-001 (Patient & Query Start), SCR-006 (Multi-hop Explorer), SCR-007 (Query History Log), SCR-008 (Data Import — visible only to admin-role users), SCR-009 (Deleted Items).
- **Contextual only** (require prior state from another screen):
  - SCR-002 (Risk Results Dashboard) — only meaningful after a query is launched from SCR-001 or a recheck is triggered from SCR-005.
  - SCR-003 (Risk Detail Panel) — only reached by selecting a specific risk row inside SCR-002.
  - SCR-004 (Graph Visualization View) — only reached from SCR-003 ("view path as graph") or from SCR-006 (exploration results); it always needs a result set to render.
  - SCR-005 (Patient Profile Editor) — reached from SCR-001 ("edit/create patient") or from SCR-002 ("add candidate drug"); editing a profile with no query context in progress has no use case in this product.

## 3. User Journeys

**Journey 1 — Pharmacist checks a patient's full medication list**
1. User opens SCR-001, selects an existing synthetic patient from a list.
2. User clicks "Check for risks"; system runs the query and navigates to SCR-002.
3. User sees a severity-sorted list of flagged risks (interactions, allergy conflicts, contraindications).
4. User clicks a risk row, sees SCR-003 with the plain-language explanation and the relationship path.
5. User clicks "View as graph," sees SCR-004 rendering the same path visually.

**Journey 2 — Doctor adds a candidate drug to an existing patient and rechecks**
1. User opens SCR-001, selects an existing patient, and instead of running the check immediately clicks "Edit profile."
2. User is taken to SCR-005, adds a new candidate medication to the list.
3. User clicks "Recheck risks"; system re-runs only the affected traversals and navigates to SCR-002.
4. User sees the updated risk list, with any newly introduced risk visually marked as new relative to the prior check.

**Journey 3 — Researcher explores a multi-hop relationship**
1. User opens SCR-006 from top-level nav.
2. User builds a query (e.g., "drugs sharing a side effect with Drug X, 3 hops").
3. User runs the query and sees a result list plus an optional toggle to view the equivalent relational-join query alongside it.
4. User clicks "View as graph," sees SCR-004 rendering the multi-hop path.

**Journey 4 — Clinical decision-support team reviews past queries for QA/demo**
1. User opens SCR-007 from top-level nav.
2. User sees a chronological list of past queries (input summary + result summary, no PII since only synthetic data exists).
3. User clicks a past entry to re-open it read-only in SCR-002.

**Journey 5 — Admin loads a new dataset**
1. User opens SCR-008 from top-level nav (only visible with admin role).
2. User uploads a CSV/JSON file and selects the target entity type (drugs, interactions, patients, etc.).
3. System validates the file (schema check, PII-pattern rejection per NFR-003) and shows a preview of records to be added.
4. User confirms; system imports and shows a success summary with counts, or an error summary with rejected-row reasons.

## 4. Per-Screen Detail

### SCR-001 — Patient & Query Start
- **Primary action:** Select a patient (from a searchable list) or start a blank ad-hoc medication list, then "Check for risks."
- **Key data shown:** List of existing synthetic patients (name/ID, medication count, last-checked date); ad-hoc entry form (drug search/add field, allergy field, condition field).
- **Empty state:** No patients loaded yet — show a message directing the user to SCR-008 (admin) or to start an ad-hoc list.
- **Loading state:** Patient list shows skeleton rows while fetching.
- **Error state:** If the patient list fails to load, show a retry banner; the ad-hoc entry path remains usable regardless.

### SCR-002 — Risk Results Dashboard
- **Primary action:** Review flagged risks; select one to open SCR-003; optionally filter/sort by severity or jump to SCR-005 to add a drug and recheck.
- **Key data shown:** Risk list (drug(s) involved, risk type — interaction/allergy/contraindication, severity badge, one-line summary); severity filter control; sort control; count of risks by severity at the top.
- **Empty state:** "No risks found for this medication list" with the checked drug list shown for confirmation — distinguished visually from a loading or error state so it reads as a genuine (positive) result, not a stall.
- **Loading state:** Query in progress — show a progress indicator with the traversal step if available (e.g., "checking interactions… checking allergies…").
- **Error state:** Query failure (e.g., referenced drug not found in graph) shows the specific failing input and a link back to SCR-001/SCR-005 to correct it.

### SCR-003 — Risk Detail Panel
- **Primary action:** Read the explanation; click "View as graph" to open SCR-004.
- **Key data shown:** Natural-language explanation sentence(s); ordered relationship path (node names and edge/relationship types); severity; source data references for the specific edges involved.
- **Empty state:** Not applicable — only opened from an existing risk, so a path always exists.
- **Loading state:** Brief spinner while the explanation/path is fetched, if not pre-loaded with the dashboard.
- **Error state:** If path data fails to load, show the risk summary alone with a "path unavailable, retry" notice — never fabricate an explanation without a path (per REQ-011 / business rules).

### SCR-004 — Graph Visualization View
- **Primary action:** Explore the rendered subgraph (pan/zoom, click a node for its attributes).
- **Key data shown:** Nodes (patient, drugs, diseases, allergens, side effects) visually distinguished by type/color, edges labeled with relationship type and severity where applicable.
- **Empty state:** Not applicable — always entered with a non-empty result set from SCR-003 or SCR-006.
- **Loading state:** Graph layout is computing — show a spinner over a blank canvas.
- **Error state:** If rendering fails (e.g., malformed path data), fall back to a plain list of nodes/edges with a notice that visual rendering failed.

### SCR-005 — Patient Profile Editor
- **Primary action:** Add/remove a medication, allergy, or condition; save and trigger a recheck.
- **Key data shown:** Current medication list, allergy list, condition list, each editable inline; validation state per entry (e.g., "drug not found in graph").
- **Empty state:** New/blank patient — all three lists empty with prompts to add the first entry.
- **Loading state:** Drug/condition/allergy autocomplete shows a spinner while querying the graph for matches.
- **Error state:** Entry not found in graph (violates the business rule that a profile cannot reference a nonexistent drug) — entry is rejected inline with a clear message before save is allowed.

### SCR-006 — Multi-hop Explorer
- **Primary action:** Construct and run a multi-hop query (starting entity, relationship types to traverse, hop limit); optionally toggle the relational-join comparison view.
- **Key data shown:** Query builder controls; result list of matched paths; optional side-by-side panel with the equivalent relational-join query and its (documented, not live-run) complexity for comparison.
- **Empty state:** No query run yet — show query builder with a short example query pre-filled as a hint.
- **Loading state:** Query running indicator, since multi-hop traversals may take longer than direct risk checks.
- **Error state:** Query exceeds configured hop/complexity limits — show a clear message with the limit and a suggestion to narrow the query.

### SCR-007 — Query History Log
- **Primary action:** Browse past queries; click one to reopen it read-only in SCR-002.
- **Key data shown:** Timestamp, query type (patient check / ad-hoc / multi-hop), input summary, result summary (risk count by severity, or match count).
- **Empty state:** "No queries logged yet" with a link to SCR-001.
- **Loading state:** Skeleton rows while the log loads.
- **Error state:** Log fetch failure shows a retry banner; does not block other navigation.

### SCR-008 — Data Import (Admin)
- **Primary action:** Upload a dataset file, review the validation preview, confirm import.
- **Key data shown:** File picker, target entity type selector, preview table of parsed records, validation results (accepted count, rejected count with reasons).
- **Empty state:** No file selected yet — upload control shown alone with accepted format/schema hints.
- **Loading state:** "Validating…" while the file is parsed and checked, then "Importing…" during the write phase.
- **Error state:** Validation failure shows the rejected rows with specific reasons (e.g., schema mismatch, PII-pattern match per NFR-003); import is blocked until the user re-uploads a corrected file or excludes the bad rows.

### SCR-009 — Deleted Items
- **Primary action:** Browse deleted patients and drugs; filter by type (All / Patients / Drugs).
- **Key data shown:** Record name, entity type, deletion timestamp.
- **Empty state:** "Nothing deleted yet."
- **Loading state:** Skeleton/loading panel while both deleted lists load.
- **Error state:** Fetch failure shows a retry banner.
