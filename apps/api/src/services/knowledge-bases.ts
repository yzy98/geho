import { randomUUID } from "node:crypto";
import type { DbClient } from "@geho/db";
import { and, desc, eq } from "@geho/db/helper";
import { knowledgeBase, modelProvider } from "@geho/db/schema";
import type { CreateKnowledgeBaseInput } from "../schemas/knowledge-bases";

export type KnowledgeBaseDto = Omit<
  typeof knowledgeBase.$inferSelect,
  "organizationId"
>;

export type KnowledgeBaseDetailsDto = KnowledgeBaseDto & {
  embeddingProvider: {
    id: string;
    name: string;
    provider: string;
    modelId: string;
  };
};

export type CreateKnowledgeBaseOptions = {
  db: DbClient;
  input: CreateKnowledgeBaseInput;
  organizationId: string;
};

export type ListKnowledgeBasesOptions = {
  db: DbClient;
  organizationId: string;
};

export type GetKnowledgeBaseOptions = {
  db: DbClient;
  organizationId: string;
  knowledgeBaseId: string;
};

export type CreateKnowledgeBaseResult =
  | {
      status: "created";
      knowledgeBase: KnowledgeBaseDto;
    }
  | {
      status: "invalid_embedding_provider";
    };

export type ListKnowledgeBasesResult = {
  status: "success";
  knowledgeBases: KnowledgeBaseDto[];
};

export type GetKnowledgeBaseResult =
  | {
      status: "success";
      knowledgeBase: KnowledgeBaseDetailsDto;
    }
  | {
      status: "not_found";
    };

const knowledgeBaseSelection = {
  id: knowledgeBase.id,
  name: knowledgeBase.name,
  embeddingProviderId: knowledgeBase.embeddingProviderId,
  createdAt: knowledgeBase.createdAt,
  updatedAt: knowledgeBase.updatedAt,
};

export const createKnowledgeBase = async ({
  db,
  input,
  organizationId,
}: CreateKnowledgeBaseOptions): Promise<CreateKnowledgeBaseResult> => {
  // Check if the provided embedding provider exists in the current organization
  const embeddingProviders = await db
    .select({
      id: modelProvider.id,
    })
    .from(modelProvider)
    .where(
      and(
        eq(modelProvider.organizationId, organizationId),
        eq(modelProvider.id, input.embeddingProviderId),
        eq(modelProvider.capability, "embedding")
      )
    )
    .limit(1);

  const embeddingProvider = embeddingProviders[0];

  if (!embeddingProvider) {
    return {
      status: "invalid_embedding_provider",
    };
  }

  // Insert db
  const now = new Date();

  const rows = await db
    .insert(knowledgeBase)
    .values({
      id: randomUUID(),
      organizationId,
      name: input.name,
      embeddingProviderId: embeddingProvider.id,
      createdAt: now,
      updatedAt: now,
    })
    .returning(knowledgeBaseSelection);

  const createdKnowledge = rows[0];

  if (!createdKnowledge) {
    throw new Error("Knowledge base insert returned no record");
  }

  return {
    status: "created",
    knowledgeBase: createdKnowledge,
  };
};

export const listKnowledgeBases = async ({
  db,
  organizationId,
}: ListKnowledgeBasesOptions): Promise<ListKnowledgeBasesResult> => {
  const knowledgeBases = await db
    .select(knowledgeBaseSelection)
    .from(knowledgeBase)
    .where(eq(knowledgeBase.organizationId, organizationId))
    .orderBy(desc(knowledgeBase.createdAt), desc(knowledgeBase.id));

  return {
    status: "success",
    knowledgeBases,
  };
};

export const getKnowledgeBase = async ({
  db,
  knowledgeBaseId,
  organizationId,
}: GetKnowledgeBaseOptions): Promise<GetKnowledgeBaseResult> => {
  const rows = await db
    .select({
      ...knowledgeBaseSelection,
      embeddingProvider: {
        id: modelProvider.id,
        name: modelProvider.name,
        provider: modelProvider.provider,
        modelId: modelProvider.modelId,
      },
    })
    .from(knowledgeBase)
    .innerJoin(
      modelProvider,
      and(
        eq(knowledgeBase.organizationId, modelProvider.organizationId),
        eq(knowledgeBase.embeddingProviderId, modelProvider.id)
      )
    )
    .where(
      and(
        eq(knowledgeBase.organizationId, organizationId),
        eq(knowledgeBase.id, knowledgeBaseId)
      )
    )
    .limit(1);

  const matchedKnowledgeBase = rows[0];

  if (!matchedKnowledgeBase) {
    return {
      status: "not_found",
    };
  }

  return {
    status: "success",
    knowledgeBase: matchedKnowledgeBase,
  };
};
