import { randomUUID } from "node:crypto";
import type { RagTraceCitation } from "@geho/db";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessage,
} from "ai";
import { Hono } from "hono";
import type { WidgetSessionEnv } from "../../context";
import { requireWidgetSessionAccess } from "../../middleware/require-widget-session-access";
import { createWidgetMessageSchema } from "../../schemas/widget";
import { createChatbotRagAnswerStream } from "../../services/chatbot-rag-answer";
import {
  finalizeWidgetAnswer,
  listWidgetMessages,
  type PreparedWidgetMessage,
  prepareWidgetMessage,
  prepareWidgetResume,
} from "../../services/widget-messages";
import type { RouteDependencies } from "../types";
import { jsonValidator } from "../validators";

type CreateWidgetMessagesRouteOptions = Pick<
  RouteDependencies,
  "db" | "encryptionKey"
>;

const createWidgetMessageValidator = jsonValidator({
  schema: createWidgetMessageSchema,
  message: "Invalid widget message input.",
});

type WidgetUIMessage = UIMessage<
  {
    createdAt?: string;
    traceId?: string;
  },
  {
    answer: {
      text: string;
    };
    citations: RagTraceCitation[];
  }
>;

type StreamWidgetRagResponseOptions = {
  db: CreateWidgetMessagesRouteOptions["db"];
  encryptionKey: CreateWidgetMessagesRouteOptions["encryptionKey"];
  prepared: PreparedWidgetMessage;
  abortSignal: AbortSignal;
  onSettled?: () => void;
};

const streamWidgetRagResponse = ({
  db,
  encryptionKey,
  prepared,
  abortSignal,
  onSettled,
}: StreamWidgetRagResponseOptions): Response => {
  const assistantMessageId = randomUUID();

  const stream = createUIMessageStream<WidgetUIMessage>({
    execute: async ({ writer }) => {
      try {
        writer.write({
          type: "start",
          messageId: assistantMessageId,
        });

        const streamed = await createChatbotRagAnswerStream({
          db,
          encryptionKey,
          chatbotId: prepared.chatbotId,
          organizationId: prepared.organizationId,
          question: prepared.question,
          history: prepared.history,
          abortSignal,
        });

        if (streamed.status !== "answered") {
          throw new Error(`Widget RAG failed: ${streamed.status}`);
        }

        for await (const partial of streamed.partialOutputStream) {
          if (abortSignal.aborted) {
            writer.write({
              type: "abort",
              reason: "Client disconnected",
            });
            return;
          }

          if (partial.answer === undefined) {
            continue;
          }

          writer.write({
            type: "data-answer",
            id: "answer",
            data: {
              text: partial.answer,
            },
          });
        }

        if (abortSignal.aborted) {
          writer.write({
            type: "abort",
            reason: "Client disconnected",
          });
          return;
        }

        const completed = await streamed.complete();

        if (abortSignal.aborted) {
          writer.write({
            type: "abort",
            reason: "Client disconnected",
          });
          return;
        }

        const finalized = await finalizeWidgetAnswer({
          db,
          assistantMessageId,
          prepared,
          completed,
        });

        if (finalized.status !== "finalized") {
          throw new Error(`Widget answer finalize failed: ${finalized.status}`);
        }

        writer.write({
          type: "data-answer",
          id: "answer",
          data: {
            text: finalized.assistantMessage.content,
          },
        });

        writer.write({
          type: "data-citations",
          id: "citations",
          data: finalized.assistantMessage.citations,
        });

        writer.write({
          type: "message-metadata",
          messageMetadata: {
            createdAt: finalized.assistantMessage.createdAt,
            traceId: finalized.traceId,
          },
        });

        writer.write({
          type: "finish",
          finishReason: "stop",
        });
      } finally {
        onSettled?.();
      }
    },

    onError: (error) => {
      console.error("Widget UI stream failed", error);
      return "Chat response generation failed.";
    },
  });

  return createUIMessageStreamResponse({ stream });
};

const activeResumeSessionIds = new Set<string>();

export const createWidgetMessagesRoute = ({
  db,
  encryptionKey,
}: CreateWidgetMessagesRouteOptions) =>
  new Hono<WidgetSessionEnv>()
    .use("*", requireWidgetSessionAccess(db))
    .get("/", async (c) => {
      const session = c.get("widgetSession");

      // Fetch the returned access Session's Messages
      const result = await listWidgetMessages({
        db,
        session,
      });

      return c.json({
        messages: result.messages,
      });
    })
    .post("/", createWidgetMessageValidator, async (c) => {
      const session = c.get("widgetSession");
      const input = c.req.valid("json");

      const preparedResult = await prepareWidgetMessage({
        db,
        session,
        content: input.content,
      });

      if (preparedResult.status === "unanswered_message_exists") {
        return c.json(
          {
            code: "UNANSWERED_MESSAGE_EXISTS",
            message: "Resume the unanswered message first.",
          },
          409
        );
      }

      return streamWidgetRagResponse({
        db,
        encryptionKey,
        prepared: preparedResult.prepared,
        abortSignal: c.req.raw.signal,
      });
    })
    .post("/resume", async (c) => {
      const session = c.get("widgetSession");

      if (activeResumeSessionIds.has(session.id)) {
        return c.json(
          {
            code: "RESUME_ALREADY_ACTIVE",
            message: "An answer is already being resumed for this session.",
          },
          409
        );
      }

      activeResumeSessionIds.add(session.id);
      const releaseResume = () => {
        activeResumeSessionIds.delete(session.id);
      };

      try {
        const preparedResult = await prepareWidgetResume({
          db,
          session,
        });

        if (preparedResult.status === "no_unanswered_message") {
          releaseResume();

          return c.json(
            {
              code: "NO_UNANSWERED_MESSAGE",
              message: "The session has no unanswered user message to resume.",
            },
            409
          );
        }

        return streamWidgetRagResponse({
          db,
          encryptionKey,
          prepared: preparedResult.prepared,
          abortSignal: c.req.raw.signal,
          onSettled: releaseResume,
        });
      } catch (error) {
        releaseResume();
        throw error;
      }
    });
