import type { DbClient } from "@heho/db";
import { and, asc, eq } from "@heho/db/helper";
import { chatMessage, type RagTraceCitation, ragTrace } from "@heho/db/schema";
import type { AuthorizedWidgetSession } from "./widget-session-access";

type WidgetMessageBase = {
  id: string;
  content: string;
  createdAt: string;
};

export type WidgetMessage =
  | (WidgetMessageBase & {
      role: "user";
    })
  | (WidgetMessageBase & {
      role: "assistant";
      citations: RagTraceCitation[];
    });

export type ListWidgetMessagesOptions = {
  db: DbClient;
  session: AuthorizedWidgetSession;
};

export type ListWidgetMessagesResult = {
  messages: WidgetMessage[];
};

export const listWidgetMessages = async ({
  db,
  session,
}: ListWidgetMessagesOptions): Promise<ListWidgetMessagesResult> => {
  // Select target session's messages
  const rows = await db
    .select({
      id: chatMessage.id,
      role: chatMessage.role,
      content: chatMessage.content,
      createdAt: chatMessage.createdAt,
      citations: ragTrace.citations,
    })
    .from(chatMessage)
    .leftJoin(
      ragTrace,
      and(
        eq(ragTrace.organizationId, chatMessage.organizationId),
        eq(ragTrace.messageId, chatMessage.id),
        eq(ragTrace.origin, "widget")
      )
    )
    .where(
      and(
        eq(chatMessage.organizationId, session.organizationId),
        eq(chatMessage.sessionId, session.id)
      )
    )
    .orderBy(asc(chatMessage.createdAt), asc(chatMessage.id));

  const messages = rows.map((row): WidgetMessage => {
    const message = {
      id: row.id,
      content: row.content,
      createdAt: row.createdAt.toISOString(),
    };

    if (row.role === "assistant") {
      return {
        ...message,
        role: "assistant",
        citations: row.citations ?? [],
      };
    }

    return {
      ...message,
      role: "user",
    };
  });

  return {
    messages,
  };
};
