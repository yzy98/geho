import type { AuthServer } from "@heho/auth/server";
import type { DbClient } from "@heho/db";
import { Hono } from "hono";
import { createChatbotsRoute } from "./routes/chatbots";
import { createChatbotEmbedKeysRoute } from "./routes/embed-keys";
import health from "./routes/health";
import { createKnowledgeBasesRoute } from "./routes/knowledge-bases";
import { createLlmProvidersRoute } from "./routes/llm-providers";
import { createOrganizationsRoute } from "./routes/organizations";

export type CreateAppOptions = {
  auth: AuthServer;
  db: DbClient;
  encryptionKey: Uint8Array;
};

export function createApp({ auth, db, encryptionKey }: CreateAppOptions) {
  return (
    new Hono()
      // Auth route
      .on(["POST", "GET"], "/auth/*", (c) => auth.handler(c.req.raw))

      // Public route
      .route("/health", health)

      // Protected routes
      .route("/organizations", createOrganizationsRoute({ auth, db }))
      .route(
        "/llm-providers",
        createLlmProvidersRoute({ auth, db, encryptionKey })
      )
      .route("/knowledge-bases", createKnowledgeBasesRoute({ auth, db }))
      .route("/chatbots", createChatbotsRoute({ auth, db }))
      .route("/chatbots", createChatbotEmbedKeysRoute({ auth, db }))
  );
}

export type AppType = ReturnType<typeof createApp>;
