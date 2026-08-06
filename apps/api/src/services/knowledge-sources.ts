import { randomUUID } from "node:crypto";
import type { DbClient } from "@geho/db";
import { and, count, desc, eq } from "@geho/db/helper";
import {
  knowledgeBase,
  knowledgeChunk,
  knowledgeSource,
  outboxEvent,
} from "@geho/db/schema";
import { knowledgeSourceIngestionRequestedEventType } from "@geho/shared";
import type {
  CreateTextKnowledgeSourceInput,
  KnowledgeSourceDto,
} from "../schemas/knowledge-sources";

type DbTransaction = Parameters<Parameters<DbClient["transaction"]>[0]>[0];

export type CreateKnowledgeSourceAndRequestIngestionOptions = {
  db: DbClient;
  input: CreateTextKnowledgeSourceInput;
  knowledgeBaseId: string;
  organizationId: string;
};

export type ListKnowledgeSourcesOptions = {
  db: DbClient;
  knowledgeBaseId: string;
  organizationId: string;
};

export type CreateKnowledgeSourceAndRequestIngestionResult =
  | {
      status: "created";
      source: KnowledgeSourceDto;
    }
  | {
      status: "knowledge_base_not_found";
    };

export type ListKnowledgeSourcesResult =
  | {
      status: "success";
      sources: KnowledgeSourceDto[];
    }
  | {
      status: "knowledge_base_not_found";
    };

const sourceSelection = {
  id: knowledgeSource.id,
  knowledgeBaseId: knowledgeSource.knowledgeBaseId,
  title: knowledgeSource.title,
  status: knowledgeSource.status,
  errorCode: knowledgeSource.errorCode,
  errorMessage: knowledgeSource.errorMessage,
  createdAt: knowledgeSource.createdAt,
  updatedAt: knowledgeSource.updatedAt,
};

const knowledgeBaseExists = async ({
  db,
  knowledgeBaseId,
  organizationId,
}: {
  db: DbClient | DbTransaction;
  knowledgeBaseId: string;
  organizationId: string;
}) => {
  const rows = await db
    .select({
      id: knowledgeBase.id,
    })
    .from(knowledgeBase)
    .where(
      and(
        eq(knowledgeBase.id, knowledgeBaseId),
        eq(knowledgeBase.organizationId, organizationId)
      )
    )
    .limit(1);

  return Boolean(rows[0]);
};

const getSourceDtos = async ({
  db,
  knowledgeBaseId,
  organizationId,
}: {
  db: DbClient;
  knowledgeBaseId: string;
  organizationId: string;
}): Promise<KnowledgeSourceDto[]> => {
  const rows = await db
    .select({
      ...sourceSelection,
      chunkCount: count(knowledgeChunk.id),
    })
    .from(knowledgeSource)
    .leftJoin(
      knowledgeChunk,
      and(
        eq(knowledgeSource.organizationId, knowledgeChunk.organizationId),
        eq(knowledgeSource.id, knowledgeChunk.sourceId)
      )
    )
    .where(
      and(
        eq(knowledgeSource.organizationId, organizationId),
        eq(knowledgeSource.knowledgeBaseId, knowledgeBaseId)
      )
    )
    .groupBy(
      knowledgeSource.id,
      knowledgeSource.knowledgeBaseId,
      knowledgeSource.title,
      knowledgeSource.status,
      knowledgeSource.errorCode,
      knowledgeSource.errorMessage,
      knowledgeSource.createdAt,
      knowledgeSource.updatedAt
    )
    .orderBy(desc(knowledgeSource.createdAt), desc(knowledgeSource.id));

  return rows;
};

export const listKnowledgeSources = async ({
  db,
  knowledgeBaseId,
  organizationId,
}: ListKnowledgeSourcesOptions): Promise<ListKnowledgeSourcesResult> => {
  // Check if the provided knowledge base exists
  const exists = await knowledgeBaseExists({
    db,
    knowledgeBaseId,
    organizationId,
  });

  if (!exists) {
    return {
      status: "knowledge_base_not_found",
    };
  }

  const sources = await getSourceDtos({
    db,
    knowledgeBaseId,
    organizationId,
  });

  return {
    status: "success",
    sources,
  };
};

export const createKnowledgeSourceAndRequestIngestion = ({
  db,
  input,
  knowledgeBaseId,
  organizationId,
}: CreateKnowledgeSourceAndRequestIngestionOptions): Promise<CreateKnowledgeSourceAndRequestIngestionResult> =>
  db.transaction(
    async (tx): Promise<CreateKnowledgeSourceAndRequestIngestionResult> => {
      // Check if the provided knowledge base exists
      const exists = await knowledgeBaseExists({
        db: tx,
        knowledgeBaseId,
        organizationId,
      });

      if (!exists) {
        return {
          status: "knowledge_base_not_found",
        };
      }

      // Insert into db
      const now = new Date();
      const sourceId = randomUUID();

      const insertedSources = await tx
        .insert(knowledgeSource)
        .values({
          id: sourceId,
          organizationId,
          knowledgeBaseId,
          title: input.title,
          rawContent: input.content,
          status: "pending",
          createdAt: now,
          updatedAt: now,
        })
        .returning(sourceSelection);

      const source = insertedSources[0];

      if (!source) {
        throw new Error("Knowledge source insert returned no record");
      }

      await tx.insert(outboxEvent).values({
        id: randomUUID(),
        eventType: knowledgeSourceIngestionRequestedEventType,
        payload: {
          sourceId,
          organizationId,
        },
        attemptCount: 0,
        nextAttemptAt: now,
        createdAt: now,
      });

      return {
        status: "created",
        source: {
          ...source,
          chunkCount: 0,
        },
      };
    }
  );
