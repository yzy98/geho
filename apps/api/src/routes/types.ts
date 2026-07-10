import type { AuthServer } from "@heho/auth/server";
import type { DbClient } from "@heho/db";
import type { StartKnowledgeSourceIngestion } from "../services/knowledge-source-ingestion";

export type RouteDependencies = {
  auth: AuthServer;
  db: DbClient;
  encryptionKey: Uint8Array;
  startKnowledgeSourceIngestion: StartKnowledgeSourceIngestion;
};
