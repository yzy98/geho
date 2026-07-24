import { createEmbeddingModel } from "@geho/ai";
import type { DbClient } from "@geho/db";
import { and, eq } from "@geho/db/helper";
import { knowledgeBase, modelProvider } from "@geho/db/schema";
import { decryptApiKey } from "../lib/api-key-encryption";
import { findSimilarKnowledgeChunks, type RagChunk } from "../lib/retrieval";
import type { RetrievalPreviewInput } from "../schemas/knowledge-bases";

export type RetrieveKnowledgeChunksOptions = {
  db: DbClient;
  encryptionKey: Uint8Array;
  organizationId: string;
  knowledgeBaseId: string;
  input: RetrievalPreviewInput;
  abortSignal?: AbortSignal;
};

export type RetrieveKnowledgeChunksResult =
  | {
      status: "retrieved";
      chunks: RagChunk[];
    }
  | {
      status: "knowledge_base_not_found";
    }
  | {
      status: "embedding_provider_failed";
    };

const getKnowledgeBaseEmbeddingProvider = async ({
  db,
  knowledgeBaseId,
  organizationId,
}: {
  db: DbClient;
  knowledgeBaseId: string;
  organizationId: string;
}) => {
  const rows = await db
    .select({
      knowledgeBaseId: knowledgeBase.id,
      embeddingProvider: {
        id: modelProvider.id,
        provider: modelProvider.provider,
        modelId: modelProvider.modelId,
        baseUrl: modelProvider.baseUrl,
        encryptedApiKey: modelProvider.encryptedApiKey,
      },
    })
    .from(knowledgeBase)
    .innerJoin(
      modelProvider,
      and(
        eq(knowledgeBase.organizationId, modelProvider.organizationId),
        eq(knowledgeBase.embeddingProviderId, modelProvider.id),
        eq(modelProvider.capability, "embedding")
      )
    )
    .where(
      and(
        eq(knowledgeBase.organizationId, organizationId),
        eq(knowledgeBase.id, knowledgeBaseId)
      )
    )
    .limit(1);

  return rows[0]?.embeddingProvider ?? null;
};

export const retrieveKnowledgeChunks = async ({
  db,
  encryptionKey,
  organizationId,
  knowledgeBaseId,
  input,
  abortSignal,
}: RetrieveKnowledgeChunksOptions): Promise<RetrieveKnowledgeChunksResult> => {
  const { query, limit, minSimilarity } = input;

  // Find the current knowledge base's embedding provider
  const embeddingProvider = await getKnowledgeBaseEmbeddingProvider({
    db,
    organizationId,
    knowledgeBaseId,
  });

  if (!embeddingProvider) {
    return {
      status: "knowledge_base_not_found",
    };
  }

  let queryEmbedding: number[];

  try {
    // Decrypt embedding provider's encryptedApiKey
    const apiKey = await decryptApiKey({
      encryptedApiKey: embeddingProvider.encryptedApiKey,
      encryptionKey,
    });

    // Create the embedding model
    const model = createEmbeddingModel({
      apiKey,
      modelId: embeddingProvider.modelId,
      provider: embeddingProvider.provider,
      baseURL: embeddingProvider.baseUrl,
    });

    // Generate query embedding
    queryEmbedding = await model.embedQuery(query, {
      ...(abortSignal ? { abortSignal } : {}),
    });
  } catch {
    return {
      status: "embedding_provider_failed",
    };
  }

  // Find similar chunks under the current knowledge base
  const chunks = await findSimilarKnowledgeChunks({
    db,
    knowledgeBaseId,
    organizationId,
    queryEmbedding,
    ...(limit === undefined ? {} : { limit }),
    ...(minSimilarity === undefined ? {} : { minSimilarity }),
  });

  return {
    status: "retrieved",
    chunks,
  };
};
