import { randomUUID } from "node:crypto";
import type { DbClient } from "@heho/db";
import { chatSession } from "@heho/db/schema";
import { generateSessionToken, hashSessionToken } from "../lib/session-token";
import type { WidgetScope } from "./widget-access";

export type CreateWidgetSessionOptions = {
  db: DbClient;
  scope: WidgetScope;
};

export type CreatedWidgetSession = {
  sessionId: string;
  sessionToken: string;
  createdAt: Date;
};

const createdSessionSelection = {
  id: chatSession.id,
  createdAt: chatSession.createdAt,
};

export const createWidgetSession = async ({
  db,
  scope,
}: CreateWidgetSessionOptions): Promise<CreatedWidgetSession> => {
  // Generate session token and hash it
  const sessionToken = generateSessionToken();
  const tokenHash = hashSessionToken(sessionToken);

  const sessionId = randomUUID();
  const now = new Date();

  // Insert db
  const rows = await db
    .insert(chatSession)
    .values({
      id: sessionId,
      organizationId: scope.organizationId,
      chatbotId: scope.chatbotId,
      tokenHash,
      status: "active",
      createdAt: now,
      lastMessageAt: now,
    })
    .returning(createdSessionSelection);

  const createdSession = rows[0];

  if (!createdSession) {
    throw new Error("Chat session insert returned no record");
  }

  return {
    sessionId: createdSession.id,
    createdAt: createdSession.createdAt,
    sessionToken,
  };
};
