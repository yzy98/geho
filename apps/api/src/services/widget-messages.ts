/** biome-ignore-all lint/complexity/noExcessiveCognitiveComplexity: ignore */
import { randomUUID } from "node:crypto";
import type { DbClient } from "@heho/db";
import { and, asc, desc, eq, sql } from "@heho/db/helper";
import {
  chatMessage,
  chatSession,
  type RagTraceCitation,
  ragTrace,
} from "@heho/db/schema";
import { MAX_RAG_HISTORY_MESSAGES, type RagHistoryMessage } from "../lib/rag";
import type { CreateWidgetMessageInput } from "../schemas/widget";
import { generateChatbotRagAnswer } from "./chatbot-rag-answer";
import {
  type AuthorizedWidgetSession,
  isWidgetSessionExpired,
} from "./widget-session-access";

type WidgetMessageBase = {
  id: string;
  content: string;
  createdAt: string;
};

export type WidgetMessage =
  | (WidgetMessageBase & {
      role: "user";
    })
  | (WidgetMessageBase & {
      role: "assistant";
      citations: RagTraceCitation[];
    });

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
      citations: ragTrace.citations,
    })
    .from(chatMessage)
    .leftJoin(
      ragTrace,
      and(
        eq(ragTrace.organizationId, chatMessage.organizationId),
        eq(ragTrace.messageId, chatMessage.id),
        eq(ragTrace.origin, "widget")
      )
    )
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
        citations: row.citations ?? [],
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

export type CreateWidgetMessageOptions = {
  db: DbClient;
  encryptionKey: Uint8Array;
  session: AuthorizedWidgetSession;
  input: CreateWidgetMessageInput;
};

export type CreateWidgetMessageResult =
  | {
      status: "answered";
      replayed: boolean;
      userMessageId: string;
      assistantMessage: WidgetMessage;
      traceId: string;
    }
  | { status: "invalid_access" }
  | { status: "session_expired" }
  | { status: "message_id_conflict" }
  | { status: "chat_generation_failed" };

const sessionSelection = {
  id: chatSession.id,
  organizationId: chatSession.organizationId,
  chatbotId: chatSession.chatbotId,
  status: chatSession.status,
  lastMessageAt: chatSession.lastMessageAt,
};

export const createWidgetMessage = async ({
  db,
  encryptionKey,
  session,
  input,
}: CreateWidgetMessageOptions): Promise<CreateWidgetMessageResult> =>
  db.transaction(async (tx): Promise<CreateWidgetMessageResult> => {
    // Find the Chat Session and lock for update
    const sessionRows = await tx
      .select(sessionSelection)
      .from(chatSession)
      .where(
        and(
          eq(chatSession.id, session.id),
          eq(chatSession.organizationId, session.organizationId),
          eq(chatSession.chatbotId, session.chatbotId)
        )
      )
      .limit(1)
      .for("update");

    const lockedSession = sessionRows[0];

    if (!lockedSession) {
      return {
        status: "invalid_access",
      };
    }

    if (lockedSession.status === "closed") {
      return {
        status: "session_expired",
      };
    }

    if (
      isWidgetSessionExpired({
        lastMessageAt: lockedSession.lastMessageAt,
      })
    ) {
      await tx
        .update(chatSession)
        .set({
          status: "closed",
        })
        .where(
          and(
            eq(chatSession.id, lockedSession.id),
            eq(chatSession.organizationId, lockedSession.organizationId),
            eq(chatSession.chatbotId, lockedSession.chatbotId),
            eq(chatSession.status, "active")
          )
        );

      return {
        status: "session_expired",
      };
    }

    // Find the existing user message according to client message ID
    const existingUserMessageRows = await tx
      .select({
        id: chatMessage.id,
        content: chatMessage.content,
        createdAt: chatMessage.createdAt,
      })
      .from(chatMessage)
      .where(
        and(
          eq(chatMessage.organizationId, lockedSession.organizationId),
          eq(chatMessage.sessionId, lockedSession.id),
          eq(chatMessage.clientMessageId, input.clientMessageId),
          eq(chatMessage.role, "user")
        )
      )
      .limit(1);

    const existingUserMessage = existingUserMessageRows[0];

    // Same client message ID not allow different content
    if (existingUserMessage && existingUserMessage.content !== input.content) {
      return {
        status: "message_id_conflict",
      };
    }

    // User message not exists, insert; Or re-use
    const userMessage = existingUserMessage ?? {
      id: randomUUID(),
      content: input.content,
      createdAt: new Date(),
    };

    // Insert into Chat Message
    if (!existingUserMessage) {
      await tx.insert(chatMessage).values({
        id: userMessage.id,
        organizationId: lockedSession.organizationId,
        sessionId: lockedSession.id,
        clientMessageId: input.clientMessageId,
        replyToMessageId: null,
        role: "user",
        content: userMessage.content,
        createdAt: userMessage.createdAt,
      });
    }

    // Check if the User Message already has completed answer
    const completedAnswerRows = await tx
      .select({
        assistantMessageId: chatMessage.id,
        answer: chatMessage.content,
        assistantCreatedAt: chatMessage.createdAt,
        traceId: ragTrace.id,
        citations: ragTrace.citations,
      })
      .from(chatMessage)
      .leftJoin(
        ragTrace,
        and(
          eq(ragTrace.organizationId, chatMessage.organizationId),
          eq(ragTrace.messageId, chatMessage.id),
          eq(ragTrace.origin, "widget")
        )
      )
      .where(
        and(
          eq(chatMessage.organizationId, lockedSession.organizationId),
          eq(chatMessage.sessionId, lockedSession.id),
          eq(chatMessage.role, "assistant"),
          eq(chatMessage.replyToMessageId, userMessage.id)
        )
      )
      .limit(1);

    const completedAnswer = completedAnswerRows[0];

    // The assisant answer message exists
    if (completedAnswer) {
      if (
        completedAnswer.traceId === null ||
        completedAnswer.citations === null
      ) {
        throw new Error("Widget assistant is missing its RAG trace");
      }

      return {
        status: "answered",
        replayed: true,
        userMessageId: userMessage.id,
        assistantMessage: {
          id: completedAnswer.assistantMessageId,
          role: "assistant",
          content: completedAnswer.answer,
          citations: completedAnswer.citations,
          createdAt: completedAnswer.assistantCreatedAt.toISOString(),
        },
        traceId: completedAnswer.traceId,
      };
    }

    // The assistant answer message not exist
    // Load 20 messages before current user message
    const historyRows = await tx
      .select({
        role: chatMessage.role,
        content: chatMessage.content,
      })
      .from(chatMessage)
      .where(
        and(
          eq(chatMessage.organizationId, lockedSession.organizationId),
          eq(chatMessage.sessionId, lockedSession.id),
          sql`
            (
              ${chatMessage.createdAt},
              ${chatMessage.id}
            )
            <
            (
              ${userMessage.createdAt},
              ${userMessage.id}
            )
          `
        )
      )
      .orderBy(desc(chatMessage.createdAt), desc(chatMessage.id))
      .limit(MAX_RAG_HISTORY_MESSAGES);

    const history: RagHistoryMessage[] = historyRows
      .reverse()
      .map((message) => ({
        role: message.role,
        content: message.content,
      }));

    // Generate shared RAG answer
    let generated: Awaited<ReturnType<typeof generateChatbotRagAnswer>>;

    try {
      generated = await generateChatbotRagAnswer({
        db,
        encryptionKey,
        organizationId: lockedSession.organizationId,
        chatbotId: lockedSession.chatbotId,
        question: userMessage.content,
        history,
      });
    } catch {
      return {
        status: "chat_generation_failed",
      };
    }

    if (generated.status !== "answered") {
      return {
        status: "chat_generation_failed",
      };
    }

    // Save assistant message, Widget RAG Trace and time
    const assistantMessageId = randomUUID();
    const traceId = randomUUID();
    const completedAt = new Date();

    // Insert assisant message into Chat Message
    await tx.insert(chatMessage).values({
      id: assistantMessageId,
      organizationId: lockedSession.organizationId,
      sessionId: lockedSession.id,
      clientMessageId: null,
      replyToMessageId: userMessage.id,
      role: "assistant",
      content: generated.answer,
      createdAt: completedAt,
    });

    // Insert into RAG Trace
    await tx.insert(ragTrace).values({
      id: traceId,
      organizationId: lockedSession.organizationId,
      chatbotId: lockedSession.chatbotId,
      knowledgeBaseId: generated.knowledgeBaseId,
      messageId: assistantMessageId,
      origin: "widget",
      question: userMessage.content,
      answer: generated.answer,
      promptPreview: generated.promptPreview,
      modelId: generated.modelId,
      latencyMs: generated.latencyMs,
      retrievedChunks: generated.retrievedChunks,
      citations: generated.citations,
      createdAt: completedAt,
    });

    // Update the Chat Session last message at
    await tx
      .update(chatSession)
      .set({ lastMessageAt: completedAt })
      .where(
        and(
          eq(chatSession.id, lockedSession.id),
          eq(chatSession.organizationId, lockedSession.organizationId),
          eq(chatSession.status, "active")
        )
      );

    return {
      status: "answered",
      replayed: false,
      userMessageId: userMessage.id,
      assistantMessage: {
        id: assistantMessageId,
        role: "assistant",
        content: generated.answer,
        citations: generated.citations,
        createdAt: completedAt.toISOString(),
      },
      traceId,
    };
  });
