import {
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { organization } from "./auth";
import { chatbot, knowledgeBase } from "./core";

export type RagTraceRetrievedChunk = {
  chunkId: string;
  sourceId: string;
  sourceTitle: string;
  chunkIndex: number;
  content: string;
  similarity: number;
};

export type RagTraceCitation = {
  chunkId: string;
  sourceId: string;
  sourceTitle: string;
  chunkIndex: number;
  similarity: number;
};

export const ragTrace = pgTable(
  "rag_trace",
  {
    id: text().primaryKey(),
    organizationId: text()
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    knowledgeBaseId: text().notNull(),
    chatbotId: text().notNull(),
    question: text().notNull(),
    answer: text().notNull(),
    promptPreview: text().notNull(),
    modelId: text().notNull(),
    latencyMs: integer().notNull(),
    retrievedChunks: jsonb().$type<RagTraceRetrievedChunk[]>().notNull(),
    citations: jsonb().$type<RagTraceCitation[]>().notNull(),
    createdAt: timestamp({ precision: 6, withTimezone: true }).notNull(),
  },
  (table) => [
    index("rag_trace_tenant_chatbot_created_at_idx").on(
      table.organizationId,
      table.chatbotId,
      table.createdAt
    ),
    foreignKey({
      columns: [table.chatbotId, table.organizationId],
      foreignColumns: [chatbot.id, chatbot.organizationId],
      name: "rag_trace_chatbot_tenant_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.knowledgeBaseId, table.organizationId],
      foreignColumns: [knowledgeBase.id, knowledgeBase.organizationId],
      name: "rag_trace_knowledge_base_tenant_fk",
    }).onDelete("cascade"),
  ]
);
