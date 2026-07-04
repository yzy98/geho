import { randomUUID } from "node:crypto";
import type { DbClient } from "@heho/db";
import { and, desc, eq } from "@heho/db/helper";
import { knowledgeBase, llmProvider } from "@heho/db/schema";
import { hasOwnerRole } from "../lib/helpers";
import type { CreateKnowledgeBaseInput } from "../schemas/knowledge-bases";
import { getCurrentOrganization } from "./organizations";

export type KnowledgeBaseDto = Omit<
  typeof knowledgeBase.$inferSelect,
  "organizationId"
>;

export type KnowledgeBaseDetailsDto = KnowledgeBaseDto & {
  embeddingProvider: {
    id: string;
    name: string;
    provider: string;
    model: string;
  };
};

export type CreateKnowledgeBaseOptions = {
  db: DbClient;
  input: CreateKnowledgeBaseInput;
  userId: string;
};

export type ListKnowledgeBasesOptions = {
  db: DbClient;
  userId: string;
};

export type GetKnowledgeBaseOptions = {
  db: DbClient;
  userId: string;
  knowledgeBaseId: string;
};

export type CreateKnowledgeBaseResult =
  | {
      status: "created";
      knowledgeBase: KnowledgeBaseDto;
    }
  | {
      status: "organization_membership_required";
    }
  | {
      status: "insufficient_role";
    }
  | {
      status: "invalid_embedding_provider";
    };

export type ListKnowledgeBasesResult =
  | {
      status: "success";
      knowledgeBases: KnowledgeBaseDto[];
    }
  | {
      status: "organization_membership_required";
    };

export type GetKnowledgeBaseResult =
  | {
      status: "success";
      knowledgeBase: KnowledgeBaseDetailsDto;
    }
  | {
      status: "organization_membership_required";
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
  userId,
}: CreateKnowledgeBaseOptions): Promise<CreateKnowledgeBaseResult> => {
  // Get current organization
  const organization = await getCurrentOrganization(db, userId);

  // No organization for current user
  if (!organization) {
    return {
      status: "organization_membership_required",
    };
  }

  // Only the organization owner can create knowledge base
  if (!hasOwnerRole(organization.role)) {
    return {
      status: "insufficient_role",
    };
  }

  // Check if the provided embedding provider exists in the current organization
  const embeddingProviders = await db
    .select({
      id: llmProvider.id,
    })
    .from(llmProvider)
    .where(
      and(
        eq(llmProvider.organizationId, organization.id),
        eq(llmProvider.id, input.embeddingProviderId),
        eq(llmProvider.capability, "embedding")
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
      organizationId: organization.id,
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
  userId,
}: ListKnowledgeBasesOptions): Promise<ListKnowledgeBasesResult> => {
  // Get current organization
  const organization = await getCurrentOrganization(db, userId);

  // No organization for current user
  if (!organization) {
    return {
      status: "organization_membership_required",
    };
  }

  const knowledgeBases = await db
    .select(knowledgeBaseSelection)
    .from(knowledgeBase)
    .where(eq(knowledgeBase.organizationId, organization.id))
    .orderBy(desc(knowledgeBase.createdAt));

  return {
    status: "success",
    knowledgeBases,
  };
};

export const getKnowledgeBase = async ({
  db,
  knowledgeBaseId,
  userId,
}: GetKnowledgeBaseOptions): Promise<GetKnowledgeBaseResult> => {
  // Get current organization
  const organization = await getCurrentOrganization(db, userId);

  // No organization for current user
  if (!organization) {
    return {
      status: "organization_membership_required",
    };
  }

  const rows = await db
    .select({
      ...knowledgeBaseSelection,
      embeddingProvider: {
        id: llmProvider.id,
        name: llmProvider.name,
        provider: llmProvider.provider,
        model: llmProvider.model,
      },
    })
    .from(knowledgeBase)
    .innerJoin(
      llmProvider,
      and(
        eq(knowledgeBase.organizationId, llmProvider.organizationId),
        eq(knowledgeBase.embeddingProviderId, llmProvider.id)
      )
    )
    .where(
      and(
        eq(knowledgeBase.organizationId, organization.id),
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
