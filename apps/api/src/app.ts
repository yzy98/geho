import type { AuthServer } from "@geho/auth/server";
import type { DbClient } from "@geho/db";
import { createApiRoutes } from "./routes";

export type CreateAppOptions = {
  auth: AuthServer;
  db: DbClient;
  encryptionKey: Uint8Array;
};

export function createApp({ auth, db, encryptionKey }: CreateAppOptions) {
  return createApiRoutes({
    auth,
    db,
    encryptionKey,
  });
}

export type AppType = ReturnType<typeof createApp>;
