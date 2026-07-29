import { createEmbeddingModel, rewriteLexicalQuery } from "@geho/ai";
import type { DbClient } from "@geho/db";
import { and, eq } from "@geho/db/helper";
import { knowledgeBase, modelProvider } from "@geho/db/schema";
import type { LanguageModel } from "ai";
import { decryptApiKey } from "../lib/api-key-encryption";
import {
  type RetrievedChunk,
  type RetrievedChunkBase,
  retrieveLexicalChunks,
  retrieveVectorChunks,
} from "../lib/retrieval";
import type { RetrievalPreviewInput } from "../schemas/knowledge-bases";

const RRF_K = 60;

export type FusedRetrievedChunk = RetrievedChunkBase & {
  vectorSimilarity?: number;
  lexicalRank?: number;
  fusedScore: number;
};

export type RetrieveKnowledgeChunksOptions = {
  db: DbClient;
  queryRewriteModel?: LanguageModel;
  encryptionKey: Uint8Array;
  organizationId: string;
  knowledgeBaseId: string;
  input: RetrievalPreviewInput;
  abortSignal?: AbortSignal;
};

export type RetrieveKnowledgeChunksResult =
  | {
      status: "retrieved";
      chunks: FusedRetrievedChunk[];
      lexicalQuery: string | null;
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

function fuseCandidates(
  lists: readonly RetrievedChunk[][],
  limit: number
): FusedRetrievedChunk[] {
  const results = new Map<string, FusedRetrievedChunk>();

  for (const list of lists) {
    list.forEach((chunk, index) => {
      const rrfContribution = 1 / (RRF_K + index + 1);
      const existing = results.get(chunk.chunkId);

      if (existing) {
        if (chunk.vectorSimilarity !== undefined) {
          existing.vectorSimilarity = chunk.vectorSimilarity;
        }
        if (chunk.lexicalRank !== undefined) {
          existing.lexicalRank = chunk.lexicalRank;
        }
        existing.fusedScore += rrfContribution;
        return;
      }

      results.set(chunk.chunkId, {
        chunkId: chunk.chunkId,
        sourceId: chunk.sourceId,
        sourceTitle: chunk.sourceTitle,
        chunkIndex: chunk.chunkIndex,
        content: chunk.content,
        ...(chunk.vectorSimilarity === undefined
          ? {}
          : { vectorSimilarity: chunk.vectorSimilarity }),
        ...(chunk.lexicalRank === undefined
          ? {}
          : { lexicalRank: chunk.lexicalRank }),
        fusedScore: rrfContribution,
      });
    });
  }

  return [...results.values()]
    .sort(
      (left, right) =>
        right.fusedScore - left.fusedScore ||
        left.chunkId.localeCompare(right.chunkId)
    )
    .slice(0, limit);
}

export const retrieveKnowledgeChunks = async ({
  db,
  queryRewriteModel,
  encryptionKey,
  organizationId,
  knowledgeBaseId,
  input,
  abortSignal,
}: RetrieveKnowledgeChunksOptions): Promise<RetrieveKnowledgeChunksResult> => {
  const { query, limit, minSimilarity } = input;

  const finalLimit = limit ?? 5;
  const candidateLimit = Math.max(20, finalLimit);

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

  // Query rewrite for lexical retrieval
  const lexicalQuery = queryRewriteModel
    ? await rewriteLexicalQuery({
        model: queryRewriteModel,
        query,
        ...(abortSignal ? { abortSignal } : {}),
      })
    : undefined;

  // Retrieve vector and lexical(full-text) chunks
  const [vectorCandidates, lexicalCandidates] = await Promise.all([
    retrieveVectorChunks({
      db,
      knowledgeBaseId,
      organizationId,
      queryEmbedding,
      limit: candidateLimit,
      minSimilarity: minSimilarity ?? 0.35,
    }),
    retrieveLexicalChunks({
      db,
      knowledgeBaseId,
      organizationId,
      query: lexicalQuery ?? query,
      limit: candidateLimit,
    }),
  ]);

  const fusedChunks = fuseCandidates(
    [vectorCandidates, lexicalCandidates],
    finalLimit
  );

  return {
    status: "retrieved",
    chunks: fusedChunks,
    lexicalQuery: lexicalQuery ?? null,
  };
};
