import {
  foreignKey,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { organization } from "./auth";

export const modelProviderCapability = pgEnum("model_provider_capability", [
  "chat",
  "embedding",
]);

export const modelProvider = pgTable(
  "model_provider",
  {
    id: text().primaryKey(),
    organizationId: text()
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text().notNull(),
    provider: text().notNull(),
    modelId: text().notNull(),
    capability: modelProviderCapability().notNull(),
    baseUrl: text(),
    encryptedApiKey: text().notNull(),
    createdAt: timestamp({ precision: 6, withTimezone: true }).notNull(),
    updatedAt: timestamp({ precision: 6, withTimezone: true }).notNull(),
  },
  (table) => [
    // Allows tenant-scoped foreign keys from child tables
    unique("model_provider_tenant_identity_unique").on(
      table.id,
      table.organizationId
    ),

    // Supports listing/filtering model providers by capability within one Organization
    index("model_provider_organization_capability_idx").on(
      table.organizationId,
      table.capability
    ),

    // Supports stable model provider lists ordered by created time
    index("model_provider_organization_created_at_idx").on(
      table.organizationId,
      table.createdAt,
      table.id
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
    // Allows tenant-scoped foreign keys from Chatbot, Knowledge Source and RAG Trace
    unique("knowledge_base_tenant_identity_unique").on(
      table.id,
      table.organizationId
    ),

    // Supports stable Knowledge Base lists within one Organization ordered by created time
    index("knowledge_base_organization_created_at_idx").on(
      table.organizationId,
      table.createdAt,
      table.id
    ),

    // Supports FK checks and finding Knowledge Bases using one embedding provider
    index("knowledge_base_embedding_provider_id_idx").on(
      table.embeddingProviderId
    ),

    // Prevents cross-tenant provider references and blocks deletion while in use.
    // Service code must additionally require provider capability = "embedding".
    foreignKey({
      columns: [table.embeddingProviderId, table.organizationId],
      foreignColumns: [modelProvider.id, modelProvider.organizationId],
      name: "knowledge_base_embedding_model_provider_tenant_fk",
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
    // Allows tenant-scoped foreign keys from Embed Key, Chat Session and RAG Trace
    unique("chatbot_tenant_identity_unique").on(table.id, table.organizationId),

    // Supports stable Chatbot lists within one Organization ordered by created time
    index("chatbot_organization_created_at_idx").on(
      table.organizationId,
      table.createdAt,
      table.id
    ),

    // Supports FK checks and finding Chatbots using one chat provider
    index("chatbot_chat_provider_id_idx").on(table.chatProviderId),

    // Supports FK checks and finding Chatbots using one knowledge base
    index("chatbot_knowledge_base_id_idx").on(table.knowledgeBaseId),

    // Prevents cross-tenant provider references and blocks deletion while in use.
    // Service code must additionally require provider capability = "chat".
    foreignKey({
      columns: [table.chatProviderId, table.organizationId],
      foreignColumns: [modelProvider.id, modelProvider.organizationId],
      name: "chatbot_chat_model_provider_tenant_fk",
    }).onDelete("restrict"),

    // Prevents cross-tenant Knowledge Base references and deletion while in use.
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
    // Prevents two public Embed Keys from resolving the same credential hash
    unique("embed_key_key_hash_unique").on(table.keyHash),

    // Supports listing a Chatbot's Embed Keys
    index("embed_key_tenant_chatbot_id_idx").on(
      table.organizationId,
      table.chatbotId,
      table.createdAt,
      table.id
    ),

    // Prevents cross-tenant Chatbot references and removes keys with the Chatbot.
    foreignKey({
      columns: [table.chatbotId, table.organizationId],
      foreignColumns: [chatbot.id, chatbot.organizationId],
      name: "embed_key_chatbot_tenant_fk",
    }).onDelete("cascade"),
  ]
);
