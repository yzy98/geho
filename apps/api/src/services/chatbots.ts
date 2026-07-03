import { randomUUID } from "node:crypto";
import type { DbClient } from "@heho/db";
import { and, desc, eq } from "@heho/db/helper";
import { chatbot, knowledgeBase, llmProvider } from "@heho/db/schema";
import { hasOwnerRole } from "../lib/helpers";
import type { CreateChatbotInput } from "../schemas/chatbots";
import { getCurrentOrganization } from "./organizations";

export type ChatbotDto = Omit<
  typeof chatbot.$inferSelect,
  "organizationId" | "themeSettings" | "retrievalSettings"
>;

export type CreateChatbotOptions = {
  db: DbClient;
  input: CreateChatbotInput;
  userId: string;
};

export type ListChatbotsOptions = {
  db: DbClient;
  userId: string;
};

export type CreateChatbotResult =
  | {
      status: "created";
      chatbot: ChatbotDto;
    }
  | {
      status: "organization_membership_required";
    }
  | {
      status: "insufficient_role";
    }
  | {
      status: "invalid_chat_provider";
    }
  | {
      status: "invalid_knowledge_base";
    };

export type ListChatbotsResult =
  | {
      status: "success";
      chatbots: ChatbotDto[];
    }
  | {
      status: "organization_membership_required";
    };

const chatbotSelection = {
  id: chatbot.id,
  name: chatbot.name,
  systemInstructions: chatbot.systemInstructions,
  chatProviderId: chatbot.chatProviderId,
  knowledgeBaseId: chatbot.knowledgeBaseId,
  createdAt: chatbot.createdAt,
  updatedAt: chatbot.updatedAt,
};

export const createChatbot = async ({
  db,
  input,
  userId,
}: CreateChatbotOptions): Promise<CreateChatbotResult> => {
  // Get current organization
  const organization = await getCurrentOrganization(db, userId);

  // No organization for current user
  if (!organization) {
    return {
      status: "organization_membership_required",
    };
  }

  // Only the organization owner can create chatbot
  if (!hasOwnerRole(organization.role)) {
    return {
      status: "insufficient_role",
    };
  }

  // Check if the input chat provider exists in the current organization
  const matchedChatProviders = await db
    .select({
      id: llmProvider.id,
    })
    .from(llmProvider)
    .where(
      and(
        eq(llmProvider.organizationId, organization.id),
        eq(llmProvider.id, input.chatProviderId),
        eq(llmProvider.capability, "chat")
      )
    )
    .limit(1);

  const matchedChatProvider = matchedChatProviders[0];

  if (!matchedChatProvider) {
    return {
      status: "invalid_chat_provider",
    };
  }

  // Check if the input knowledge base exists in the current organization
  const matchedKnowledgeBases = await db
    .select({ id: knowledgeBase.id })
    .from(knowledgeBase)
    .where(
      and(
        eq(knowledgeBase.organizationId, organization.id),
        eq(knowledgeBase.id, input.knowledgeBaseId)
      )
    )
    .limit(1);

  const matchedKnowledgeBase = matchedKnowledgeBases[0];

  if (!matchedKnowledgeBase) {
    return {
      status: "invalid_knowledge_base",
    };
  }

  // Insert db
  const now = new Date();

  const rows = await db
    .insert(chatbot)
    .values({
      id: randomUUID(),
      organizationId: organization.id,
      name: input.name,
      systemInstructions: input.systemInstructions,
      chatProviderId: matchedChatProvider.id,
      knowledgeBaseId: matchedKnowledgeBase.id,
      createdAt: now,
      updatedAt: now,
    })
    .returning(chatbotSelection);

  const createdChatbot = rows[0];

  if (!createdChatbot) {
    throw new Error("Chatbot insert returned no record");
  }

  return {
    status: "created",
    chatbot: createdChatbot,
  };
};

export const listChatbots = async ({
  db,
  userId,
}: ListChatbotsOptions): Promise<ListChatbotsResult> => {
  // Get current organization
  const organization = await getCurrentOrganization(db, userId);

  // No organization for current user
  if (!organization) {
    return {
      status: "organization_membership_required",
    };
  }

  const chatbots = await db
    .select(chatbotSelection)
    .from(chatbot)
    .where(eq(chatbot.organizationId, organization.id))
    .orderBy(desc(chatbot.createdAt));

  return {
    status: "success",
    chatbots,
  };
};
