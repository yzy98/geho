import {
  foreignKey,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { organization } from "./auth";

export const llmProviderCapability = pgEnum("llm_provider_capability", [
  "chat",
  "embedding",
]);

export const llmProvider = pgTable(
  "llm_provider",
  {
    id: text().primaryKey(),
    organizationId: text()
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text().notNull(),
    provider: text().notNull(),
    capability: llmProviderCapability().notNull(),
    baseUrl: text(),
    encryptedApiKey: text().notNull(),
    model: text().notNull(),
    createdAt: timestamp({ precision: 6, withTimezone: true }).notNull(),
    updatedAt: timestamp({ precision: 6, withTimezone: true }).notNull(),
  },
  (table) => [
    unique("llm_provider_tenant_identity_unique").on(
      table.id,
      table.organizationId
    ),
    index("llm_provider_organization_capability_idx").on(
      table.organizationId,
      table.capability
    ),
    index("llm_provider_organization_created_at_idx").on(
      table.organizationId,
      table.createdAt
    ),
  ]
);

export const knowledgeBase = pgTable(
  "knowledge_base",
  {
    id: text().primaryKey(),
    organizationId: text()
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    embeddingProviderId: text().notNull(),
    name: text().notNull(),
    createdAt: timestamp({ precision: 6, withTimezone: true }).notNull(),
    updatedAt: timestamp({ precision: 6, withTimezone: true }).notNull(),
  },
  (table) => [
    unique("knowledge_base_tenant_identity_unique").on(
      table.id,
      table.organizationId
    ),
    index("knowledge_base_organization_created_at_idx").on(
      table.organizationId,
      table.createdAt
    ),
    index("knowledge_base_embedding_provider_id_idx").on(
      table.embeddingProviderId
    ),
    foreignKey({
      columns: [table.embeddingProviderId, table.organizationId],
      foreignColumns: [llmProvider.id, llmProvider.organizationId],
      name: "knowledge_base_embedding_provider_tenant_fk",
    }).onDelete("restrict"),
  ]
);

export const chatbot = pgTable(
  "chatbot",
  {
    id: text().primaryKey(),
    organizationId: text()
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    chatProviderId: text().notNull(),
    knowledgeBaseId: text().notNull(),
    name: text().notNull(),
    systemInstructions: text().notNull(),
    themeSettings: jsonb().notNull().default({}),
    retrievalSettings: jsonb().notNull().default({}),
    createdAt: timestamp({ precision: 6, withTimezone: true }).notNull(),
    updatedAt: timestamp({ precision: 6, withTimezone: true }).notNull(),
  },
  (table) => [
    unique("chatbot_tenant_identity_unique").on(table.id, table.organizationId),
    index("chatbot_organization_created_at_idx").on(
      table.organizationId,
      table.createdAt
    ),
    index("chatbot_chat_provider_id_idx").on(table.chatProviderId),
    index("chatbot_knowledge_base_id_idx").on(table.knowledgeBaseId),
    foreignKey({
      columns: [table.chatProviderId, table.organizationId],
      foreignColumns: [llmProvider.id, llmProvider.organizationId],
      name: "chatbot_chat_provider_tenant_fk",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.knowledgeBaseId, table.organizationId],
      foreignColumns: [knowledgeBase.id, knowledgeBase.organizationId],
      name: "chatbot_knowledge_base_tenant_fk",
    }).onDelete("restrict"),
  ]
);

export const embedKey = pgTable(
  "embed_key",
  {
    id: text().primaryKey(),
    organizationId: text()
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    chatbotId: text().notNull(),
    keyPrefix: text().notNull(),
    keyHash: text().notNull(),
    allowedDomains: jsonb().$type<string[]>().notNull().default([]),
    createdAt: timestamp({ precision: 6, withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex("embed_key_key_hash_unique").on(table.keyHash),
    index("embed_key_tenant_chatbot_id_idx").on(
      table.organizationId,
      table.chatbotId
    ),
    foreignKey({
      columns: [table.chatbotId, table.organizationId],
      foreignColumns: [chatbot.id, chatbot.organizationId],
      name: "embed_key_chatbot_tenant_fk",
    }).onDelete("cascade"),
  ]
);
