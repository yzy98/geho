import { createChatModel } from "@geho/ai";
import type { DbClient } from "@geho/db";
import { and, eq } from "@geho/db/helper";
import {
  chatbot,
  modelProvider,
  type RagTraceCitation,
  type RagTraceRetrievedChunk,
} from "@geho/db/schema";
import {
  generateRagAnswer,
  type RagHistoryMessage,
  streamRagAnswer,
} from "@geho/rag";
import { decryptApiKey } from "../lib/api-key-encryption";
import { retrieveKnowledgeChunks } from "./knowledge-retrieval";

export type GenerateChatbotRagAnswerOptions = {
  db: DbClient;
  encryptionKey: Uint8Array;
  organizationId: string;
  chatbotId: string;
  question: string;
  history: RagHistoryMessage[];
};

export type GenerateChatbotRagAnswerResult =
  | {
      status: "answered";
      answer: string;
      knowledgeBaseId: string;
      modelId: string;
      promptPreview: string;
      citations: RagTraceCitation[];
      retrievedChunks: RagTraceRetrievedChunk[];
      latencyMs: number;
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

export type GenerateChatbotRagAnswer = (
  options: GenerateChatbotRagAnswerOptions
) => Promise<GenerateChatbotRagAnswerResult>;

const getChatbotForRagAnswer = async ({
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
        provider: modelProvider.provider,
        modelId: modelProvider.modelId,
        baseUrl: modelProvider.baseUrl,
        encryptedApiKey: modelProvider.encryptedApiKey,
      },
    })
    .from(chatbot)
    .innerJoin(
      modelProvider,
      and(
        eq(chatbot.organizationId, modelProvider.organizationId),
        eq(chatbot.chatProviderId, modelProvider.id),
        eq(modelProvider.capability, "chat")
      )
    )
    .where(
      and(eq(chatbot.organizationId, organizationId), eq(chatbot.id, chatbotId))
    )
    .limit(1);

  return rows[0] ?? null;
};

export const generateChatbotRagAnswer: GenerateChatbotRagAnswer = async ({
  db,
  encryptionKey,
  organizationId,
  chatbotId,
  question,
  history,
}) => {
  // Record the service fn start time
  const startedAt = Date.now();

  // Find the current chatbot with its chat provider
  const matchedChatbot = await getChatbotForRagAnswer({
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
      query: question,
    },
  });

  if (retrievalResult.status !== "retrieved") {
    return {
      status: "retrieval_failed",
    };
  }

  try {
    // Decrypt chatbot's chat provider's encryptedApiKey
    const apiKey = await decryptApiKey({
      encryptedApiKey: matchedChatbot.chatProvider.encryptedApiKey,
      encryptionKey,
    });

    // Create the chat model
    const model = createChatModel({
      apiKey,
      modelId: matchedChatbot.chatProvider.modelId,
      provider: matchedChatbot.chatProvider.provider,
      baseURL: matchedChatbot.chatProvider.baseUrl,
    });

    // Generate rag answer
    const generated = await generateRagAnswer({
      model,
      question,
      history,
      chunks: retrievalResult.chunks,
      instructions: matchedChatbot.chatbot.systemInstructions,
    });

    return {
      status: "answered",
      answer: generated.answer,
      citations: generated.citations,
      promptPreview: generated.promptPreview,
      knowledgeBaseId: matchedChatbot.chatbot.knowledgeBaseId,
      modelId: matchedChatbot.chatProvider.modelId,
      retrievedChunks: retrievalResult.chunks,
      latencyMs: Date.now() - startedAt,
    };
  } catch {
    return {
      status: "chat_provider_failed",
    };
  }
};

export type CreateChatbotRagAnswerStreamOptions = {
  db: DbClient;
  encryptionKey: Uint8Array;
  organizationId: string;
  chatbotId: string;
  question: string;
  history: RagHistoryMessage[];
  abortSignal?: AbortSignal;
};

export type CompletedChatbotRagAnswer = {
  answer: string;
  knowledgeBaseId: string;
  modelId: string;
  promptPreview: string;
  citations: RagTraceCitation[];
  retrievedChunks: RagTraceRetrievedChunk[];
  latencyMs: number;
};

export type CreateChatbotRagAnswerStreamResult =
  | {
      status: "answered";
      partialOutputStream: ReturnType<
        typeof streamRagAnswer
      >["partialOutputStream"];
      complete: () => Promise<CompletedChatbotRagAnswer>;
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

export const createChatbotRagAnswerStream = async ({
  db,
  encryptionKey,
  organizationId,
  chatbotId,
  question,
  history,
  abortSignal,
}: CreateChatbotRagAnswerStreamOptions): Promise<CreateChatbotRagAnswerStreamResult> => {
  // Record the start time
  const startedAt = Date.now();

  // Find the current chatbot with its chat provider
  const matchedChatbot = await getChatbotForRagAnswer({
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
      query: question,
    },
    ...(abortSignal ? { abortSignal } : {}),
  });

  if (retrievalResult.status !== "retrieved") {
    return {
      status: "retrieval_failed",
    };
  }

  try {
    // Decrypt chatbot's chat provider's encryptedApiKey
    const apiKey = await decryptApiKey({
      encryptedApiKey: matchedChatbot.chatProvider.encryptedApiKey,
      encryptionKey,
    });

    // Create the chat model
    const model = createChatModel({
      apiKey,
      modelId: matchedChatbot.chatProvider.modelId,
      provider: matchedChatbot.chatProvider.provider,
      baseURL: matchedChatbot.chatProvider.baseUrl,
    });

    const streamed = streamRagAnswer({
      model,
      question,
      history,
      chunks: retrievalResult.chunks,
      instructions: matchedChatbot.chatbot.systemInstructions,
      ...(abortSignal ? { abortSignal } : {}),
    });

    return {
      status: "answered",
      partialOutputStream: streamed.partialOutputStream,
      complete: async () => {
        const result = await streamed.complete();

        return {
          answer: result.answer,
          citations: result.citations,
          promptPreview: result.promptPreview,
          knowledgeBaseId: matchedChatbot.chatbot.knowledgeBaseId,
          modelId: matchedChatbot.chatProvider.modelId,
          retrievedChunks: retrievalResult.chunks,
          latencyMs: Date.now() - startedAt,
        };
      },
    };
  } catch {
    return { status: "chat_provider_failed" };
  }
};
