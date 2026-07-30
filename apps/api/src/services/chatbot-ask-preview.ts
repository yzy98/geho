import { randomUUID } from "node:crypto";
import type { DbClient } from "@geho/db";
import { type RagTraceCitation, ragTrace } from "@geho/db/schema";
import type { AskChatbotPreviewInput } from "../schemas/ask-preview";
import { generateChatbotRagAnswer } from "./chatbot-rag-answer";

export type AskChatbotPreviewOptions = {
  db: DbClient;
  encryptionKey: Uint8Array;
  organizationId: string;
  chatbotId: string;
  input: AskChatbotPreviewInput;
};

export type AskChatbotPreviewResult =
  | {
      status: "answered";
      answer: string;
      citations: RagTraceCitation[];
      traceId: string;
    }
  | {
      status: "chatbot_not_found";
    }
  | {
      status: "retrieval_failed";
    }
  | {
      status: "chat_provider_failed";
    };

export const askChatbotPreview = async ({
  db,
  encryptionKey,
  chatbotId,
  organizationId,
  input,
}: AskChatbotPreviewOptions): Promise<AskChatbotPreviewResult> => {
  const generated = await generateChatbotRagAnswer({
    db,
    encryptionKey,
    chatbotId,
    organizationId,
    question: input.question,
    history: [],
  });

  if (generated.status === "chatbot_not_found") {
    return {
      status: "chatbot_not_found",
    };
  }

  if (generated.status === "retrieval_failed") {
    return {
      status: "retrieval_failed",
    };
  }

  if (generated.status === "chat_provider_failed") {
    return {
      status: "chat_provider_failed",
    };
  }

  // Insert into rag_trace table
  const traceId = randomUUID();
  const now = new Date();

  await db.insert(ragTrace).values({
    id: traceId,
    organizationId,
    chatbotId,
    origin: "preview",
    messageId: null,
    knowledgeBaseId: generated.knowledgeBaseId,
    modelId: generated.modelId,
    question: input.question,
    answer: generated.answer,
    promptPreview: generated.promptPreview,
    citations: generated.citations,
    retrievedChunks: generated.retrievedChunks,
    latencyMs: generated.latencyMs,
    lexicalQuery: generated.lexicalQuery,
    retrievalMetadata: generated.retrievalMetadata,
    createdAt: now,
  });

  return {
    status: "answered",
    answer: generated.answer,
    citations: generated.citations,
    traceId,
  };
};
