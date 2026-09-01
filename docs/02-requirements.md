# Requirements — Drug Interaction Safety Assistant

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
| REQ-011 | System shall render an explanation of each flagged risk in natural language, derived only from the traversed path. |
| REQ-012 | System shall provide an API endpoint to query risks for a given patient or drug set. |
| REQ-013 | System shall provide a UI to submit a patient's medication list and view flagged risks. |
| REQ-014 | System shall provide a graph visualization of a query result (nodes/edges involved in a flagged risk). |

### Should

| ID | Requirement |
|----|-------------|
| REQ-015 | System should allow filtering/sorting flagged risks by severity. |
| REQ-016 | System should support adding a candidate drug to an existing patient profile and re-checking risks incrementally, without re-submitting the whole profile. |
| REQ-017 | System should support multi-hop queries beyond direct pairs (e.g., shared side-effect pathways between otherwise unrelated drugs) for research/demo purposes. |
| REQ-018 | System should log each risk query (input + result, synthetic data only, no PII) for later review/demo purposes. |
| REQ-027 | System should support soft-deleting a patient or drug record — removing it from active lists without destroying its existing graph relationships or historical query-log references — and provide a filterable view of deleted records. |

### Could

| ID | Requirement |
|----|-------------|
| REQ-019 | Could support bulk import of a dataset (CSV/JSON of drugs, interactions, etc.) via an admin-facing import tool. |
| REQ-020 | Could support exporting a flagged-risk report as PDF/JSON. |
| REQ-021 | Could support a side-by-side view comparing the graph query against its equivalent relational-join query, for demonstration purposes. |

### Won't (this version)

| ID | Requirement |
|----|-------------|
| REQ-022 | Will not perform actual clinical diagnosis. |
| REQ-023 | Will not autonomously generate or transmit prescriptions. |
| REQ-024 | Will not integrate with real-time hospital/EHR systems. |
| REQ-025 | Will not support regulatory/clinical approval workflows (e.g., FDA submission tracking). |
| REQ-026 | Will not store real patient-identifiable data. |

## 2. Non-Functional Requirements

| ID | Category | Requirement | Measurable Target |
|----|----------|-------------|--------------------|
| NFR-001 | Performance | Risk-check query response time | p95 ≤ 2s for a patient profile with up to 20 medications, against a seeded dataset of ≥5,000 drug nodes and ≥50,000 relationship edges. |
| NFR-002 | Performance | Graph visualization render time | Result subgraph of up to 50 nodes renders in the UI in ≤1s. |
| NFR-003 | Security | No real patient data | 0 records containing recognizable real-PII patterns (e.g., SSNs, real-name+real-MRN pairs) pass ingestion validation — enforced by a rejecting validator, tested against a fixture of known-bad records. |
| NFR-004 | Security | API authentication | 100% of API endpoints reject unauthenticated requests with 401; verified by an automated test hitting every endpoint without credentials. |
| NFR-005 | Scalability | Graph size headroom | Graph store supports ≥50,000 drug nodes and ≥500,000 relationship edges without schema redesign, verified by a load test at that volume. |
| NFR-006 | Availability | Demo/evaluation uptime | ≥99% uptime measured monthly during active demo/evaluation periods; no 24/7 clinical SLA implied. |

## 3. Business Rules

- A drug–drug interaction relationship must always carry a severity level (e.g., minor / moderate / severe / contraindicated); it cannot be created without one.
- A patient medication profile must not reference a drug that does not exist as a node in the graph.
- A flagged risk must always be traceable to an explicit path of at least one relationship edge — no risk may be surfaced without a supporting path (REQ-010).
- An allergy relationship must link a drug to a specific allergen/ingredient node, never to a free-text drug-name string.
- A contraindication relationship must reference a specific disease/condition node, never a free-text diagnosis field.
- A natural-language risk explanation may only assert relationships that are backed by an edge present in the traversed path (REQ-011) — no explanation may state a relationship the graph did not return.
- Synthetic patient data must never contain values structurally consistent with real identifiers (SSNs, real MRNs, etc.); this is enforced at ingestion, not left to downstream filtering.
- Deleting a patient or drug is a soft delete: it removes the record from active lists but never removes the underlying graph node or its existing relationships — historical query-log entries and other patients' existing medication references must continue to resolve correctly after the referenced drug or patient is deleted. A deleted drug cannot be added to a new or updated patient profile.

## 4. Non-Goals (this version)

- Real-time integration with hospital/EHR systems.
- Autonomous prescription generation or transmission.
- Clinical diagnosis functionality.
- Regulatory/compliance certification (e.g., HIPAA certification, FDA clearance).
- Multi-user role-based access control or clinical workflow permissions beyond basic API authentication.
- Native mobile applications — web UI only.
- Multi-language natural-language explanations — English only.
- Historical longitudinal analytics or population-level trend analysis — single-query risk checks only.

## 5. Acceptance Criteria

| Requirement | Acceptance Criteria |
|-------------|----------------------|
| REQ-001 | Given a drug record with name, generic name, drug class, and dosage form, when it is loaded into the graph, then a queryable drug node is created with all four attributes retrievable. |
| REQ-002 | Given a patient profile with medications, allergies, and conditions, when it is loaded, then a patient node exists with edges to each referenced drug, allergy, and condition node. |
| REQ-003 | Given two drugs with a known interaction, when the interaction is loaded, then a relationship edge exists between them carrying a non-null severity value. |
| REQ-004 | Given a drug contraindicated for a disease, when loaded, then a relationship edge exists between the drug node and the disease node. |
| REQ-005 | Given a drug containing an allergen, when loaded, then a relationship edge exists between the drug node and the allergen/ingredient node. |
| REQ-006 | Given a drug with a documented side effect, when loaded, then a relationship edge exists between the drug node and the side-effect node. |
| REQ-007 | Given a patient with ≥2 medications that have a known interaction, when a risk query is run for that patient, then the interaction is returned in the result set. |
| REQ-008 | Given a patient with a recorded allergy and a candidate drug containing that allergen, when a risk query is run, then an allergy conflict is returned. |
| REQ-009 | Given a patient with a recorded condition and a candidate drug contraindicated for it, when a risk query is run, then a contraindication conflict is returned. |
| REQ-010 | Given any flagged risk in a query result, when the result is inspected, then it includes the ordered list of nodes and edge types traversed to produce it. |
| REQ-011 | Given any flagged risk, when its explanation is generated, then every entity and relationship named in the explanation text also appears in the risk's traversed path. |
| REQ-012 | Given a valid API request with a patient ID or drug set, when submitted to the risk-query endpoint, then a JSON response with all flagged risks is returned with HTTP 200. |
| REQ-013 | Given a user submits a medication list through the UI, when the query completes, then flagged risks are displayed on screen without requiring a page reload or manual API call. |
| REQ-014 | Given a query result containing at least one flagged risk, when the user requests the graph view, then the involved nodes and edges are rendered visually with distinguishable node types. |
| REQ-027 | Given a patient or drug is deleted, when the active list is viewed, then the record no longer appears there; when the Deleted view is opened, then the record appears there instead, and any other patient's existing reference to a deleted drug still resolves correctly. |
