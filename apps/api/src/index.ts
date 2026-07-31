import { createAuthServer } from "@geho/auth/server";
import { createDb } from "@geho/db";
import {
  type KnowledgeSourceProcessingJob,
  knowledgeSourceProcessingQueueName,
} from "@geho/shared";
import { serve } from "@hono/node-server";
import { Queue } from "bullmq";
import IORedis from "ioredis";
import { createApp } from "./app";
import { env } from "./env";
import { createKnowledgeSourceIngestionStarter } from "./services/knowledge-source-ingestion";

// Create db instance
const database = createDb(env.DATABASE_URL);

// Create Redis connection
const redisConnection = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: 1,
});

// Create auth instance
const auth = createAuthServer({
  db: database.db,
  baseURL: env.API_URL,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: [env.APP_URL],
});

const knowledgeSourceQueue = new Queue<KnowledgeSourceProcessingJob>(
  knowledgeSourceProcessingQueueName,
  {
    connection: redisConnection,
  }
);

const startKnowledgeSourceIngestion = createKnowledgeSourceIngestionStarter({
  queue: knowledgeSourceQueue,
});

// Create Hono instance
const app = createApp({
  auth,
  db: database.db,
  encryptionKey: env.APP_ENCRYPTION_KEY,
  startKnowledgeSourceIngestion,
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

async function shutdown() {
  server.close();
  await knowledgeSourceQueue.close();
  if (redisConnection.status !== "end") {
    await redisConnection.quit();
  }
  await database.close();
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
