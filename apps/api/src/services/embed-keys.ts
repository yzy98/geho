import { randomUUID } from "node:crypto";
import type { DbClient } from "@geho/db";
import { and, desc, eq } from "@geho/db/helper";
import { chatbot, embedKey as embedKeyTable } from "@geho/db/schema";
import {
  generateEmbedKey,
  getEmbedKeyPrefix,
  hashEmbedKey,
  isEmbedKey,
} from "../lib/embed-key";
import type { CreateEmbedKeyInput } from "../schemas/embed-keys";

export type EmbedKeyDto = Omit<
  typeof embedKeyTable.$inferSelect,
  "organizationId" | "keyHash"
>;

export type CreateEmbedKeyOptions = {
  db: DbClient;
  chatbotId: string;
  input: CreateEmbedKeyInput;
  organizationId: string;
};

export type ListChatbotEmbedKeysOptions = {
  db: DbClient;
  chatbotId: string;
  organizationId: string;
};

export type ResolveEmbedKeyOptions = {
  db: DbClient;
  rawKey: string;
};

export type CreateEmbedKeyResult =
  | {
      status: "created";
      embedKey: EmbedKeyDto;
      key: string;
    }
  | {
      status: "invalid_chatbot";
    };

export type ListChatbotEmbedKeysResult =
  | {
      status: "success";
      embedKeys: EmbedKeyDto[];
    }
  | {
      status: "invalid_chatbot";
    };

export type ResolvedEmbedKey = {
  embedKeyId: string;
  organizationId: string;
  chatbotId: string;
  allowedDomains: string[];
};

const embedKeySelection = {
  id: embedKeyTable.id,
  chatbotId: embedKeyTable.chatbotId,
  keyPrefix: embedKeyTable.keyPrefix,
  allowedDomains: embedKeyTable.allowedDomains,
  createdAt: embedKeyTable.createdAt,
};

const findChatbotInOrganization = async ({
  db,
  chatbotId,
  organizationId,
}: {
  db: DbClient;
  chatbotId: string;
  organizationId: string;
}) => {
  const rows = await db
    .select({
      id: chatbot.id,
    })
    .from(chatbot)
    .where(
      and(eq(chatbot.id, chatbotId), eq(chatbot.organizationId, organizationId))
    )
    .limit(1);

  return rows[0] ?? null;
};

export const createEmbedKey = async ({
  db,
  chatbotId,
  input,
  organizationId,
}: CreateEmbedKeyOptions): Promise<CreateEmbedKeyResult> => {
  // Check if the chatbot provided exists or not
  const selectedChatbot = await findChatbotInOrganization({
    db,
    chatbotId,
    organizationId,
  });

  if (!selectedChatbot) {
    return {
      status: "invalid_chatbot",
    };
  }

  // Generate raw key and its hash
  const rawKey = generateEmbedKey();
  const keyPrefix = getEmbedKeyPrefix(rawKey);
  const keyHash = hashEmbedKey(rawKey);

  const now = new Date();

  // Insert into db
  const rows = await db
    .insert(embedKeyTable)
    .values({
      id: randomUUID(),
      organizationId,
      chatbotId: selectedChatbot.id,
      keyPrefix,
      keyHash,
      allowedDomains: input.allowedDomains,
      createdAt: now,
    })
    .returning(embedKeySelection);

  const createdEmbedKey = rows[0];

  if (!createdEmbedKey) {
    throw new Error("Embed key insert returned no record");
  }

  return {
    key: rawKey,
    embedKey: createdEmbedKey,
    status: "created",
  };
};

export const listChatbotEmbedKeys = async ({
  db,
  chatbotId,
  organizationId,
}: ListChatbotEmbedKeysOptions): Promise<ListChatbotEmbedKeysResult> => {
  // Check if the chatbot provided exists or not
  const selectedChatbot = await findChatbotInOrganization({
    db,
    chatbotId,
    organizationId,
  });

  if (!selectedChatbot) {
    return {
      status: "invalid_chatbot",
    };
  }

  const embedKeys = await db
    .select(embedKeySelection)
    .from(embedKeyTable)
    .where(
      and(
        eq(embedKeyTable.organizationId, organizationId),
        eq(embedKeyTable.chatbotId, selectedChatbot.id)
      )
    )
    .orderBy(desc(embedKeyTable.createdAt), desc(embedKeyTable.id));

  return {
    status: "success",
    embedKeys,
  };
};

export const resolveEmbedKey = async ({
  db,
  rawKey,
}: ResolveEmbedKeyOptions): Promise<ResolvedEmbedKey | null> => {
  // Check if the rawKey is embed key
  if (!isEmbedKey(rawKey)) {
    return null;
  }

  const keyHash = hashEmbedKey(rawKey);

  const rows = await db
    .select({
      embedKeyId: embedKeyTable.id,
      organizationId: embedKeyTable.organizationId,
      chatbotId: embedKeyTable.chatbotId,
      allowedDomains: embedKeyTable.allowedDomains,
    })
    .from(embedKeyTable)
    .innerJoin(
      chatbot,
      and(
        eq(chatbot.id, embedKeyTable.chatbotId),
        eq(chatbot.organizationId, embedKeyTable.organizationId)
      )
    )
    .where(eq(embedKeyTable.keyHash, keyHash))
    .limit(1);

  return rows[0] ?? null;
};
