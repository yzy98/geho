import type { DbClient } from "@heho/db";
import { and, eq } from "@heho/db/helper";
import { knowledgeBase, llmProvider } from "@heho/db/schema";
import { decryptApiKey } from "../lib/api-key-encryption";
import { generateEmbedding } from "../lib/embedding";
import { resolveEmbeddingModel } from "../lib/embedding-models";
import { findSimilarKnowledgeChunks } from "../lib/retrieval";
import type { RetrievalPreviewInput } from "../schemas/knowledge-bases";

export type RetrieveKnowledgeChunksOptions = {
  db: DbClient;
  encryptionKey: Uint8Array;
  organizationId: string;
  knowledgeBaseId: string;
  input: RetrievalPreviewInput;
};

type SimilarKnowledgeChunk = Awaited<
  ReturnType<typeof findSimilarKnowledgeChunks>
>[number];

export type RetrieveKnowledgeChunksResult =
  | {
      status: "retrieved";
      chunks: SimilarKnowledgeChunk[];
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
        id: llmProvider.id,
        provider: llmProvider.provider,
        model: llmProvider.model,
        baseUrl: llmProvider.baseUrl,
        encryptedApiKey: llmProvider.encryptedApiKey,
      },
    })
    .from(knowledgeBase)
    .innerJoin(
      llmProvider,
      and(
        eq(knowledgeBase.organizationId, llmProvider.organizationId),
        eq(knowledgeBase.embeddingProviderId, llmProvider.id),
        eq(llmProvider.capability, "embedding")
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

    // Resolve the embedding model
    const model = resolveEmbeddingModel({
      apiKey,
      modelId: embeddingProvider.model,
      provider: embeddingProvider.provider,
      baseUrl: embeddingProvider.baseUrl,
    });

    // Generate query embedding
    queryEmbedding = await generateEmbedding({
      model,
      value: query,
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
