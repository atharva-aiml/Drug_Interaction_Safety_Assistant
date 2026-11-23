import type {
  AuthResponse,
  ChatMessage,
  ChatSession,
  ChatSessionSummary,
  ChatStreamEvent,
  LoginRequest,
  PinSessionResponse,
  RegisterRequest,
  RenameSessionResponse,
  RiskDetail,
} from "@disa/shared-types";
import { parseNdjsonChunk } from "./chat/ndjsonStream";

const API_BASE = "http://localhost:4000/api/v1";

class ApiError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
  }
}

async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const body = await res.json();
  if (!res.ok) {
    throw new ApiError(res.status, body?.error?.message ?? "Request failed", body?.error?.code);
  }
  return body as T;
}

export function register(input: RegisterRequest) {
  return request<{ username: string }>("/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function login(input: LoginRequest) {
  return request<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/**
 * Used by `graph/apiRiskDetailFetcher.ts`, wired to the chat transcript's
 * "View graph" button (Build Plan V2.4.0). `patientId` is optional: a chat
 * session's risks aren't tied to a stored patient profile, so the path
 * still resolves without it — just without the `Patient` node/`TAKES`
 * edges (`explanations`'s path-building degrades gracefully, see its
 * `findById` use case).
 */
export function getRiskDetail(riskId: string, patientId: string | undefined, token: string) {
  const query = patientId ? `?patientId=${encodeURIComponent(patientId)}` : "";
  return request<RiskDetail>(`/risks/${riskId}${query}`, {}, token);
}

export function createChatSession(token: string) {
  return request<ChatSessionSummary>("/chat-sessions", { method: "POST" }, token);
}

export function listChatSessions(token: string) {
  return request<ChatSessionSummary[]>("/chat-sessions", {}, token);
}

/** `before`/`limit` (Build Plan V2.3.4) fetch an older page — omitting both loads the whole conversation, exactly as before pagination existed. */
export function getChatSession(id: string, token: string, page: { before?: string; limit?: number } = {}) {
  const params = new URLSearchParams();
  if (page.before) params.set("before", page.before);
  if (page.limit) params.set("limit", String(page.limit));
  const query = params.toString();
  return request<ChatSession>(`/chat-sessions/${id}${query ? `?${query}` : ""}`, {}, token);
}

export function renameChatSession(id: string, title: string, token: string) {
  return request<RenameSessionResponse>(`/chat-sessions/${id}`, { method: "PATCH", body: JSON.stringify({ title }) }, token);
}

export function pinChatSession(id: string, pinned: boolean, token: string) {
  return request<PinSessionResponse>(`/chat-sessions/${id}/pin`, { method: "PATCH", body: JSON.stringify({ pinned }) }, token);
}

/**
 * Uploads a digital prescription (PDF) for parsing. Returns the medication
 * names found plus a ready-to-send chat sentence — the caller hands
 * `message` to `postChatMessageStream` exactly like a typed message or the
 * structured form's `buildStructuredMessage`, so the SAME grounded
 * Cypher/Groq pipeline produces the answer (see prescription.routes.ts).
 * Uses `fetch` directly rather than `request()` since this is a
 * multipart/form-data upload, not JSON.
 */
export async function parsePrescription(file: File, token: string) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_BASE}/prescription/parse`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  const body = await res.json();
  if (!res.ok) {
    throw new ApiError(res.status, body?.error?.message ?? "Failed to parse the prescription.", body?.error?.code);
  }
  return body as { medications: string[]; message: string };
}

export interface ChatStreamHandlers {
  onUserMessage?: (message: ChatMessage) => void;
  onChunk?: (text: string) => void;
  onDone: (assistantMessage: ChatMessage) => void | Promise<void>;
  onError?: (message: string) => void;
}

export function checkRisk(
  input: {
    medications: string[];
    allergies: string[];
    conditions: string[];
  },
  token: string
) {
  return request<{ risks: any[] }>("/risk-check", {
    method: "POST",
    body: JSON.stringify(input),
  }, token);
}
/**
 * Build Plan V2.2.0/V2.2.7 — reads the NDJSON event stream both
 * `/messages` and `/regenerate` now send instead of a single JSON reply.
 * `signal` lets the caller stop generation client-side (aborts the fetch,
 * which the server sees as the request closing and uses to abort its own
 * upstream OpenAI call — see the API's route handlers).
 */
async function streamChatEndpoint(path: string, token: string, body: unknown, signal: AbortSignal | undefined, handlers: ChatStreamHandlers): Promise<void> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => undefined);
    throw new ApiError(res.status, errBody?.error?.message ?? "Request failed", errBody?.error?.code);
  }
  if (!res.body) {
    throw new Error("This browser does not support streaming responses.");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (; ;) {
    const { done, value } = await reader.read();
    if (done) break;
    const parsed = parseNdjsonChunk(buffer, decoder.decode(value, { stream: true }));
    buffer = parsed.remainder;
    for (const raw of parsed.events) {
      const event = raw as ChatStreamEvent;
      if (event.type === "user_message") handlers.onUserMessage?.(event.message);
      else if (event.type === "chunk") handlers.onChunk?.(event.text);
      else if (event.type === "done") await handlers.onDone(event.assistantMessage);
      else if (event.type === "error") handlers.onError?.(event.message);
    }
  }
}

export function postChatMessageStream(id: string, text: string, token: string, signal: AbortSignal | undefined, handlers: ChatStreamHandlers) {
  return streamChatEndpoint(`/chat-sessions/${id}/messages`, token, { text }, signal, handlers);
}

export function regenerateChatMessageStream(id: string, token: string, signal: AbortSignal | undefined, handlers: ChatStreamHandlers) {
  return streamChatEndpoint(`/chat-sessions/${id}/regenerate`, token, undefined, signal, handlers);
}

/** Build Plan V2.6 — edits a user message; the original and everything under it are preserved as a switchable branch, never deleted. Streams NDJSON exactly like `postChatMessageStream`. */
export function editChatMessageStream(
  id: string,
  messageId: string,
  text: string,
  token: string,
  signal: AbortSignal | undefined,
  handlers: ChatStreamHandlers
) {
  return streamChatEndpoint(`/chat-sessions/${id}/messages/${messageId}/edit`, token, { text }, signal, handlers);
}

/** Build Plan V2.6 — the "< 2/2 >" branch navigation; returns the resulting transcript directly so the caller can replace its message list from the response alone. */
export function switchMessageBranch(id: string, messageId: string, token: string) {
  return request<ChatSession>(`/chat-sessions/${id}/messages/${messageId}/activate`, { method: "PATCH" }, token);
}

export function deleteChatSession(id: string, token: string) {
  return request<{ id: string; deletedAt: string }>(`/chat-sessions/${id}`, { method: "DELETE" }, token);
}

export { ApiError };
