import {
  foreignKey,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { organization } from "./auth";
import { chatbot } from "./core";

export const chatSessionStatus = pgEnum("chat_session_status", [
  "active",
  "closed",
]);

export const chatMessageRole = pgEnum("chat_message_role", [
  "user",
  "assistant",
]);

export type ChatSessionStatus = (typeof chatSessionStatus.enumValues)[number];

export type ChatMessageRole = (typeof chatMessageRole.enumValues)[number];

export const chatSession = pgTable(
  "chat_session",
  {
    id: text().primaryKey(),
    organizationId: text()
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    chatbotId: text().notNull(),
    tokenHash: text().notNull(),
    status: chatSessionStatus().notNull().default("active"),
    createdAt: timestamp({ precision: 6, withTimezone: true }).notNull(),
    lastMessageAt: timestamp({ precision: 6, withTimezone: true }).notNull(),
  },
  (table) => [
    // Allows tenant-scoped foreign keys from Chat Message
    unique("chat_session_tenant_identity_unique").on(
      table.id,
      table.organizationId
    ),

    // Prevents two Chat Sessions from sharing the same token hash
    unique("chat_session_token_hash_unique").on(table.tokenHash),

    // Supports chatbot history queries and stable ordering
    index("chat_session_tenant_chatbot_activity_idx").on(
      table.organizationId,
      table.chatbotId,
      table.lastMessageAt,
      table.id
    ),

    // Session and Chatbot must belong to the same Organization
    foreignKey({
      columns: [table.chatbotId, table.organizationId],
      foreignColumns: [chatbot.id, chatbot.organizationId],
      name: "chat_session_chatbot_tenant_fk",
    }).onDelete("cascade"),
  ]
);

export const chatMessage = pgTable(
  "chat_message",
  {
    id: text().primaryKey(),
    organizationId: text()
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    sessionId: text().notNull(),
    role: chatMessageRole().notNull(),
    content: text().notNull(),
    createdAt: timestamp({ precision: 6, withTimezone: true }).notNull(),
  },
  (table) => [
    // Allows tenant-scoped foreign keys from RAG Trace
    unique("chat_message_tenant_identity_unique").on(
      table.id,
      table.organizationId
    ),

    // Supports session history queries and stable ordering
    index("chat_message_tenant_session_order_idx").on(
      table.organizationId,
      table.sessionId,
      table.createdAt,
      table.id
    ),

    // Message and Session must belong to the same Organization
    foreignKey({
      columns: [table.sessionId, table.organizationId],
      foreignColumns: [chatSession.id, chatSession.organizationId],
      name: "chat_message_session_tenant_fk",
    }).onDelete("cascade"),
  ]
);
