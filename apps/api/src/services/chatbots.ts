import { randomUUID } from "node:crypto";
import type { DbClient } from "@heho/db";
import { and, desc, eq } from "@heho/db/helper";
import { chatbot, knowledgeBase, llmProvider } from "@heho/db/schema";
import type { CreateChatbotInput } from "../schemas/chatbots";

export type ChatbotDto = Omit<
  typeof chatbot.$inferSelect,
  "organizationId" | "themeSettings" | "retrievalSettings"
>;

export type CreateChatbotOptions = {
  db: DbClient;
  input: CreateChatbotInput;
  organizationId: string;
};

export type ListChatbotsOptions = {
  db: DbClient;
  organizationId: string;
};

export type CreateChatbotResult =
  | {
      status: "created";
      chatbot: ChatbotDto;
    }
  | {
      status: "invalid_chat_provider";
    }
  | {
      status: "invalid_knowledge_base";
    };

export type ListChatbotsResult = {
  status: "success";
  chatbots: ChatbotDto[];
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
  organizationId,
}: CreateChatbotOptions): Promise<CreateChatbotResult> => {
  // Check if the input chat provider exists in the current organization
  const matchedChatProviders = await db
    .select({
      id: llmProvider.id,
    })
    .from(llmProvider)
    .where(
      and(
        eq(llmProvider.organizationId, organizationId),
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
        eq(knowledgeBase.organizationId, organizationId),
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
      organizationId,
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
  organizationId,
}: ListChatbotsOptions): Promise<ListChatbotsResult> => {
  const chatbots = await db
    .select(chatbotSelection)
    .from(chatbot)
    .where(eq(chatbot.organizationId, organizationId))
    .orderBy(desc(chatbot.createdAt));

  return {
    status: "success",
    chatbots,
  };
};
