export interface Drug {
  id: string;
  name: string;
  genericName: string;
  drugClass: string;
  dosageForm: string;
  deletedAt?: string;
}

export interface CreateDrugRequest {
  name: string;
  genericName: string;
  drugClass: string;
  dosageForm: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  expiresAt: string;
  role: "standard" | "admin";
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
    /** Present only for unhandled (500) errors — trace a user-reported failure in server logs without exposing internals. */
    correlationId?: string;
  };
}

export interface Allergen {
  id: string;
  name: string;
}

export interface CreateAllergenRequest {
  name: string;
}

export interface Disease {
  id: string;
  name: string;
  icdCode?: string;
}

export interface CreateDiseaseRequest {
  name: string;
  icdCode?: string;
}

export interface PatientProfileFields {
  displayName: string;
  medicationIds: string[];
  allergyIds: string[];
  conditionIds: string[];
}

export interface Patient extends PatientProfileFields {
  id: string;
  createdAt: string;
  deletedAt?: string;
}

export interface PatientSummary {
  id: string;
  displayName: string;
  medicationCount: number;
  deletedAt?: string;
}

export type CreatePatientRequest = PatientProfileFields;

export interface UpdatePatientRequest {
  displayName?: string;
  medicationIds?: string[];
  allergyIds?: string[];
  conditionIds?: string[];
}

export type Severity = "minor" | "moderate" | "severe" | "contraindicated";

export const SEVERITIES: Severity[] = ["minor", "moderate", "severe", "contraindicated"];

export interface DrugInteraction {
  id: string;
  drugA: { id: string; name: string };
  drugB: { id: string; name: string };
  severity: Severity;
  /** Optional demo-data enrichment (Build Plan V2.0 addendum) — the specific physiological risk and mitigation tip for this pair, authored in the import CSV. */
  riskDescription?: string;
  tip?: string;
}

export interface CreateInteractionRequest {
  drugAId: string;
  drugBId: string;
  severity: Severity;
  riskDescription?: string;
  tip?: string;
}

export type RiskType = "interaction" | "allergy" | "contraindication";

export interface Risk {
  id: string;
  type: RiskType;
  severity: Severity;
  drugsInvolved: { id: string; name: string }[];
  summary: string;
  /**
   * REQ-030 — the literal Cypher query template used to retrieve this risk
   * from the graph (parameter placeholders, not bound values). Optional so
   * risks persisted before this field existed still parse.
   */
  cypher?: CypherQueryView;
}

export interface RiskCheckRequest {
  patientId?: string;
  medications?: string[];
  allergies?: string[];
  conditions?: string[];
}

export interface RiskCheckResponse {
  risks: Risk[];
  checkedAt: string;
}

export interface AllergyLink {
  id: string;
  drug: { id: string; name: string };
  allergen: { id: string; name: string };
  severity: Severity;
}

export interface CreateAllergyLinkRequest {
  drugId: string;
  allergenId: string;
  severity: Severity;
}

export interface ContraindicationLink {
  id: string;
  drug: { id: string; name: string };
  disease: { id: string; name: string };
  severity: Severity;
}

export interface CreateContraindicationLinkRequest {
  drugId: string;
  diseaseId: string;
  severity: Severity;
}

export type PathNodeLabel = "Drug" | "Patient" | "Allergen" | "Disease";

export interface PathNode {
  id: string;
  label: PathNodeLabel;
  name: string;
}

export type PathEdgeType = "INTERACTS_WITH" | "CONTAINS_ALLERGEN" | "CONTRAINDICATED_FOR" | "HAS_ALLERGY" | "HAS_CONDITION" | "TAKES";

export interface PathEdge {
  type: PathEdgeType;
  fromId: string;
  toId: string;
  severity?: Severity;
}

export interface RiskPath {
  nodes: PathNode[];
  edges: PathEdge[];
}

export interface RiskDetail {
  id: string;
  type: RiskType;
  severity: Severity;
  explanation: string;
  path: RiskPath;
}

export type QueryType = "patient_check" | "ad_hoc" | "incremental" | "chat";

export interface QueryInputSummary {
  patientId?: string;
  medicationIds?: string[];
  allergyIds?: string[];
  conditionIds?: string[];
  newDrugId?: string;
}

export type SeverityTally = Record<Severity, number>;

export interface QueryResultSummary {
  status: "success" | "failed";
  totalRisks: number;
  bySeverity: SeverityTally;
  errorMessage?: string;
  /** Full original result — present when status is "success" — so a logged query can be reopened read-only without re-running the traversal. */
  risks?: Risk[];
}

export interface QueryLogEntry {
  id: string;
  queryType: QueryType;
  patientId?: string;
  inputSummary: QueryInputSummary;
  resultSummary: QueryResultSummary;
  createdAt: string;
}

/** Only "drug" is implemented (Build Plan V0.10) — the type is kept open for future entity types. */
export type ImportEntityType = "drug";

export type ImportJobStatus = "queued" | "validating" | "importing" | "complete" | "failed";

export interface ImportRowError {
  rowNumber: number;
  reason: string;
}

export interface ImportJob {
  id: string;
  entityType: ImportEntityType;
  status: ImportJobStatus;
  acceptedCount: number;
  rejectedCount: number;
  errors: ImportRowError[];
  createdAt: string;
  updatedAt: string;
}

export interface StartImportResponse {
  jobId: string;
  status: ImportJobStatus;
}

export interface ChatSessionSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  pinned: boolean;
}

export type ChatMessageRole = "user" | "assistant";

export interface CypherQueryView {
  label: string;
  query: string;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: ChatMessageRole;
  text: string;
  createdAt: string;
  /** Present only on assistant messages that ran a risk check. */
  risks?: Risk[];
  cypherQueries?: CypherQueryView[];
  tips?: string[];
  unresolvedNames?: string[];
  /** True when this message's raw text matched a deterministic emergency-symptom pattern (improvements.md #1.1, Build Plan V2.1.1) — never LLM-judged. */
  isEmergency?: boolean;
  emergencyCategory?: string;
  /** "grounded" = a real risk check ran (even if it found nothing); "general" = general-knowledge chat, nothing personal was checked (improvements.md #1.6, Build Plan V2.1.3). Absent for non-conclusion turns (intake/clarification questions, unresolved-name notices, errors). */
  answerSource?: "grounded" | "general";
  /** Build Plan V2.6 — the message this one follows on its branch; absent for a session's root message(s). Forms a tree, not a flat list, once a message has been edited. */
  parentId?: string;
  /** Present only when this message has sibling versions (i.e. it or a sibling was edited) — 1-based position of THIS message among them, oldest first. Absent otherwise (never shown as "1/1"). */
  editIndex?: number;
  /** Total sibling count, alongside `editIndex`. */
  editCount?: number;
  /** All sibling ids (this message included), oldest to newest, for prev/next branch navigation. */
  siblingIds?: string[];
}

export interface ChatSession extends ChatSessionSummary {
  messages: ChatMessage[];
  /** True when older messages exist beyond this page (Build Plan V2.3.4). */
  hasMoreMessages: boolean;
}

export interface PostChatMessageRequest {
  text: string;
}

/** Build Plan V2.6 — edits an existing user message; the edited message's siblings (including the original) are preserved as switchable branches, never deleted. */
export interface EditChatMessageRequest {
  text: string;
}

export interface RenameSessionRequest {
  title: string;
}

export interface RenameSessionResponse {
  id: string;
  title: string;
}

export interface PinSessionResponse {
  id: string;
  pinned: boolean;
}

export interface PostQuickCheckRequest {
  medicationIds: string[];
  allergyIds: string[];
  conditionIds: string[];
}

export interface PostChatMessageResponse {
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
}

export interface RegenerateMessageResponse {
  assistantMessage: ChatMessage;
}

/**
 * Build Plan V2.2.0 — the NDJSON event stream `POST /chat-sessions/:id/messages`
 * and `POST /chat-sessions/:id/regenerate` write, one JSON object per line.
 * `user_message` (messages endpoint only) fires as soon as the user's own
 * message is persisted; `chunk` fires per text delta as the answer is
 * composed (a non-streamed answer — an intake question, an emergency
 * response, etc. — arrives as a single chunk); `done` carries the final,
 * fully-persisted assistant message — always the source of truth over
 * whatever text `chunk` events assembled, since a stopped/failed generation
 * (Build Plan V2.2.7) falls back to a different, complete answer rather than
 * persisting a truncated one.
 */
export type ChatStreamEvent =
  | { type: "user_message"; message: ChatMessage }
  | { type: "chunk"; text: string }
  | { type: "done"; assistantMessage: ChatMessage }
  | { type: "error"; message: string };
