import { createEmbeddingModel } from "@geho/ai";
import { createDb } from "@geho/db";
import {
  type KnowledgeSourceProcessingJob,
  knowledgeSourceProcessingJobSchema,
  knowledgeSourceProcessingQueueName,
} from "@geho/shared";
import { UnrecoverableError, Worker } from "bullmq";
import IORedis from "ioredis";
import { env } from "@/env";
import { processKnowledgeSource } from "@/processors/knowledge-source";

// Create DB instance
const database = createDb(env.DATABASE_URL);

// Create Redis connection
const redisConnection = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

// Create the worker and launch the processor immediately
const worker = new Worker<KnowledgeSourceProcessingJob>(
  knowledgeSourceProcessingQueueName,
  async (job) => {
    const payload = knowledgeSourceProcessingJobSchema.safeParse(job.data);

    if (!payload.success) {
      throw new UnrecoverableError("Invalid knowledge-source job payload");
    }

    await processKnowledgeSource({
      db: database.db,
      encryptionKey: env.APP_ENCRYPTION_KEY,
      sourceId: payload.data.sourceId,
      organizationId: payload.data.organizationId,
      createEmbeddingModel,
    });
  },
  {
    connection: redisConnection,
    concurrency: 2,
  }
);

worker.on("completed", (job) => {
  console.info("knowledge-source job completed", {
    jobId: job.id,
    sourceId: job.data.sourceId,
    organizationId: job.data.organizationId,
    attempts: job.attemptsMade,
  });
});

worker.on("failed", (job, error) => {
  console.error("knowledge-source job failed", {
    jobId: job?.id,
    sourceId: job?.data.sourceId,
    organizationId: job?.data.organizationId,
    attempts: job?.attemptsMade,
    error: error.message,
  });
});

worker.on("error", (error) => {
  console.error("knowledge-source worker error", { error });
});

const shutdown = async () => {
  await worker.close();
  if (redisConnection.status !== "end") {
    await redisConnection.quit();
  }
  await database.close();
};

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);

console.info("Knowledge-source worker is running");
