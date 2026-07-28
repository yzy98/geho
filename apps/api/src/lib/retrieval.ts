import type { DbClient } from "@geho/db";
import { and, cosineDistance, desc, eq, gt, sql } from "@geho/db/helper";
import { knowledgeChunk, knowledgeSource } from "@geho/db/schema";

export const DEFAULT_RETRIEVAL_LIMIT = 5;
export const DEFAULT_RETRIEVAL_MIN_SIMILARITY = 0.5;

export type RetrievedChunkBase = {
  chunkId: string;
  sourceId: string;
  sourceTitle: string;
  chunkIndex: number;
  content: string;
};

export type VectorRetrievedChunk = RetrievedChunkBase & {
  vectorSimilarity: number;
  lexicalRank?: never;
};

export type LexicalRetrievedChunk = RetrievedChunkBase & {
  vectorSimilarity?: number;
  lexicalRank: number;
};

export type RetrievedChunk = VectorRetrievedChunk | LexicalRetrievedChunk;

type RetrieveVectorChunksOptions = {
  db: DbClient;
  knowledgeBaseId: string;
  organizationId: string;
  queryEmbedding: number[];
  limit?: number;
  minSimilarity?: number;
};

export const retrieveVectorChunks = ({
  db,
  knowledgeBaseId,
  organizationId,
  queryEmbedding,
  limit = DEFAULT_RETRIEVAL_LIMIT,
  minSimilarity = DEFAULT_RETRIEVAL_MIN_SIMILARITY,
}: RetrieveVectorChunksOptions): Promise<VectorRetrievedChunk[]> => {
  const vectorSimilarity = sql<number>`1 - (${cosineDistance(knowledgeChunk.embedding, queryEmbedding)})`;

  return db
    .select({
      chunkId: knowledgeChunk.id,
      sourceId: knowledgeChunk.sourceId,
      sourceTitle: knowledgeSource.title,
      chunkIndex: knowledgeChunk.chunkIndex,
      content: knowledgeChunk.content,
      vectorSimilarity,
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
        gt(vectorSimilarity, minSimilarity)
      )
    )
    .orderBy((table) => desc(table.vectorSimilarity))
    .limit(limit);
};

type RetrieveLexicalChunksOptions = {
  db: DbClient;
  knowledgeBaseId: string;
  organizationId: string;
  query: string;
  limit?: number;
};

export const retrieveLexicalChunks = ({
  db,
  knowledgeBaseId,
  organizationId,
  query,
  limit = DEFAULT_RETRIEVAL_LIMIT,
}: RetrieveLexicalChunksOptions): Promise<LexicalRetrievedChunk[]> => {
  const searchVector = sql`to_tsvector('simple', ${knowledgeChunk.content})`;
  const searchQuery = sql`websearch_to_tsquery('simple', ${query})`;

  const lexicalRank = sql<number>`ts_rank_cd(${searchVector}, ${searchQuery})`;

  return db
    .select({
      chunkId: knowledgeChunk.id,
      sourceId: knowledgeChunk.sourceId,
      sourceTitle: knowledgeSource.title,
      chunkIndex: knowledgeChunk.chunkIndex,
      content: knowledgeChunk.content,
      lexicalRank,
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
        sql`${searchVector} @@ ${searchQuery}`
      )
    )
    .orderBy((table) => desc(table.lexicalRank))
    .limit(limit);
};
