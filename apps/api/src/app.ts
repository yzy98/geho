import type { AuthServer } from "@heho/auth/server";
import type { DbClient } from "@heho/db";
import { generateEmbeddings } from "./lib/embedding";
import { createApiRoutes } from "./routes";
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
  return createApiRoutes({
    auth,
    db,
    encryptionKey,
    startKnowledgeSourceIngestion,
  });
}

export type AppType = ReturnType<typeof createApp>;
