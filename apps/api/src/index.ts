import { createAuthServer } from "@geho/auth/server";
import { createDb } from "@geho/db";
import { serve } from "@hono/node-server";
import { createApp } from "./app";
import { env } from "./env";

// Create db instance
const database = createDb(env.DATABASE_URL);

// Create auth instance
const auth = createAuthServer({
  db: database.db,
  baseURL: env.API_URL,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: [env.APP_URL],
});

// Create Hono instance
const app = createApp({
  auth,
  db: database.db,
  encryptionKey: env.APP_ENCRYPTION_KEY,
});

const server = serve(
  {
    fetch: app.fetch,
    port: env.API_PORT,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  }
);

const shutdown = async () => {
  server.close();
  await database.close();
};

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
