import { sql } from "drizzle-orm";
import {
  check,
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
    // Allows tenant-scoped foreign keys from Knowledge Chunk
    unique("knowledge_source_tenant_identity_unique").on(
      table.id,
      table.organizationId
    ),

    // Supports retrieval and status-based source operations within a Knowledge Base.
    index("knowledge_source_base_status_idx").on(
      table.organizationId,
      table.knowledgeBaseId,
      table.status
    ),

    // Supports stable Dashboard source lists ordered by newest first.
    index("knowledge_source_base_created_at_idx").on(
      table.organizationId,
      table.knowledgeBaseId,
      table.createdAt,
      table.id
    ),

    // Prevents cross-tenant Knowledge Base references and deletes Sources with it.
    foreignKey({
      columns: [table.knowledgeBaseId, table.organizationId],
      foreignColumns: [knowledgeBase.id, knowledgeBase.organizationId],
      name: "knowledge_source_base_tenant_fk",
    }).onDelete("cascade"),

    // Keeps processing errors consistent with the Source status.
    check(
      "knowledge_source_status_error_check",
      sql`
        (
          ${table.status} = 'failed'
          AND ${table.errorCode} IS NOT NULL
          AND ${table.errorMessage} IS NOT NULL
        )
        OR
        (
          ${table.status} <> 'failed'
          AND ${table.errorCode} IS NULL
          AND ${table.errorMessage} IS NULL
        )
      `
    ),
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
    // Allows future tenant-scoped references to a Knowledge Chunk.
    unique("knowledge_chunk_tenant_identity_unique").on(
      table.id,
      table.organizationId
    ),

    // Keeps chunk positions unique and supports queries/deletes by Source.
    unique("knowledge_chunk_source_order_unique").on(
      table.sourceId,
      table.chunkIndex
    ),

    // Accelerates cosine nearest-neighbor retrieval across Chunk embeddings.
    index("knowledge_chunk_embedding_idx").using(
      "hnsw",
      table.embedding.op("vector_cosine_ops")
    ),

    // Index for full-text search in PostgreSQL for content cloumn
    index("knowledge_chunk_content_search_idx").using(
      "gin",
      sql`to_tsvector('simple', ${table.content})`
    ),

    // Prevents cross-tenant Source references and removes Chunks with the Source.
    foreignKey({
      columns: [table.sourceId, table.organizationId],
      foreignColumns: [knowledgeSource.id, knowledgeSource.organizationId],
      name: "knowledge_chunk_source_tenant_fk",
    }).onDelete("cascade"),

    // Chunk positions are zero-based and cannot be negative.
    check(
      "knowledge_chunk_index_non_negative_check",
      sql`${table.chunkIndex} >= 0`
    ),
  ]
);
