import type { AuthServer } from "@heho/auth/server";
import type { DbClient } from "@heho/db";
import { Hono } from "hono";
import { generateEmbeddings } from "./lib/embedding";
import { createChatbotsRoute } from "./routes/chatbots";
import { createChatbotEmbedKeysRoute } from "./routes/embed-keys";
import health from "./routes/health";
import { createKnowledgeBasesRoute } from "./routes/knowledge-bases";
import { createKnowledgeSourcesRoute } from "./routes/knowledge-sources";
import { createLlmProvidersRoute } from "./routes/llm-providers";
import { createOrganizationsRoute } from "./routes/organizations";
import {
  createInProcessKnowledgeSourceIngestionStarter,
  type StartKnowledgeSourceIngestion,
} from "./services/knowledge-source-ingestion";

export type CreateAppOptions = {
  auth: AuthServer;
  db: DbClient;
  encryptionKey: Uint8Array;
  startKnowledgeSourceIngestion?: StartKnowledgeSourceIngestion;
};

export function createApp({
  auth,
  db,
  encryptionKey,
  startKnowledgeSourceIngestion = createInProcessKnowledgeSourceIngestionStarter(
    {
      db,
      encryptionKey,
      generateEmbeddings,
    }
  ),
}: CreateAppOptions) {
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
      .route(
        "/knowledge-bases/:knowledgeBaseId/sources",
        createKnowledgeSourcesRoute({
          auth,
          db,
          startKnowledgeSourceIngestion,
        })
      )
      .route(
        "/knowledge-bases",
        createKnowledgeBasesRoute({ auth, db, encryptionKey })
      )
      .route(
        "/chatbots/:chatbotId/embed-keys",
        createChatbotEmbedKeysRoute({ auth, db })
      )
      .route("/chatbots", createChatbotsRoute({ auth, db }))
  );
}

export type AppType = ReturnType<typeof createApp>;
