import type { AuthServer } from "@geho/auth/server";
import type { DbClient } from "@geho/db";
import type { StartKnowledgeSourceIngestion } from "../services/knowledge-source-ingestion";

export type RouteDependencies = {
  auth: AuthServer;
  db: DbClient;
  encryptionKey: Uint8Array;
  startKnowledgeSourceIngestion: StartKnowledgeSourceIngestion;
};
