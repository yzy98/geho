/** biome-ignore-all lint/complexity/noExcessiveCognitiveComplexity: ignore */
import { randomUUID } from "node:crypto";
import type { DbClient } from "@geho/db";
import { and, asc, desc, eq } from "@geho/db/helper";
import { chatMessage, chatSession, ragTrace } from "@geho/db/schema";
import { MAX_RAG_HISTORY_MESSAGES, type RagHistoryMessage } from "@geho/rag";
import type { CompletedChatbotRagAnswer } from "./chatbot-rag-answer";
import type { AuthorizedWidgetSession } from "./widget-session-access";

type WidgetMessageBase = {
  id: string;
  content: string;
  createdAt: string;
};

export type WidgetUserMessage = WidgetMessageBase & {
  role: "user";
};

export type WidgetAssistantMessage = WidgetMessageBase & {
  role: "assistant";
};

export type WidgetMessage = WidgetUserMessage | WidgetAssistantMessage;

/**
 * Get Session messages
 */
export type ListWidgetMessagesOptions = {
  db: DbClient;
  session: AuthorizedWidgetSession;
};

export type ListWidgetMessagesResult = {
  messages: WidgetMessage[];
};

export const listWidgetMessages = async ({
  db,
  session,
}: ListWidgetMessagesOptions): Promise<ListWidgetMessagesResult> => {
  // Select target session's messages
  const rows = await db
    .select({
      id: chatMessage.id,
      role: chatMessage.role,
      content: chatMessage.content,
      createdAt: chatMessage.createdAt,
    })
    .from(chatMessage)
    .where(
      and(
        eq(chatMessage.organizationId, session.organizationId),
        eq(chatMessage.sessionId, session.id)
      )
    )
    .orderBy(asc(chatMessage.createdAt), asc(chatMessage.id));

  const messages = rows.map((row): WidgetMessage => {
    const message = {
      id: row.id,
      content: row.content,
      createdAt: row.createdAt.toISOString(),
    };

    if (row.role === "assistant") {
      return {
        ...message,
        role: "assistant",
      };
    }

    return {
      ...message,
      role: "user",
    };
  });

  return {
    messages,
  };
};

const sessionSelection = {
  id: chatSession.id,
  organizationId: chatSession.organizationId,
  chatbotId: chatSession.chatbotId,
  status: chatSession.status,
  lastMessageAt: chatSession.lastMessageAt,
};

export type PreparedWidgetMessage = {
  userMessageId: string;
  organizationId: string;
  sessionId: string;
  chatbotId: string;
  question: string;
  history: RagHistoryMessage[];
};

export type PrepareWidgetResumeOptions = {
  db: DbClient;
  session: AuthorizedWidgetSession;
};

export type PrepareWidgetResumeResult =
  | {
      status: "prepared";
      prepared: PreparedWidgetMessage;
    }
  | {
      status: "no_unanswered_message";
    };

/**
 * Prepare Widget resume, find the trailing unanswered user message
 */
export const prepareWidgetResume = async ({
  db,
  session,
}: PrepareWidgetResumeOptions): Promise<PrepareWidgetResumeResult> =>
  db.transaction(async (tx): Promise<PrepareWidgetResumeResult> => {
    // Read the lastest bounded history before inserting the user message
    const historyRows = await tx
      .select({
        id: chatMessage.id,
        role: chatMessage.role,
        content: chatMessage.content,
      })
      .from(chatMessage)
      .where(
        and(
          eq(chatMessage.organizationId, session.organizationId),
          eq(chatMessage.sessionId, session.id)
        )
      )
      .orderBy(desc(chatMessage.createdAt), desc(chatMessage.id))
      .limit(MAX_RAG_HISTORY_MESSAGES + 1);

    const trailingMessage = historyRows[0];

    if (trailingMessage?.role !== "user") {
      return {
        status: "no_unanswered_message",
      };
    }

    // Reverse the history rows except the unanswered user message
    const history: RagHistoryMessage[] = historyRows
      .slice(1)
      .reverse()
      .map((message) => ({
        role: message.role,
        content: message.content,
      }));

    return {
      status: "prepared",
      prepared: {
        userMessageId: trailingMessage.id,
        sessionId: session.id,
        chatbotId: session.chatbotId,
        organizationId: session.organizationId,
        question: trailingMessage.content,
        history,
      },
    };
  });

export type PrepareWidgetMessageOptions = {
  db: DbClient;
  session: AuthorizedWidgetSession;
  content: string;
};

export type PrepareWidgetMessageResult =
  | {
      status: "prepared";
      prepared: PreparedWidgetMessage;
    }
  | {
      status: "unanswered_message_exists";
      userMessageId: string;
    };

export const prepareWidgetMessage = async ({
  db,
  session,
  content,
}: PrepareWidgetMessageOptions): Promise<PrepareWidgetMessageResult> =>
  db.transaction(async (tx): Promise<PrepareWidgetMessageResult> => {
    // Read the lastest bounded history before inserting the user message
    const historyRows = await tx
      .select({
        id: chatMessage.id,
        role: chatMessage.role,
        content: chatMessage.content,
      })
      .from(chatMessage)
      .where(
        and(
          eq(chatMessage.organizationId, session.organizationId),
          eq(chatMessage.sessionId, session.id)
        )
      )
      .orderBy(desc(chatMessage.createdAt), desc(chatMessage.id))
      .limit(MAX_RAG_HISTORY_MESSAGES);

    const trailingMessage = historyRows[0];

    if (trailingMessage?.role === "user") {
      return {
        status: "unanswered_message_exists",
        userMessageId: trailingMessage.id,
      };
    }

    // Query returned newest-first; the RAG prompt expects chronological ordering
    const history: RagHistoryMessage[] = historyRows
      .slice()
      .reverse()
      .map((message) => ({
        role: message.role,
        content: message.content,
      }));

    const userMessageId = randomUUID();
    const createdAt = new Date();

    await tx.insert(chatMessage).values({
      id: userMessageId,
      sessionId: session.id,
      organizationId: session.organizationId,
      role: "user",
      content,
      createdAt,
    });

    return {
      status: "prepared",
      prepared: {
        userMessageId,
        sessionId: session.id,
        chatbotId: session.chatbotId,
        organizationId: session.organizationId,
        question: content,
        history,
      },
    };
  });

export type FinalizeWidgetAnswerOptions = {
  db: DbClient;
  assistantMessageId: string;
  prepared: PreparedWidgetMessage;
  completed: CompletedChatbotRagAnswer;
};

export type FinalizeWidgetAnswerResult =
  | {
      status: "finalized";
      assistantMessage: WidgetAssistantMessage;
      traceId: string;
    }
  | {
      status: "session_unavailable";
    }
  | {
      status: "stale_preparation";
    };

export const finalizeWidgetAnswer = ({
  db,
  assistantMessageId,
  prepared,
  completed,
}: FinalizeWidgetAnswerOptions): Promise<FinalizeWidgetAnswerResult> =>
  db.transaction(async (tx): Promise<FinalizeWidgetAnswerResult> => {
    // Serialize finalize against operations for this session
    const [lockedSession] = await tx
      .select(sessionSelection)
      .from(chatSession)
      .where(
        and(
          eq(chatSession.id, prepared.sessionId),
          eq(chatSession.organizationId, prepared.organizationId),
          eq(chatSession.chatbotId, prepared.chatbotId)
        )
      )
      .limit(1)
      .for("update");

    if (lockedSession?.status !== "active") {
      return {
        status: "session_unavailable",
      };
    }

    // The prepared user message must be the trailing message
    const [trailingMessage] = await tx
      .select({
        id: chatMessage.id,
        role: chatMessage.role,
      })
      .from(chatMessage)
      .where(
        and(
          eq(chatMessage.organizationId, prepared.organizationId),
          eq(chatMessage.sessionId, prepared.sessionId)
        )
      )
      .orderBy(desc(chatMessage.createdAt), desc(chatMessage.id))
      .limit(1);

    if (
      trailingMessage?.role !== "user" ||
      trailingMessage?.id !== prepared.userMessageId
    ) {
      return {
        status: "stale_preparation",
      };
    }

    const traceId = randomUUID();
    const completedAt = new Date();

    // Insert assistant message
    await tx.insert(chatMessage).values({
      id: assistantMessageId,
      sessionId: prepared.sessionId,
      organizationId: prepared.organizationId,
      role: "assistant",
      content: completed.answer,
      createdAt: completedAt,
    });

    // Insert message refrenced rag trace
    await tx.insert(ragTrace).values({
      id: traceId,
      organizationId: prepared.organizationId,
      chatbotId: prepared.chatbotId,
      knowledgeBaseId: completed.knowledgeBaseId,
      messageId: assistantMessageId,
      origin: "widget",
      question: prepared.question,
      answer: completed.answer,
      promptPreview: completed.promptPreview,
      modelId: completed.modelId,
      citations: completed.citations,
      retrievedChunks: completed.retrievedChunks,
      latencyMs: completed.latencyMs,
      createdAt: completedAt,
    });

    // Update the chat session last message at time
    await tx
      .update(chatSession)
      .set({
        lastMessageAt: completedAt,
      })
      .where(
        and(
          eq(chatSession.id, prepared.sessionId),
          eq(chatSession.organizationId, prepared.organizationId),
          eq(chatSession.chatbotId, prepared.chatbotId),
          eq(chatSession.status, "active")
        )
      );

    return {
      status: "finalized",
      assistantMessage: {
        id: assistantMessageId,
        role: "assistant",
        content: completed.answer,
        createdAt: completedAt.toISOString(),
      },
      traceId,
    };
  });
