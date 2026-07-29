import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { organization } from "./auth";
import { chatMessage } from "./chat";
import { chatbot, knowledgeBase } from "./core";

export const ragTraceOrigin = pgEnum("rag_trace_origin", ["preview", "widget"]);

export type RagTraceRetrievedChunk = {
  chunkId: string;
  sourceId: string;
  sourceTitle: string;
  chunkIndex: number;
  content: string;
  vectorSimilarity?: number;
  lexicalRank?: number;
  fusedScore: number;
};

export type RagTraceCitation = {
  chunkId: string;
  sourceId: string;
  sourceTitle: string;
  chunkIndex: number;
  fusedScore: number;
};

export const ragTrace = pgTable(
  "rag_trace",
  {
    id: text().primaryKey(),
    organizationId: text()
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    chatbotId: text().notNull(),
    knowledgeBaseId: text().notNull(),
    messageId: text(),
    origin: ragTraceOrigin().notNull(),
    question: text().notNull(),
    answer: text().notNull(),
    promptPreview: text().notNull(),
    modelId: text().notNull(),
    latencyMs: integer().notNull(),
    lexicalQuery: text(),
    retrievedChunks: jsonb().$type<RagTraceRetrievedChunk[]>().notNull(),
    citations: jsonb().$type<RagTraceCitation[]>().notNull(),
    createdAt: timestamp({ precision: 6, withTimezone: true }).notNull(),
  },
  (table) => [
    // One successful Trace per assistant message
    unique("rag_trace_message_unique").on(table.messageId),

    // Supports owner Dashboard trace lists and stable pagination.
    index("rag_trace_tenant_chatbot_created_at_idx").on(
      table.organizationId,
      table.chatbotId,
      table.createdAt,
      table.id
    ),

    // Trace and Chatbot must belong to the same Organization
    foreignKey({
      columns: [table.chatbotId, table.organizationId],
      foreignColumns: [chatbot.id, chatbot.organizationId],
      name: "rag_trace_chatbot_tenant_fk",
    }).onDelete("cascade"),

    // Trace and Knowledge Base must belong to the same Organization
    foreignKey({
      columns: [table.knowledgeBaseId, table.organizationId],
      foreignColumns: [knowledgeBase.id, knowledgeBase.organizationId],
      name: "rag_trace_knowledge_base_tenant_fk",
    }).onDelete("cascade"),

    // Widget Trace and Message must belong to the same Organization
    foreignKey({
      columns: [table.messageId, table.organizationId],
      foreignColumns: [chatMessage.id, chatMessage.organizationId],
      name: "rag_trace_message_tenant_fk",
    }).onDelete("cascade"),

    // Preview has no Message; Widget must reference one
    check(
      "rag_trace_origin_message_check",
      sql`
        (
          ${table.origin} = 'preview'
          AND ${table.messageId} IS NULL
        )
        OR
        (
          ${table.origin} = 'widget'
          AND ${table.messageId} IS NOT NULL
        )
      `
    ),

    check("rag_trace_latency_non_negative_check", sql`${table.latencyMs} >= 0`),
  ]
);
