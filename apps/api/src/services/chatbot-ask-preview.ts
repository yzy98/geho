import { randomUUID } from "node:crypto";
import type { DbClient } from "@heho/db";
import { and, eq } from "@heho/db/helper";
import {
  chatbot,
  llmProvider,
  type RagTraceCitation,
  ragTrace,
} from "@heho/db/schema";
import { decryptApiKey } from "../lib/api-key-encryption";
import { resolveChatModel } from "../lib/chat-models";
import { generateRagAnswer } from "../lib/rag";
import type { RagChunk } from "../lib/retrieval";
import type { AskChatbotPreviewInput } from "../schemas/ask-preview";
import { retrieveKnowledgeChunks } from "./knowledge-retrieval";

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

const getChatbotForAskPreview = async ({
  db,
  chatbotId,
  organizationId,
}: {
  db: DbClient;
  organizationId: string;
  chatbotId: string;
}) => {
  const rows = await db
    .select({
      chatbot: {
        id: chatbot.id,
        knowledgeBaseId: chatbot.knowledgeBaseId,
        systemInstructions: chatbot.systemInstructions,
      },
      chatProvider: {
        id: llmProvider.id,
        provider: llmProvider.provider,
        model: llmProvider.model,
        baseUrl: llmProvider.baseUrl,
        encryptedApiKey: llmProvider.encryptedApiKey,
      },
    })
    .from(chatbot)
    .innerJoin(
      llmProvider,
      and(
        eq(chatbot.organizationId, llmProvider.organizationId),
        eq(chatbot.chatProviderId, llmProvider.id),
        eq(llmProvider.capability, "chat")
      )
    )
    .where(
      and(eq(chatbot.organizationId, organizationId), eq(chatbot.id, chatbotId))
    )
    .limit(1);

  return rows[0] ?? null;
};

const getCitations = ({
  citedChunkIds,
  chunks,
}: {
  citedChunkIds: string[];
  chunks: RagChunk[];
}): RagTraceCitation[] => {
  const chunksById = new Map(chunks.map((chunk) => [chunk.chunkId, chunk]));
  const seen = new Set<string>();

  return citedChunkIds.flatMap((chunkId) => {
    if (seen.has(chunkId)) {
      return [];
    }

    const chunk = chunksById.get(chunkId);

    if (!chunk) {
      return [];
    }

    seen.add(chunkId);

    return [
      {
        chunkId: chunk.chunkId,
        sourceId: chunk.sourceId,
        sourceTitle: chunk.sourceTitle,
        chunkIndex: chunk.chunkIndex,
        similarity: chunk.similarity,
      },
    ];
  });
};

export const askChatbotPreview = async ({
  db,
  encryptionKey,
  chatbotId,
  organizationId,
  input,
}: AskChatbotPreviewOptions): Promise<AskChatbotPreviewResult> => {
  // Record the service fn start time
  const startedAt = Date.now();

  // Find the current chatbot with its LLM provider
  const matchedChatbot = await getChatbotForAskPreview({
    db,
    chatbotId,
    organizationId,
  });

  if (!matchedChatbot) {
    return {
      status: "chatbot_not_found",
    };
  }

  // Retrieve knowledge chunks
  const retrievalResult = await retrieveKnowledgeChunks({
    db,
    encryptionKey,
    organizationId,
    knowledgeBaseId: matchedChatbot.chatbot.knowledgeBaseId,
    input: {
      query: input.question,
    },
  });

  if (retrievalResult.status !== "retrieved") {
    return {
      status: "retrieval_failed",
    };
  }

  // Get retrieved chunks
  const chunks = retrievalResult.chunks;

  let answer: string;
  let promptPreview: string;
  let citations: RagTraceCitation[];

  try {
    // Decrypt chatProvider provider's encryptedApiKey
    const apiKey = await decryptApiKey({
      encryptedApiKey: matchedChatbot.chatProvider.encryptedApiKey,
      encryptionKey,
    });

    // Resolve the chat model
    const model = resolveChatModel({
      apiKey,
      modelId: matchedChatbot.chatProvider.model,
      provider: matchedChatbot.chatProvider.provider,
      baseUrl: matchedChatbot.chatProvider.baseUrl,
    });

    // Generate rag answer
    const generated = await generateRagAnswer({
      model,
      chunks,
      question: input.question,
      instructions: matchedChatbot.chatbot.systemInstructions,
    });

    answer = generated.answer.answer;
    promptPreview = generated.prompt;
    citations = getCitations({
      citedChunkIds: generated.answer.citedChunkIds,
      chunks,
    });
  } catch {
    return {
      status: "chat_provider_failed",
    };
  }

  // Insert into rag_trace table
  const traceId = randomUUID();
  const now = new Date();
  const latencyMs = Date.now() - startedAt;

  await db.insert(ragTrace).values({
    id: traceId,
    organizationId,
    chatbotId,
    knowledgeBaseId: matchedChatbot.chatbot.knowledgeBaseId,
    model: matchedChatbot.chatProvider.model,
    question: input.question,
    answer,
    promptPreview,
    citations,
    retrievedChunks: chunks,
    latencyMs,
    createdAt: now,
  });

  return {
    status: "answered",
    answer,
    citations,
    traceId,
  };
};
