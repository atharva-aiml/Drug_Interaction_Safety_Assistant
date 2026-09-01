import { ChatMessage } from "@disa/shared-types";
import { getSession } from "../../../db/neo4jClient.js";
import { PendingClarification } from "../../assistant/domain/clarificationGuidance.js";
import { ChatSessionRecord, ChatSessionRepository } from "../application/ports.js";

/** Build Plan V2.6 — `parentId`/`activeChildId` aren't part of the public `ChatMessage` shape's write side (the client never sets them), but the repository still needs to persist/read them. */
function messageToProps(message: ChatMessage & { activeChildId?: string }) {
  return {
    id: message.id,
    sessionId: message.sessionId,
    role: message.role,
    text: message.text,
    createdAt: message.createdAt,
    risks: message.risks ? JSON.stringify(message.risks) : null,
    cypherQueries: message.cypherQueries ? JSON.stringify(message.cypherQueries) : null,
    tips: message.tips ? JSON.stringify(message.tips) : null,
    unresolvedNames: message.unresolvedNames ? JSON.stringify(message.unresolvedNames) : null,
    isEmergency: message.isEmergency ?? null,
    emergencyCategory: message.emergencyCategory ?? null,
    answerSource: message.answerSource ?? null,
    parentId: message.parentId ?? null,
    activeChildId: message.activeChildId ?? null,
  };
}

function messageFromProps(props: Record<string, unknown>): ChatMessage & { activeChildId?: string } {
  return {
    id: props.id as string,
    sessionId: props.sessionId as string,
    role: props.role as ChatMessage["role"],
    text: props.text as string,
    createdAt: props.createdAt as string,
    ...(props.risks ? { risks: JSON.parse(props.risks as string) } : {}),
    ...(props.cypherQueries ? { cypherQueries: JSON.parse(props.cypherQueries as string) } : {}),
    ...(props.tips ? { tips: JSON.parse(props.tips as string) } : {}),
    ...(props.unresolvedNames ? { unresolvedNames: JSON.parse(props.unresolvedNames as string) } : {}),
    ...(props.isEmergency === true ? { isEmergency: true } : {}),
    ...(props.emergencyCategory ? { emergencyCategory: props.emergencyCategory as string } : {}),
    ...(props.answerSource ? { answerSource: props.answerSource as ChatMessage["answerSource"] } : {}),
    ...(props.parentId ? { parentId: props.parentId as string } : {}),
    ...(props.activeChildId ? { activeChildId: props.activeChildId as string } : {}),
  };
}

function sessionFromProps(props: Record<string, unknown>): ChatSessionRecord {
  return {
    id: props.id as string,
    userId: props.userId as string,
    patientId: props.patientId as string,
    title: props.title as string,
    // Defaults false/0/[] for any session created before these properties existed — a
    // harmless one-extra-question-next-turn effect for pre-existing sessions, never a crash.
    pinned: props.pinned === true,
    intakeComplete: props.intakeComplete === true,
    intakeAskCount: (props.intakeAskCount as number) ?? 0,
    pendingClarifications: props.pendingClarifications ? (JSON.parse(props.pendingClarifications as string) as PendingClarification[]) : [],
    multiPersonNoticeShown: props.multiPersonNoticeShown === true,
    dosageNoticeShown: props.dosageNoticeShown === true,
    historySummary: (props.historySummary as string) ?? "",
    historySummarizedCount: (props.historySummarizedCount as number) ?? 0,
    createdAt: props.createdAt as string,
    updatedAt: props.updatedAt as string,
    ...(props.activeFirstMessageId ? { activeFirstMessageId: props.activeFirstMessageId as string } : {}),
  };
}

export class Neo4jChatSessionRepository implements ChatSessionRepository {
  async create(session: ChatSessionRecord): Promise<ChatSessionRecord> {
    const neoSession = getSession();
    try {
      await neoSession.run(
        `MATCH (u:User {id: $userId}), (p:Patient {id: $patientId})
         CREATE (s:ChatSession {
           id: $id, userId: $userId, patientId: $patientId, title: $title, pinned: $pinned,
           intakeComplete: $intakeComplete, intakeAskCount: $intakeAskCount,
           pendingClarifications: $pendingClarificationsJson,
           multiPersonNoticeShown: $multiPersonNoticeShown, dosageNoticeShown: $dosageNoticeShown,
           historySummary: $historySummary, historySummarizedCount: $historySummarizedCount,
           createdAt: $createdAt, updatedAt: $updatedAt
         })
         CREATE (u)-[:OWNS]->(s)
         CREATE (s)-[:HAS_PROFILE]->(p)`,
        {
          id: session.id,
          userId: session.userId,
          patientId: session.patientId,
          title: session.title,
          pinned: session.pinned,
          intakeComplete: session.intakeComplete,
          intakeAskCount: session.intakeAskCount,
          pendingClarificationsJson: JSON.stringify(session.pendingClarifications),
          multiPersonNoticeShown: session.multiPersonNoticeShown,
          dosageNoticeShown: session.dosageNoticeShown,
          historySummary: session.historySummary,
          historySummarizedCount: session.historySummarizedCount,
          createdAt: session.createdAt,
          updatedAt: session.updatedAt,
        }
      );
      return session;
    } finally {
      await neoSession.close();
    }
  }

  async listByUser(userId: string): Promise<ChatSessionRecord[]> {
    const neoSession = getSession();
    try {
      const result = await neoSession.run(
        `MATCH (u:User {id: $userId})-[:OWNS]->(s:ChatSession)
         RETURN s ORDER BY s.updatedAt DESC`,
        { userId }
      );
      return result.records.map((r) => sessionFromProps(r.get("s").properties));
    } finally {
      await neoSession.close();
    }
  }

  async findById(id: string): Promise<ChatSessionRecord | undefined> {
    const neoSession = getSession();
    try {
      const result = await neoSession.run(`MATCH (s:ChatSession {id: $id}) RETURN s`, { id });
      if (result.records.length === 0) return undefined;
      return sessionFromProps(result.records[0].get("s").properties);
    } finally {
      await neoSession.close();
    }
  }

  async updateTitle(id: string, title: string): Promise<void> {
    const neoSession = getSession();
    try {
      await neoSession.run(`MATCH (s:ChatSession {id: $id}) SET s.title = $title`, { id, title });
    } finally {
      await neoSession.close();
    }
  }

  async setPinned(id: string, pinned: boolean): Promise<void> {
    const neoSession = getSession();
    try {
      await neoSession.run(`MATCH (s:ChatSession {id: $id}) SET s.pinned = $pinned`, { id, pinned });
    } finally {
      await neoSession.close();
    }
  }

  async setIntakeComplete(id: string): Promise<void> {
    const neoSession = getSession();
    try {
      await neoSession.run(`MATCH (s:ChatSession {id: $id}) SET s.intakeComplete = true`, { id });
    } finally {
      await neoSession.close();
    }
  }

  async setIntakeAskCount(id: string, count: number): Promise<void> {
    const neoSession = getSession();
    try {
      await neoSession.run(`MATCH (s:ChatSession {id: $id}) SET s.intakeAskCount = $count`, { id, count });
    } finally {
      await neoSession.close();
    }
  }

  async setPendingClarifications(id: string, pending: PendingClarification[]): Promise<void> {
    const neoSession = getSession();
    try {
      await neoSession.run(`MATCH (s:ChatSession {id: $id}) SET s.pendingClarifications = $json`, {
        id,
        json: JSON.stringify(pending),
      });
    } finally {
      await neoSession.close();
    }
  }

  async setMultiPersonNoticeShown(id: string): Promise<void> {
    const neoSession = getSession();
    try {
      await neoSession.run(`MATCH (s:ChatSession {id: $id}) SET s.multiPersonNoticeShown = true`, { id });
    } finally {
      await neoSession.close();
    }
  }

  async setDosageNoticeShown(id: string): Promise<void> {
    const neoSession = getSession();
    try {
      await neoSession.run(`MATCH (s:ChatSession {id: $id}) SET s.dosageNoticeShown = true`, { id });
    } finally {
      await neoSession.close();
    }
  }

  async setHistorySummary(id: string, summary: string, summarizedCount: number): Promise<void> {
    const neoSession = getSession();
    try {
      await neoSession.run(
        `MATCH (s:ChatSession {id: $id}) SET s.historySummary = $summary, s.historySummarizedCount = $summarizedCount`,
        { id, summary, summarizedCount }
      );
    } finally {
      await neoSession.close();
    }
  }

  async setActiveFirstMessage(sessionId: string, messageId: string): Promise<void> {
    const neoSession = getSession();
    try {
      await neoSession.run(`MATCH (s:ChatSession {id: $sessionId}) SET s.activeFirstMessageId = $messageId`, { sessionId, messageId });
    } finally {
      await neoSession.close();
    }
  }

  async setActiveChildId(messageId: string, childId: string): Promise<void> {
    const neoSession = getSession();
    try {
      await neoSession.run(`MATCH (m:ChatMessage {id: $messageId}) SET m.activeChildId = $childId`, { messageId, childId });
    } finally {
      await neoSession.close();
    }
  }

  /** Also bumps the session's `updatedAt` to the message's own timestamp — last message time doubles as last-activity time. */
  async appendMessage(message: ChatMessage): Promise<ChatMessage> {
    const neoSession = getSession();
    try {
      await neoSession.run(
        `MATCH (s:ChatSession {id: $sessionId})
         CREATE (s)-[:HAS_MESSAGE]->(m:ChatMessage $props)
         SET s.updatedAt = $props.createdAt`,
        { sessionId: message.sessionId, props: messageToProps(message) }
      );
      return message;
    } finally {
      await neoSession.close();
    }
  }

  async listMessages(sessionId: string): Promise<ChatMessage[]> {
    const neoSession = getSession();
    try {
      const result = await neoSession.run(
        `MATCH (s:ChatSession {id: $sessionId})-[:HAS_MESSAGE]->(m:ChatMessage)
         RETURN m ORDER BY m.createdAt ASC`,
        { sessionId }
      );
      return result.records.map((r) => messageFromProps(r.get("m").properties));
    } finally {
      await neoSession.close();
    }
  }

  /** Build Plan V2.6 — the target of an edit or a branch switch, which is often NOT on the current active path (that's the whole point), so this can't go through `listMessages` + a client-side filter of the active set. */
  async findMessageById(id: string): Promise<ChatMessage | undefined> {
    const neoSession = getSession();
    try {
      const result = await neoSession.run(`MATCH (m:ChatMessage {id: $id}) RETURN m`, { id });
      if (result.records.length === 0) return undefined;
      return messageFromProps(result.records[0].get("m").properties);
    } finally {
      await neoSession.close();
    }
  }

  async deleteMessage(id: string): Promise<void> {
    const neoSession = getSession();
    try {
      await neoSession.run(`MATCH (m:ChatMessage {id: $id}) DETACH DELETE m`, { id });
    } finally {
      await neoSession.close();
    }
  }

  /**
   * A ChatSession is a leaf entity — nothing else references it the way
   * other records reference a Patient/Drug (System Architecture §3) — so a
   * hard delete is safe. Its 1:1 backing Patient was auto-provisioned solely
   * for this session and is deleted alongside it, not left orphaned.
   */
  async delete(id: string): Promise<void> {
    const neoSession = getSession();
    try {
      await neoSession.run(
        `MATCH (s:ChatSession {id: $id})
         OPTIONAL MATCH (s)-[:HAS_MESSAGE]->(m:ChatMessage)
         OPTIONAL MATCH (s)-[:HAS_PROFILE]->(p:Patient)
         DETACH DELETE s, m, p`,
        { id }
      );
    } finally {
      await neoSession.close();
    }
  }
}
