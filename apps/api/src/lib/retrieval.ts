import type { DbClient } from "@geho/db";
import { and, cosineDistance, desc, eq, gt, sql } from "@geho/db/helper";
import { knowledgeChunk, knowledgeSource } from "@geho/db/schema";

export const DEFAULT_RETRIEVAL_LIMIT = 5;
export const DEFAULT_RETRIEVAL_MIN_SIMILARITY = 0.5;

type FindSimilarKnowledgeChunksOptions = {
  db: DbClient;
  knowledgeBaseId: string;
  organizationId: string;
  queryEmbedding: number[];
  limit?: number;
  minSimilarity?: number;
};

export const findSimilarKnowledgeChunks = async ({
  db,
  knowledgeBaseId,
  organizationId,
  queryEmbedding,
  limit = DEFAULT_RETRIEVAL_LIMIT,
  minSimilarity = DEFAULT_RETRIEVAL_MIN_SIMILARITY,
}: FindSimilarKnowledgeChunksOptions) => {
  const similarity = sql<number>`1 - (${cosineDistance(knowledgeChunk.embedding, queryEmbedding)})`;

  return await db
    .select({
      chunkId: knowledgeChunk.id,
      sourceId: knowledgeChunk.sourceId,
      sourceTitle: knowledgeSource.title,
      chunkIndex: knowledgeChunk.chunkIndex,
      content: knowledgeChunk.content,
      similarity,
    })
    .from(knowledgeChunk)
    .innerJoin(
      knowledgeSource,
      and(
        eq(knowledgeChunk.organizationId, knowledgeSource.organizationId),
        eq(knowledgeChunk.sourceId, knowledgeSource.id)
      )
    )
    .where(
      and(
        eq(knowledgeChunk.organizationId, organizationId),
        eq(knowledgeSource.organizationId, organizationId),
        eq(knowledgeSource.knowledgeBaseId, knowledgeBaseId),
        eq(knowledgeSource.status, "ready"),
        gt(similarity, minSimilarity)
      )
    )
    .orderBy((table) => desc(table.similarity))
    .limit(limit);
};

export type RagChunk = Awaited<
  ReturnType<typeof findSimilarKnowledgeChunks>
>[number];
