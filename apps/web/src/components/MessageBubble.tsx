import { useState } from "react";
import ReactMarkdown from "react-markdown";
import type { ChatMessage } from "@disa/shared-types";
import { sortBySeverityDesc } from "../risk/severityOrder";
import { formatMessageTimestamp } from "../chat/formatTimestamp";
import { IconAlert, IconAngleLeft, IconAngleRight, IconCheck, IconCopy, IconEdit, IconRegenerate } from "./icons";
import { SeverityBadge } from "./SeverityBadge";
import { RiskTypeLabel } from "./RiskTypeLabel";

interface Props {
  message: ChatMessage;
  /** True only for the session's most recent assistant reply — regeneration only ever targets the latest turn (Build Plan V2.2.6). */
  isLastAssistantMessage?: boolean;
  onRegenerate?: () => void;
  /** This specific message is being regenerated right now — shows the "Regenerating…" label. */
  regenerating?: boolean;
  /** Disables the control without claiming a regenerate is in progress (e.g. a new message send is in flight elsewhere). */
  regenerateDisabled?: boolean;
  /** Build Plan V2.6 — present only on user messages; edits create a new branch (see chat-sessions' `editMessage`), never mutate the original in place. */
  onEdit?: (messageId: string, newText: string) => void;
  /** Build Plan V2.6 — the "< k/n >" navigation; switches which sibling version is active. */
  onSwitchBranch?: (messageId: string) => void;
}

/** improvements.md #1.1, Build Plan V2.1.1 — a fixed, unmissable treatment, never confused with a normal reply. The one deliberate exception to the plain-white canvas. */
function EmergencyNotice({ text }: { text: string }) {
  return (
    <div className="chat-message-emergency">
      <div className="chat-message-emergency-heading">
        <IconAlert size={15} /> Possible medical emergency
      </div>
      {text}
    </div>
  );
}

/**
 * Build Plan V2.5.1 (revised per live user report) — an emergency phrase no
 * longer replaces the turn's normal analysis, it leads it: `runTurn` prefixes
 * the fixed notice onto whatever the normal flow concluded, joined by one
 * blank line (see the invariant documented on `buildEmergencyResponse`).
 * Splitting on the FIRST blank line separates the two so each renders with
 * its own appropriate treatment — the notice in its own highlighted section,
 * the continuation as an ordinary reply (risk chips, source tag, footer)
 * right below it, instead of both being squeezed into the alert box.
 */
function splitEmergencyText(text: string): { notice: string; continuation: string } {
  const blankLineIndex = text.indexOf("\n\n");
  if (blankLineIndex === -1) return { notice: text, continuation: "" };
  return { notice: text.slice(0, blankLineIndex), continuation: text.slice(blankLineIndex + 2).trim() };
}

/** Build Plan V2.5 — the risk signal leads the answer instead of trailing it: severity is the first thing read, the explanation second. */
function RiskSummary({ risks }: { risks: NonNullable<ChatMessage["risks"]> }) {
  if (risks.length === 0) return null;
  const sorted = sortBySeverityDesc(risks);
  return (
    <div className="chat-message-risk-summary">
      {sorted.map((risk) => (
        <span key={risk.id} className="row gap-1">
          <SeverityBadge severity={risk.severity} />
          <RiskTypeLabel type={risk.type} />
        </span>
      ))}
    </div>
  );
}

/** improvements.md #1.6, Build Plan V2.1.3 — makes visible the boundary REQ-037 already enforces: a general-chat answer never asserts a personalized conclusion. */
function AnswerSourceTag({ source }: { source: NonNullable<ChatMessage["answerSource"]> }) {
  return source === "grounded" ? (
    <span className="chat-message-source chat-message-source-grounded"><IconCheck size={12} /> Checked against your data</span>
  ) : (
    <span className="chat-message-source chat-message-source-general">General information — not a personal check</span>
  );
}

export function MessageBubble({ message, isLastAssistantMessage, onRegenerate, regenerating, regenerateDisabled, onEdit, onSwitchBranch }: Props) {
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.text);

  const canRegenerate = message.role === "assistant" && isLastAssistantMessage && onRegenerate;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(message.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access can be denied by the browser; there's nothing further to recover here.
    }
  }

  if (message.role === "user") {
    // Build Plan V2.6 — present only once this message has sibling versions (an edit happened
    // somewhere in this fork); "1/1" is never shown, matching the reference behavior.
    const siblingIds = message.siblingIds ?? [];
    const canNavigate = Boolean(message.editCount && message.editCount > 1 && siblingIds.length > 0);
    const currentIndex = siblingIds.indexOf(message.id);
    const prevId = canNavigate && currentIndex > 0 ? siblingIds[currentIndex - 1] : undefined;
    const nextId = canNavigate && currentIndex !== -1 && currentIndex < siblingIds.length - 1 ? siblingIds[currentIndex + 1] : undefined;

    function handleStartEdit() {
      setDraft(message.text);
      setEditing(true);
    }

    function handleSaveEdit() {
      const trimmed = draft.trim();
      if (!trimmed) return;
      setEditing(false);
      onEdit?.(message.id, trimmed);
    }

    if (editing) {
      return (
        <div className="chat-message chat-message-user">
          <div className="chat-message-edit-box">
            <textarea
              className="chat-message-edit-input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSaveEdit();
                } else if (e.key === "Escape") {
                  setEditing(false);
                }
              }}
              rows={2}
              autoFocus
            />
            <div className="chat-message-edit-actions">
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditing(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary btn-sm" onClick={handleSaveEdit} disabled={!draft.trim()}>
                Save &amp; submit
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="chat-message chat-message-user">
        <div className="chat-message-user-bubble">{message.text}</div>
        <div className="chat-message-user-actions">
          {canNavigate && (
            <div className="chat-message-branch-nav">
              <button
                type="button"
                onClick={() => prevId && onSwitchBranch?.(prevId)}
                disabled={!prevId}
                aria-label="Previous version"
                data-tooltip="Previous version"
              >
                <IconAngleLeft size={12} />
              </button>
              <span>
                {message.editIndex}/{message.editCount}
              </span>
              <button
                type="button"
                onClick={() => nextId && onSwitchBranch?.(nextId)}
                disabled={!nextId}
                aria-label="Next version"
                data-tooltip="Next version"
              >
                <IconAngleRight size={12} />
              </button>
            </div>
          )}
          <button
            type="button"
            className="chat-message-footer-btn chat-message-user-action"
            onClick={handleCopy}
            aria-label={copied ? "Copied" : "Copy"}
            data-tooltip={copied ? "Copied" : "Copy"}
          >
            {copied ? <IconCheck size={12} /> : <IconCopy size={12} />}
          </button>
          {onEdit && (
            <button
              type="button"
              className="chat-message-footer-btn chat-message-user-action"
              onClick={handleStartEdit}
              aria-label="Edit message"
              data-tooltip="Edit"
            >
              <IconEdit size={12} />
            </button>
          )}
        </div>
      </div>
    );
  }

  // Build Plan V2.5.1 — an emergency turn shows the fixed notice AND still
  // continues with whatever the normal flow concluded (a risk check, an
  // intake question, a general answer), instead of replacing it.
  const { notice, continuation } = message.isEmergency ? splitEmergencyText(message.text) : { notice: "", continuation: message.text };

  return (
    <div className="chat-message chat-message-assistant">
      {message.isEmergency && <EmergencyNotice text={notice} />}
      {continuation && (
        <>
          {message.risks && message.risks.length > 0 && <RiskSummary risks={message.risks} />}
          <div className="chat-message-assistant-body chat-message-markdown">
            <ReactMarkdown>{continuation}</ReactMarkdown>
          </div>
          {message.answerSource && <AnswerSourceTag source={message.answerSource} />}
        </>
      )}
      <div className="chat-message-footer">
        <span className="chat-message-timestamp">{formatMessageTimestamp(message.createdAt)}</span>
        <button
          type="button"
          className={`chat-message-footer-btn${copied ? " chat-message-footer-btn-done" : ""}`}
          onClick={handleCopy}
          aria-label={copied ? "Copied" : "Copy"}
          data-tooltip={copied ? "Copied" : "Copy"}
        >
          {copied ? <IconCheck size={12} /> : <IconCopy size={12} />}
        </button>
        {canRegenerate && (
          <button
            type="button"
            className="chat-message-footer-btn"
            onClick={onRegenerate}
            disabled={regenerating || regenerateDisabled}
            aria-label={regenerating ? "Regenerating" : "Regenerate"}
            data-tooltip={regenerating ? "Regenerating…" : "Regenerate"}
          >
            <IconRegenerate size={12} className={regenerating ? "spin" : undefined} />
          </button>
        )}
      </div>
    </div>
  );
}
