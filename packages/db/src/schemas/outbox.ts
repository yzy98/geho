import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const outboxEvent = pgTable(
  "outbox_event",
  {
    id: text().primaryKey(),
    eventType: text().notNull(),
    payload: jsonb().$type<unknown>().notNull(),
    attemptCount: integer().notNull().default(0),
    nextAttemptAt: timestamp({ precision: 6, withTimezone: true }).notNull(),
    lastError: text(),
    failedAt: timestamp({ precision: 6, withTimezone: true }),
    createdAt: timestamp({ precision: 6, withTimezone: true }).notNull(),
  },
  (table) => [
    index("outbox_event_dispatch_idx")
      .on(table.nextAttemptAt, table.createdAt, table.id)
      .where(sql`${table.failedAt} IS NULL`),

    check(
      "outbox_event_type_check",
      sql`char_length(btrim(${table.eventType})) > 0`
    ),

    check("outbox_event_attempt_count_check", sql`${table.attemptCount} >= 0`),

    check(
      "outbox_event_failure_error_check",
      sql`
        ${table.failedAt} IS NULL
        OR ${table.lastError} IS NOT NULL
      `
    ),
  ]
);
