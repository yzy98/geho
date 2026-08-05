import type { AuthServer } from "@geho/auth/server";
import type { DbClient } from "@geho/db";

export type RouteDependencies = {
  auth: AuthServer;
  db: DbClient;
  encryptionKey: Uint8Array;
};
