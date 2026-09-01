import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import type {
  AuthResponse,
  ChatMessage,
  ChatSessionSummary,
  Risk,
} from "@disa/shared-types";
import * as api from "../api";
import { shouldAutoScroll } from "../chat/autoScroll";
import { ChatSidebar } from "./ChatSidebar";
import { ChatComposer } from "./ChatComposer";
import { StructuredInputForm } from "./StructuredInputForm";
import { MessageBubble } from "./MessageBubble";
import { ActiveRiskRail } from "./ActiveRiskRail";
import { IconShield } from "./icons";

interface Props {
  token: string;
  username: string;
  role: AuthResponse["role"];
  onLogout: () => void;
}

/**
 * Busy indicator shown while the assistant is generating a response.
 */
function TypingIndicator() {
  return (
    <div className="chat-message chat-message-assistant">
      <div
        className="chat-message-typing"
        aria-label="Assistant is typing"
      >
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="typing-dot" />
      </div>
    </div>
  );
}

/**
 * Displays the assistant response while it is being streamed.
 */
function StreamingBubble({ text }: { text: string }) {
  return (
    <div className="chat-message chat-message-assistant">
      <div className="chat-message-assistant-body chat-message-markdown">
        {text ? <ReactMarkdown>{text}</ReactMarkdown> : null}
      </div>
    </div>
  );
}

export function ChatPage({
  token,
  username,
  role,
  onLogout,
}: Props) {
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [sending, setSending] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const [editingTargetId, setEditingTargetId] =
    useState<string | null>(null);

  const [editingPendingUserMessage, setEditingPendingUserMessage] =
    useState<ChatMessage | null>(null);

  const [streamingText, setStreamingText] =
    useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [uploadingPrescription, setUploadingPrescription] = useState(false);

  const transcriptRef = useRef<HTMLDivElement>(null);

  const abortControllerRef =
    useRef<AbortController | null>(null);

  const isNearBottomRef = useRef(true);

  const scrollHideTimeoutRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  function refreshSessions(
    opts: { silent: boolean } = { silent: false }
  ): Promise<ChatSessionSummary[]> {
    if (!opts.silent) {
      setSessionsLoading(true);
    }

    return api
      .listChatSessions(token)
      .then((list) => {
        setSessions(list);
        return list;
      })
      .catch((err) => {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load sessions."
        );

        return [];
      })
      .finally(() => {
        if (!opts.silent) {
          setSessionsLoading(false);
        }
      });
  }

  useEffect(() => {
    refreshSessions().then((list) => {
      if (list.length > 0) {
        setActiveId(list[0].id);
      }
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function loadMessages(
    sessionId: string,
    opts: { showSpinner: boolean }
  ): Promise<void> {
    if (opts.showSpinner) {
      setMessagesLoading(true);
    }

    setError(null);

    return api
      .getChatSession(sessionId, token)
      .then((session) => {
        setMessages(session.messages);
        setHasMoreMessages(session.hasMoreMessages);
      })
      .catch((err) => {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load conversation."
        );
      })
      .finally(() => {
        if (opts.showSpinner) {
          setMessagesLoading(false);
        }
      });
  }

  async function handleLoadOlder() {
    if (!activeId || messages.length === 0) {
      return;
    }

    setLoadingOlder(true);
    setError(null);

    try {
      const oldest = messages[0];

      const olderPage = await api.getChatSession(
        activeId,
        token,
        {
          before: oldest.createdAt,
        }
      );

      isNearBottomRef.current = false;

      setMessages((prev) => [
        ...olderPage.messages,
        ...prev,
      ]);

      setHasMoreMessages(
        olderPage.hasMoreMessages
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load older messages."
      );
    } finally {
      setLoadingOlder(false);
    }
  }

  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      return;
    }

    isNearBottomRef.current = true;

    loadMessages(activeId, {
      showSpinner: true,
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, token]);

  function handleTranscriptScroll() {
    const el = transcriptRef.current;

    if (!el) {
      return;
    }

    isNearBottomRef.current = shouldAutoScroll({
      scrollTop: el.scrollTop,
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
    });

    el.classList.add("scroll-active");

    if (scrollHideTimeoutRef.current !== null) {
      clearTimeout(scrollHideTimeoutRef.current);
    }

    scrollHideTimeoutRef.current = setTimeout(() => {
      el.classList.remove("scroll-active");
    }, 200);
  }

  useEffect(() => {
    const el = transcriptRef.current;

    if (!el || !isNearBottomRef.current) {
      return;
    }

    el.scrollTo({
      top: el.scrollHeight,
    });
  }, [messages, sending, streamingText]);

  async function handleNewChat() {
    setError(null);

    try {
      const session = await api.createChatSession(token);

      setSessions((prev) => [
        { ...session },
        ...prev,
      ]);

      setActiveId(session.id);
      setMessages([]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to start a new chat."
      );
    }
  }

  function isAbortError(err: unknown): boolean {
    return (
      err instanceof DOMException &&
      err.name === "AbortError"
    );
  }

  async function resyncAfterAbort(
    sessionId: string
  ): Promise<void> {
    for (let attempt = 0; attempt < 5; attempt++) {
      const session = await api
        .getChatSession(sessionId, token)
        .catch(() => undefined);

      if (session) {
        setMessages(session.messages);

        if (
          session.messages[
            session.messages.length - 1
          ]?.role === "assistant"
        ) {
          return;
        }
      }

      await new Promise((resolve) =>
        setTimeout(resolve, 200)
      );
    }
  }

  async function handleSend(text: string) {
    let sessionId = activeId;

    if (!sessionId) {
      try {
        const session =
          await api.createChatSession(token);

        setSessions((prev) => [
          { ...session },
          ...prev,
        ]);

        setActiveId(session.id);
        sessionId = session.id;
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to start a new chat."
        );

        return;
      }
    }

    isNearBottomRef.current = true;

    const controller = new AbortController();

    abortControllerRef.current = controller;

    setSending(true);
    setStreamingText(null);
    setError(null);

    try {
      await api.postChatMessageStream(
        sessionId,
        text,
        token,
        controller.signal,
        {
          onUserMessage: (message) =>
            setMessages((prev) => [
              ...prev,
              message,
            ]),

          onChunk: (delta) =>
            setStreamingText(
              (prev) => (prev ?? "") + delta
            ),

          onDone: async () => {
            await loadMessages(sessionId!, {
              showSpinner: false,
            });

            refreshSessions({
              silent: true,
            });
          },

          onError: (message) =>
            setError(message),
        }
      );
    } catch (err) {
      if (isAbortError(err)) {
        await resyncAfterAbort(sessionId);
      } else {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to send message."
        );

        await loadMessages(sessionId, {
          showSpinner: false,
        });
      }
    } finally {
      setSending(false);
      setStreamingText(null);
      abortControllerRef.current = null;
    }
  }

  async function handleRegenerate() {
    if (!activeId) {
      return;
    }

    const sessionId = activeId;

    isNearBottomRef.current = true;

    const controller = new AbortController();

    abortControllerRef.current = controller;

    setRegenerating(true);
    setStreamingText(null);
    setError(null);

    try {
      await api.regenerateChatMessageStream(
        sessionId,
        token,
        controller.signal,
        {
          onChunk: (delta) =>
            setStreamingText(
              (prev) => (prev ?? "") + delta
            ),

          onDone: async () => {
            await loadMessages(sessionId, {
              showSpinner: false,
            });
          },

          onError: (message) =>
            setError(message),
        }
      );
    } catch (err) {
      if (isAbortError(err)) {
        await resyncAfterAbort(sessionId);
      } else {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to regenerate the response."
        );

        await loadMessages(sessionId, {
          showSpinner: false,
        });
      }
    } finally {
      setRegenerating(false);
      setStreamingText(null);
      abortControllerRef.current = null;
    }
  }

  function handleStop() {
    abortControllerRef.current?.abort();
  }

  function handleFormSubmit(text: string) {
    setFormOpen(false);

    if (text.trim()) {
      void handleSend(text);
    }
  }

  /**
   * Feature: digital prescription upload. Parses the PDF server-side
   * (`POST /prescription/parse` — Groq extraction, no risk check there),
   * then hands the returned sentence to the SAME `handleSend` every other
   * input path uses, so the actual grounded risk check (real Cypher via
   * `checkRisks`) and Groq-composed answer come from the one existing
   * pipeline — identical in shape to a typed message or the structured
   * form's submission.
   */
  async function handlePrescriptionUpload(file: File) {
    setError(null);
    setUploadingPrescription(true);
    try {
      const result = await api.parsePrescription(file, token);
      await handleSend(result.message);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to parse the uploaded prescription."
      );
    } finally {
      setUploadingPrescription(false);
    }
  }

  async function handleEditMessage(
    messageId: string,
    newText: string
  ) {
    if (!activeId) {
      return;
    }

    const sessionId = activeId;

    abortControllerRef.current?.abort();

    isNearBottomRef.current = true;

    const controller = new AbortController();

    abortControllerRef.current = controller;

    setSending(true);
    setStreamingText(null);
    setEditingTargetId(messageId);
    setEditingPendingUserMessage(null);
    setError(null);

    try {
      await api.editChatMessageStream(
        sessionId,
        messageId,
        newText,
        token,
        controller.signal,
        {
          onUserMessage: (message) =>
            setEditingPendingUserMessage(message),

          onChunk: (delta) =>
            setStreamingText(
              (prev) => (prev ?? "") + delta
            ),

          onDone: async () => {
            await loadMessages(sessionId, {
              showSpinner: false,
            });

            refreshSessions({
              silent: true,
            });
          },

          onError: (message) =>
            setError(message),
        }
      );
    } catch (err) {
      if (isAbortError(err)) {
        await resyncAfterAbort(sessionId);
      } else {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to edit the message."
        );

        await loadMessages(sessionId, {
          showSpinner: false,
        });
      }
    } finally {
      setSending(false);
      setStreamingText(null);
      setEditingTargetId(null);
      setEditingPendingUserMessage(null);
      abortControllerRef.current = null;
    }
  }

  async function handleSwitchBranch(
    messageId: string
  ) {
    if (!activeId) {
      return;
    }

    setError(null);

    try {
      const updated =
        await api.switchMessageBranch(
          activeId,
          messageId,
          token
        );

      isNearBottomRef.current = true;

      setMessages(updated.messages);
      setHasMoreMessages(
        updated.hasMoreMessages
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to switch to that version."
      );
    }
  }

  async function handleDeleteSession(
    id: string
  ) {
    setError(null);

    try {
      await api.deleteChatSession(id, token);

      const remaining = sessions.filter(
        (s) => s.id !== id
      );

      setSessions(remaining);

      if (id === activeId) {
        setActiveId(
          remaining.length > 0
            ? remaining[0].id
            : null
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to delete the chat."
      );
    }
  }

  async function handleRenameSession(
    id: string,
    currentTitle: string
  ) {
    const nextTitle = window.prompt(
      "Rename chat",
      currentTitle
    );

    if (nextTitle === null) {
      return;
    }

    setError(null);

    try {
      const { title } =
        await api.renameChatSession(
          id,
          nextTitle,
          token
        );

      setSessions((prev) =>
        prev.map((s) =>
          s.id === id
            ? { ...s, title }
            : s
        )
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to rename the chat."
      );
    }
  }

  async function handlePinSession(
    id: string,
    pinned: boolean
  ) {
    setError(null);

    try {
      await api.pinChatSession(
        id,
        pinned,
        token
      );

      setSessions((prev) =>
        prev.map((s) =>
          s.id === id
            ? { ...s, pinned }
            : s
        )
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update pin."
      );
    }
  }

  const lastAssistantId =
    [...messages]
      .reverse()
      .find(
        (m) => m.role === "assistant"
      )?.id;

  const editingTargetIndex = editingTargetId
    ? messages.findIndex(
      (m) => m.id === editingTargetId
    )
    : -1;

  const displayMessages = regenerating
    ? messages.filter(
      (m) => m.id !== lastAssistantId
    )
    : editingTargetIndex !== -1
      ? [
        ...messages.slice(
          0,
          editingTargetIndex
        ),
        ...(editingPendingUserMessage
          ? [editingPendingUserMessage]
          : []),
      ]
      : messages;

  const turnInFlight =
    sending || regenerating;

  const sessionRisks = useMemo<Risk[]>(() => {
    const byId = new Map<string, Risk>();

    for (const message of messages) {
      for (const risk of message.risks ?? []) {
        byId.set(risk.id, risk);
      }
    }

    return [...byId.values()];
  }, [messages]);

  const showHero =
    !sessionsLoading &&
    !messagesLoading &&
    !turnInFlight &&
    displayMessages.length === 0;

  return (
    <div className="chat-page">
      <div className="chat-topbar">
        <IconShield size={14} />

        This assistant does not provide medical advice and is
        not a substitute for a healthcare professional. In an
        emergency, call your local emergency number immediately.
      </div>

      <div className="chat-body-row">
        <ChatSidebar
          sessions={sessions}
          activeId={activeId}
          loading={sessionsLoading}
          onSelect={setActiveId}
          onNewChat={handleNewChat}
          onDelete={handleDeleteSession}
          onRename={handleRenameSession}
          onPin={handlePinSession}
          username={username}
          role={role}
          onLogout={onLogout}
        />

        <div className="chat-main">
          {error && (
            <div
              className="error-banner"
              style={{
                margin:
                  "var(--space-4) var(--space-10) 0",
              }}
            >
              {error}
            </div>
          )}

          {sessionsLoading ? (
            <div
              className="loading-panel"
              style={{ margin: "auto" }}
            >
              <span className="spinner" />
              Loading…
            </div>
          ) : showHero ? (
            <div className="chat-hero">
              <div className="chat-hero-inner">
                <h1 className="chat-hero-title">
                  Let's check what's safe together.
                </h1>

                <p className="chat-hero-subtitle">
                  Tell me what you're taking, or ask about
                  a new medication, allergy, or condition,
                  and I'll walk through it with you.
                </p>

                <div className="chat-composer-wrap">
                  <ChatComposer
                    onSend={handleSend}
                    busy={turnInFlight}
                    disabled={messagesLoading}
                    onStop={handleStop}
                    onError={setError}
                    onOpenForm={() =>
                      setFormOpen(true)
                    }
                    onUploadPrescription={handlePrescriptionUpload}
                    uploadingPrescription={uploadingPrescription}
                    variant="hero"
                  />
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="chat-transcript-area">
                <div
                  className="chat-transcript"
                  ref={transcriptRef}
                  onScroll={handleTranscriptScroll}
                >
                  {messagesLoading ? (
                    <div className="loading-panel">
                      <span className="spinner" />
                      Loading conversation…
                    </div>
                  ) : (
                    <>
                      {hasMoreMessages && (
                        <div className="chat-load-older">
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={
                              handleLoadOlder
                            }
                            disabled={loadingOlder}
                          >
                            {loadingOlder ? (
                              <span className="spinner" />
                            ) : (
                              "Load older messages"
                            )}
                          </button>
                        </div>
                      )}

                      {displayMessages.map(
                        (message) => (
                          <MessageBubble
                            key={message.id}
                            message={message}
                            isLastAssistantMessage={
                              message.id ===
                              lastAssistantId
                            }
                            onRegenerate={
                              message.id ===
                                lastAssistantId
                                ? handleRegenerate
                                : undefined
                            }
                            regenerating={
                              regenerating
                            }
                            regenerateDisabled={
                              sending
                            }
                            onEdit={
                              handleEditMessage
                            }
                            onSwitchBranch={
                              handleSwitchBranch
                            }
                          />
                        )
                      )}

                      {turnInFlight &&
                        (streamingText === null ? (
                          <TypingIndicator />
                        ) : (
                          <StreamingBubble
                            text={streamingText}
                          />
                        ))}
                    </>
                  )}
                </div>

                <div
                  className="chat-transcript-fade"
                  aria-hidden="true"
                />
              </div>

              <div className="chat-composer-wrap">
                <ChatComposer
                  onSend={handleSend}
                  busy={turnInFlight}
                  disabled={messagesLoading}
                  onStop={handleStop}
                  onError={setError}
                  onOpenForm={() =>
                    setFormOpen(true)
                  }
                  onUploadPrescription={handlePrescriptionUpload}
                  uploadingPrescription={uploadingPrescription}
                />
              </div>
            </>
          )}
        </div>

        {sessionRisks.length > 0 && (
          <ActiveRiskRail
            sessionRisks={sessionRisks}
          />
        )}
      </div>

      {formOpen && (
        <StructuredInputForm
          onSubmit={handleFormSubmit}
          onClose={() => setFormOpen(false)}
          busy={turnInFlight}
          token={token}
        />
      )}
    </div>
  );
}