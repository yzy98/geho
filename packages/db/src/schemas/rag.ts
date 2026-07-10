import {
  foreignKey,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  vector,
} from "drizzle-orm/pg-core";
import { organization } from "./auth";
import { knowledgeBase } from "./core";

export const knowledgeSourceStatus = pgEnum("knowledge_source_status", [
  "pending",
  "processing",
  "ready",
  "failed",
]);

export const knowledgeSource = pgTable(
  "knowledge_source",
  {
    id: text().primaryKey(),
    organizationId: text()
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    knowledgeBaseId: text().notNull(),
    title: text().notNull(),
    rawContent: text().notNull(),
    status: knowledgeSourceStatus().notNull().default("pending"),
    errorCode: text(),
    errorMessage: text(),
    createdAt: timestamp({ precision: 6, withTimezone: true }).notNull(),
    updatedAt: timestamp({ precision: 6, withTimezone: true }).notNull(),
  },
  (table) => [
    unique("knowledge_source_tenant_identity_unique").on(
      table.id,
      table.organizationId
    ),
    index("knowledge_source_base_status_idx").on(
      table.organizationId,
      table.knowledgeBaseId,
      table.status
    ),
    foreignKey({
      columns: [table.knowledgeBaseId, table.organizationId],
      foreignColumns: [knowledgeBase.id, knowledgeBase.organizationId],
      name: "knowledge_source_base_tenant_fk",
    }).onDelete("cascade"),
  ]
);

export const knowledgeChunk = pgTable(
  "knowledge_chunk",
  {
    id: text().primaryKey(),
    organizationId: text()
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    sourceId: text().notNull(),
    chunkIndex: integer().notNull(),
    content: text().notNull(),
    embedding: vector({
      dimensions: 1536,
    }).notNull(),
    createdAt: timestamp({ precision: 6, withTimezone: true }).notNull(),
  },
  (table) => [
    unique("knowledge_chunk_tenant_identity_unique").on(
      table.id,
      table.organizationId
    ),
    unique("knowledge_chunk_source_order_unique").on(
      table.sourceId,
      table.chunkIndex
    ),
    index("knowledge_chunk_tenant_source_idx").on(
      table.organizationId,
      table.sourceId
    ),
    index("knowledge_chunk_embedding_idx").using(
      "hnsw",
      table.embedding.op("vector_cosine_ops")
    ),
    foreignKey({
      columns: [table.sourceId, table.organizationId],
      foreignColumns: [knowledgeSource.id, knowledgeSource.organizationId],
      name: "knowledge_chunk_source_tenant_fk",
    }).onDelete("cascade"),
  ]
);
