import type { DbClient } from "@geho/db";
import { isAllowedWidgetOrigin } from "../lib/widget-origin";
import { resolveEmbedKey } from "./embed-keys";

export type ResolveWidgetAccessOptions = {
  db: DbClient;
  rawEmbedKey: string;
  origin: string;
};

export type WidgetScope = {
  embedKeyId: string;
  organizationId: string;
  chatbotId: string;
};

/**
 * Verify Embed Key and Origin, generate trustable Widget Scope
 */
export const resolveWidgetAccess = async ({
  db,
  rawEmbedKey,
  origin,
}: ResolveWidgetAccessOptions): Promise<WidgetScope | null> => {
  // Hash the raw embed key and find the matched embed key and chatbot
  const resolvedEmbedKey = await resolveEmbedKey({
    db,
    rawKey: rawEmbedKey,
  });

  if (!resolvedEmbedKey) {
    return null;
  }

  // Check if the origin in the allowed domains
  const allowed = isAllowedWidgetOrigin({
    origin,
    allowedDomains: resolvedEmbedKey.allowedDomains,
  });

  if (!allowed) {
    return null;
  }

  return {
    embedKeyId: resolvedEmbedKey.embedKeyId,
    organizationId: resolvedEmbedKey.organizationId,
    chatbotId: resolvedEmbedKey.chatbotId,
  };
};
