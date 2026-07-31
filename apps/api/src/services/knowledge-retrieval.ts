import { createEmbeddingModel, rewriteLexicalQuery } from "@geho/ai";
import { decryptApiKey } from "@geho/crypto";
import type { DbClient } from "@geho/db";
import { and, eq } from "@geho/db/helper";
import {
  knowledgeBase,
  modelProvider,
  type RagTraceRetrievalMetadata,
} from "@geho/db/schema";
import type { LanguageModel } from "ai";
import {
  type RetrievedChunk,
  type RetrievedChunkBase,
  retrieveLexicalChunks,
  retrieveVectorChunks,
} from "../lib/retrieval";
import type { RetrievalPreviewInput } from "../schemas/knowledge-bases";

// RRF combines ranking positions instead of adding vector and FTS scores,
// because their numeric scales are not comparable.
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
      retrievalMetadata: RagTraceRetrievalMetadata;
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

function fuseRetrievalCandidates(
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
  const retrievalStartedAt = Date.now();
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

  // The primary pass always uses the original question.
  // This provides the baseline retrieval result and avoids paying for query rewriting
  // when FTS already finds evidence.
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
      query,
      limit: candidateLimit,
    }),
  ]);

  // Rewrite only when semantic retrieval found evidence but simple FTS found none.
  // Do not rewrite when both paths are empty: that is a no-knowledge case.
  const rewriteTriggered =
    vectorCandidates.length > 0 && lexicalCandidates.length === 0;

  // The rewritten query is only for FTS. Reuse the original vector candidates
  // to avoid a second embedding call and preserve the original semantic ranking.
  let candidateLists: readonly RetrievedChunk[][] = [
    vectorCandidates,
    lexicalCandidates,
  ];

  let lexicalQuery: string | null = null;
  let rewriteStatus: RagTraceRetrievalMetadata["rewrite"]["status"] =
    "not_needed";
  let rewrittenLexicalCandidateCount: number | null = null;
  let rewriteLatencyMs: number | null = null;

  if (rewriteTriggered) {
    if (queryRewriteModel) {
      const rewriteStartedAt = Date.now();

      const rewrittenQuery = await rewriteLexicalQuery({
        model: queryRewriteModel,
        query,
        ...(abortSignal ? { abortSignal } : {}),
      });

      rewriteLatencyMs = Date.now() - rewriteStartedAt;

      if (rewrittenQuery === undefined) {
        rewriteStatus = "failed";
      } else {
        const rewrittenLexicalCandidates = await retrieveLexicalChunks({
          db,
          knowledgeBaseId,
          organizationId,
          query: rewrittenQuery,
          limit: candidateLimit,
        });

        candidateLists = [vectorCandidates, rewrittenLexicalCandidates];
        lexicalQuery = rewrittenQuery;
        rewriteStatus = "applied";
        rewrittenLexicalCandidateCount = rewrittenLexicalCandidates.length;
      }
    } else {
      rewriteStatus = "unavailable";
    }
  }

  const fusedChunks = fuseRetrievalCandidates(candidateLists, finalLimit);

  const topVectorSimilarity = vectorCandidates[0]?.vectorSimilarity;

  // Persist enough retrieval diagnostics to calibrate a future low-confidence
  // fallback threshold without storing full intermediate candidate lists.
  const retrievalMetadata: RagTraceRetrievalMetadata = {
    primary: {
      vectorCandidateCount: vectorCandidates.length,
      lexicalCandidateCount: lexicalCandidates.length,
      topVectorSimilarity: topVectorSimilarity ?? null,
    },
    rewrite: {
      status: rewriteStatus,
      lexicalCandidateCount: rewrittenLexicalCandidateCount,
      latencyMs: rewriteLatencyMs,
    },
    final: {
      chunkCount: fusedChunks.length,
    },
    retrievalLatencyMs: Date.now() - retrievalStartedAt,
  };

  return {
    status: "retrieved",
    chunks: fusedChunks,
    lexicalQuery,
    retrievalMetadata,
  };
};
