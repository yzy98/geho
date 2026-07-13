import { randomUUID } from "node:crypto";
import type { DbClient } from "@heho/db";
import { and, count, desc, eq } from "@heho/db/helper";
import {
  knowledgeBase,
  knowledgeChunk,
  knowledgeSource,
} from "@heho/db/schema";
import type {
  CreateTextKnowledgeSourceInput,
  KnowledgeSourceDto,
} from "../schemas/knowledge-sources";

export type CreateKnowledgeSourceOptions = {
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

export type CreateKnowledgeSourceResult =
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
  db: DbClient;
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

export const createKnowledgeSource = async ({
  db,
  input,
  knowledgeBaseId,
  organizationId,
}: CreateKnowledgeSourceOptions): Promise<CreateKnowledgeSourceResult> => {
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

  // Insert into db
  const now = new Date();

  const insertedSources = await db
    .insert(knowledgeSource)
    .values({
      id: randomUUID(),
      organizationId,
      knowledgeBaseId,
      title: input.title,
      rawContent: input.content,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    })
    .returning(sourceSelection);

  const insertedSource = insertedSources[0];

  if (!insertedSource) {
    throw new Error("Knowledge source insert returned no record");
  }

  return {
    status: "created",
    source: {
      ...insertedSource,
      chunkCount: 0,
    },
  };
};
