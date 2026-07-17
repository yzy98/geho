import type { DbClient } from "@heho/db";
import { and, eq } from "@heho/db/helper";
import { chatSession } from "@heho/db/schema";
import { hashSessionToken, isSessionToken } from "../lib/session-token";
import type { WidgetScope } from "./widget-access";

export const WIDGET_SESSION_IDLE_MS = 24 * 60 * 60 * 1000; // 24h

export const isWidgetSessionExpired = ({
  lastMessageAt,
  now = new Date(),
}: {
  lastMessageAt: Date;
  now?: Date;
}) => lastMessageAt.getTime() <= now.getTime() - WIDGET_SESSION_IDLE_MS;

export type AuthorizedWidgetSession = {
  id: string;
  organizationId: string;
  chatbotId: string;
};

export type AuthorizeWidgetSessionOptions = {
  db: DbClient;
  scope: WidgetScope;
  sessionId: string;
  rawSessionToken: string;
};

export type AuthorizeWidgetSessionResult =
  | {
      status: "granted";
      session: AuthorizedWidgetSession;
    }
  | {
      status: "invalid_access";
    }
  | {
      status: "expired";
    };

const sessionSelection = {
  id: chatSession.id,
  organizationId: chatSession.organizationId,
  chatbotId: chatSession.chatbotId,
  status: chatSession.status,
  lastMessageAt: chatSession.lastMessageAt,
};

/**
 * Verify Token, Session, tanant scope and 24h expiration
 */
export const authorizeWidgetSession = async ({
  db,
  scope,
  sessionId,
  rawSessionToken,
}: AuthorizeWidgetSessionOptions): Promise<AuthorizeWidgetSessionResult> => {
  // Re-check the session token
  if (!isSessionToken(rawSessionToken)) {
    return {
      status: "invalid_access",
    };
  }

  // Hash the raw session token
  const tokenHash = hashSessionToken(rawSessionToken);

  return await db.transaction(async (tx) => {
    // Find the chat session
    const rows = await tx
      .select(sessionSelection)
      .from(chatSession)
      .where(
        and(
          eq(chatSession.id, sessionId),
          eq(chatSession.tokenHash, tokenHash),
          eq(chatSession.organizationId, scope.organizationId),
          eq(chatSession.chatbotId, scope.chatbotId)
        )
      )
      .limit(1)
      .for("update");

    const session = rows[0];

    if (!session) {
      return {
        status: "invalid_access",
      };
    }

    if (session.status === "closed") {
      return {
        status: "expired",
      };
    }

    // Last message exceeds 24h before, treat it as Expired
    const isExpired = isWidgetSessionExpired({
      lastMessageAt: session.lastMessageAt,
    });

    // Update the expired session status to closed
    if (isExpired) {
      await tx
        .update(chatSession)
        .set({
          status: "closed",
        })
        .where(
          and(
            eq(chatSession.id, session.id),
            eq(chatSession.tokenHash, tokenHash),
            eq(chatSession.organizationId, session.organizationId),
            eq(chatSession.chatbotId, session.chatbotId),
            eq(chatSession.status, "active")
          )
        );

      return {
        status: "expired",
      };
    }

    return {
      status: "granted",
      session: {
        id: session.id,
        organizationId: session.organizationId,
        chatbotId: session.chatbotId,
      },
    };
  });
};
