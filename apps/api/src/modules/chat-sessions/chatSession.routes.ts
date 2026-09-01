import { Router, Response } from "express";
import { v4 as uuid } from "uuid";
import { ChatStreamEvent } from "@disa/shared-types";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { requireAuth } from "../auth/auth.middleware.js";
import { allergyLinkRepository } from "../allergy-links/allergyLink.routes.js";
import { contraindicationRepository } from "../contraindications/contraindication.routes.js";
import { interactionRepository } from "../interactions/interaction.routes.js";
import { Neo4jPatientLookup } from "../explanations/infrastructure/neo4jPatientLookup.js";
import { Neo4jPatientRepository } from "../patients/infrastructure/neo4jPatientRepository.js";
import { Neo4jReferenceCatalog } from "../patients/infrastructure/neo4jReferenceCatalog.js";
import { queryLogRepository } from "../query-log/queryLog.routes.js";
import { Neo4jAssistantCatalog } from "../assistant/infrastructure/neo4jAssistantCatalog.js";
import { OpenAiLlmAdapter } from "../assistant/infrastructure/openAiLlmAdapter.js";
import { RunTurnDeps } from "../assistant/application/useCases.js";
import { EmptyMessageError, ForbiddenSessionAccessError, MessageNotFoundError, NotEditableMessageError, NothingToRegenerateError } from "./domain/chatSession.js";
import { ChatSessionNotFoundError } from "./domain/chatSession.js";
import {
  ChatSessionDeps,
  createSession,
  deleteSession,
  editMessage,
  getSession,
  listSessions,
  postMessage,
  regenerateLastMessage,
  renameSession,
  setSessionPinned,
  switchMessageBranch,
} from "./application/useCases.js";
import { Neo4jChatSessionRepository } from "./infrastructure/neo4jChatSessionRepository.js";
import { AssistantTurnAnswerer } from "./infrastructure/assistantTurnAnswerer.js";
import { LlmTitleGenerator } from "./infrastructure/llmTitleGenerator.js";
import { LlmHistorySummarizer } from "./infrastructure/llmHistorySummarizer.js";

const patientRepository = new Neo4jPatientRepository();
const referenceCatalog = new Neo4jReferenceCatalog();

const runTurnDeps: RunTurnDeps = {
  llm: new OpenAiLlmAdapter(),
  assistantCatalog: new Neo4jAssistantCatalog(),
  patients: patientRepository,
  patientCatalog: referenceCatalog,
  interactions: interactionRepository,
  allergyLinks: allergyLinkRepository,
  contraindications: contraindicationRepository,
  explanationPatients: new Neo4jPatientLookup(),
  queryLog: queryLogRepository,
  newId: () => uuid(),
  now: () => new Date().toISOString(),
};

const deps: ChatSessionDeps = {
  chatSessions: new Neo4jChatSessionRepository(),
  patients: patientRepository,
  catalog: referenceCatalog,
  turnAnswerer: new AssistantTurnAnswerer(runTurnDeps),
  titleGenerator: new LlmTitleGenerator(runTurnDeps.llm),
  historySummarizer: new LlmHistorySummarizer(runTurnDeps.llm),
  newId: () => uuid(),
  now: () => new Date().toISOString(),
};

export const chatSessionRouter = Router();
chatSessionRouter.use(requireAuth);

function userId(req: { user?: { sub: string } }): string {
  return req.user!.sub;
}

/**
 * Build Plan V2.2.0 — writes one NDJSON line per stream event. Response
 * headers/status are only committed on the FIRST write (`res.write` implies
 * `res.writeHead` at default 200 the first time it's called), which is what
 * lets everything before that point — validation, ownership checks — still
 * fail with a normal JSON error response exactly as it did before streaming
 * existed; see the two route handlers below.
 */
function writeEvent(res: Response, event: ChatStreamEvent): void {
  res.write(`${JSON.stringify(event)}\n`);
}

function handleOwnershipErrors(err: unknown, res: import("express").Response): boolean {
  if (err instanceof ChatSessionNotFoundError) {
    res.status(404).json({ error: { code: "CHAT_SESSION_NOT_FOUND", message: err.message } });
    return true;
  }
  if (err instanceof ForbiddenSessionAccessError) {
    res.status(403).json({ error: { code: "FORBIDDEN", message: err.message } });
    return true;
  }
  return false;
}

chatSessionRouter.post("/", asyncHandler(async (req, res) => {
  const session = await createSession(userId(req), deps);
  res.status(201).json({ id: session.id, title: session.title, createdAt: session.createdAt, updatedAt: session.updatedAt, pinned: session.pinned });
}));

chatSessionRouter.get("/", asyncHandler(async (req, res) => {
  const sessions = await listSessions(userId(req), deps);
  res.status(200).json(sessions.map((s) => ({ id: s.id, title: s.title, createdAt: s.createdAt, updatedAt: s.updatedAt, pinned: s.pinned })));
}));

/** Build Plan V2.3.4 — `?before=<createdAt>&limit=<n>` fetches an older page; omitting both preserves the original "load everything" behavior for every conversation that fits in one page. */
chatSessionRouter.get("/:id", asyncHandler(async (req, res) => {
  try {
    const before = typeof req.query.before === "string" ? req.query.before : undefined;
    const limitParam = typeof req.query.limit === "string" ? Number(req.query.limit) : undefined;
    const limit = limitParam !== undefined && Number.isFinite(limitParam) && limitParam > 0 ? limitParam : undefined;
    const session = await getSession(req.params.id, userId(req), deps, { before, limit });
    res.status(200).json({
      id: session.id,
      title: session.title,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      pinned: session.pinned,
      messages: session.messages,
      hasMoreMessages: session.hasMoreMessages,
    });
  } catch (err) {
    if (handleOwnershipErrors(err, res)) return;
    throw err;
  }
}));

/** Build Plan V2.3.3 — rename a session; reuses the same title sanitization the first-message-derived title already goes through. */
chatSessionRouter.patch("/:id", asyncHandler(async (req, res) => {
  const rawTitle = typeof req.body?.title === "string" ? req.body.title : "";
  try {
    const title = await renameSession(req.params.id, userId(req), rawTitle, deps);
    res.status(200).json({ id: req.params.id, title });
  } catch (err) {
    if (handleOwnershipErrors(err, res)) return;
    throw err;
  }
}));

/** Pins/unpins a session for the "Pinned" section of the sidebar. */
chatSessionRouter.patch("/:id/pin", asyncHandler(async (req, res) => {
  const pinned = req.body?.pinned === true;
  try {
    await setSessionPinned(req.params.id, userId(req), pinned, deps);
    res.status(200).json({ id: req.params.id, pinned });
  } catch (err) {
    if (handleOwnershipErrors(err, res)) return;
    throw err;
  }
}));

/**
 * Build Plan V2.2.0/V2.2.7 — streams the turn as NDJSON instead of a single
 * JSON reply. See the `res.on("close")` wiring below for why the abort
 * signal is keyed off the RESPONSE closing early, not the request.
 */
chatSessionRouter.post("/:id/messages", asyncHandler(async (req, res) => {
  const text = typeof req.body?.text === "string" ? req.body.text : "";
  const controller = new AbortController();
  // `req`'s own "close" fires as soon as Express finishes reading the request
  // body (before the handler even runs, since `express.json()` already
  // consumed it) — using it aborted every turn immediately. `res`'s "close"
  // only means an actual client disconnect when the response hasn't finished
  // writing yet; once `res.end()` has been called, `writableEnded` is true
  // and this is just the normal, harmless post-completion close.
  res.on("close", () => {
    if (!res.writableEnded) controller.abort();
  });

  let streamStarted = false;
  function startStream() {
    if (streamStarted) return;
    streamStarted = true;
    res.status(200);
    res.setHeader("Content-Type", "application/x-ndjson");
  }

  try {
    const result = await postMessage(req.params.id, userId(req), text, deps, {
      onUserMessage: (message) => {
        startStream();
        writeEvent(res, { type: "user_message", message });
      },
      onChunk: (delta) => {
        startStream();
        writeEvent(res, { type: "chunk", text: delta });
      },
      signal: controller.signal,
    });
    startStream(); // defensive — every real turn emits onUserMessage first, but never leave the response unstarted
    writeEvent(res, { type: "done", assistantMessage: result.assistantMessage });
    res.end();
  } catch (err) {
    if (!streamStarted) {
      if (handleOwnershipErrors(err, res)) return;
      if (err instanceof EmptyMessageError) {
        return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: err.message } });
      }
      throw err;
    }
    writeEvent(res, { type: "error", message: "Something went wrong while generating a response." });
    res.end();
  }
}));

chatSessionRouter.post("/:id/regenerate", asyncHandler(async (req, res) => {
  const controller = new AbortController();
  // `req`'s own "close" fires as soon as Express finishes reading the request
  // body (before the handler even runs, since `express.json()` already
  // consumed it) — using it aborted every turn immediately. `res`'s "close"
  // only means an actual client disconnect when the response hasn't finished
  // writing yet; once `res.end()` has been called, `writableEnded` is true
  // and this is just the normal, harmless post-completion close.
  res.on("close", () => {
    if (!res.writableEnded) controller.abort();
  });

  let streamStarted = false;
  function startStream() {
    if (streamStarted) return;
    streamStarted = true;
    res.status(200);
    res.setHeader("Content-Type", "application/x-ndjson");
  }

  try {
    const result = await regenerateLastMessage(req.params.id, userId(req), deps, {
      onChunk: (delta) => {
        startStream();
        writeEvent(res, { type: "chunk", text: delta });
      },
      signal: controller.signal,
    });
    startStream(); // a non-streamed answer (e.g. re-answering an intake question) never calls onChunk at all
    writeEvent(res, { type: "done", assistantMessage: result.assistantMessage });
    res.end();
  } catch (err) {
    if (!streamStarted) {
      if (handleOwnershipErrors(err, res)) return;
      if (err instanceof NothingToRegenerateError) {
        return res.status(409).json({ error: { code: "NOTHING_TO_REGENERATE", message: err.message } });
      }
      throw err;
    }
    writeEvent(res, { type: "error", message: "Something went wrong while regenerating a response." });
    res.end();
  }
}));

/**
 * Build Plan V2.6 — edits a user message; streams NDJSON exactly like
 * `POST /:id/messages`, since it goes through the same extraction/risk-check/
 * compose pipeline for a brand-new message, just one that starts a fresh
 * branch instead of appending to the end.
 */
chatSessionRouter.post("/:id/messages/:messageId/edit", asyncHandler(async (req, res) => {
  const text = typeof req.body?.text === "string" ? req.body.text : "";
  const controller = new AbortController();
  res.on("close", () => {
    if (!res.writableEnded) controller.abort();
  });

  let streamStarted = false;
  function startStream() {
    if (streamStarted) return;
    streamStarted = true;
    res.status(200);
    res.setHeader("Content-Type", "application/x-ndjson");
  }

  try {
    const result = await editMessage(req.params.id, userId(req), req.params.messageId, text, deps, {
      onUserMessage: (message) => {
        startStream();
        writeEvent(res, { type: "user_message", message });
      },
      onChunk: (delta) => {
        startStream();
        writeEvent(res, { type: "chunk", text: delta });
      },
      signal: controller.signal,
    });
    startStream();
    writeEvent(res, { type: "done", assistantMessage: result.assistantMessage });
    res.end();
  } catch (err) {
    if (!streamStarted) {
      if (handleOwnershipErrors(err, res)) return;
      if (err instanceof EmptyMessageError) {
        return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: err.message } });
      }
      if (err instanceof MessageNotFoundError) {
        return res.status(404).json({ error: { code: "MESSAGE_NOT_FOUND", message: err.message } });
      }
      if (err instanceof NotEditableMessageError) {
        return res.status(400).json({ error: { code: "NOT_EDITABLE", message: err.message } });
      }
      throw err;
    }
    writeEvent(res, { type: "error", message: "Something went wrong while generating a response." });
    res.end();
  }
}));

/** Build Plan V2.6 — the "< 2/2 >" branch navigation; flips which sibling is active and returns the resulting transcript in one call so the client can replace its messages directly. */
chatSessionRouter.patch("/:id/messages/:messageId/activate", asyncHandler(async (req, res) => {
  try {
    const session = await switchMessageBranch(req.params.id, userId(req), req.params.messageId, deps);
    res.status(200).json({
      id: session.id,
      title: session.title,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      pinned: session.pinned,
      messages: session.messages,
      hasMoreMessages: session.hasMoreMessages,
    });
  } catch (err) {
    if (handleOwnershipErrors(err, res)) return;
    if (err instanceof MessageNotFoundError) {
      return res.status(404).json({ error: { code: "MESSAGE_NOT_FOUND", message: err.message } });
    }
    throw err;
  }
}));

chatSessionRouter.delete("/:id", asyncHandler(async (req, res) => {
  try {
    await deleteSession(req.params.id, userId(req), deps);
    res.status(200).json({ id: req.params.id, deletedAt: new Date().toISOString() });
  } catch (err) {
    if (handleOwnershipErrors(err, res)) return;
    throw err;
  }
}));
