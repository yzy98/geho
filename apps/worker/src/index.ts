import { createEmbeddingModel } from "@geho/ai";
import { createDb } from "@geho/db";
import { createWorker } from "@geho/queue/worker";
import {
  knowledgeSourceProcessingJobSchema,
  knowledgeSourceProcessingQueueName,
} from "@geho/shared";
import { env } from "@/env";
import { processKnowledgeSource } from "@/processors/knowledge-source";

// Create DB instance
const database = createDb(env.DATABASE_URL);

const { worker, close: closeWorker } = createWorker({
  redisURL: env.REDIS_URL,
  queueName: knowledgeSourceProcessingQueueName,
  payloadSchema: knowledgeSourceProcessingJobSchema,
  options: {
    concurrency: 2,
  },
  processor: (payload, job) =>
    processKnowledgeSource({
      db: database.db,
      encryptionKey: env.APP_ENCRYPTION_KEY,
      sourceId: payload.sourceId,
      organizationId: payload.organizationId,
      createEmbeddingModel,
      processingOwner: {
        jobId: job.id,
        token: job.token,
      },
    }),
});

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
    sourceId: job?.data?.sourceId,
    organizationId: job?.data?.organizationId,
    attempts: job?.attemptsMade,
    error: error.message,
  });
});

worker.on("stalled", (jobId) => {
  console.warn("knowledge-source job stalled", {
    jobId,
  });
});

worker.on("error", (error) => {
  console.error("knowledge-source worker error", { error });
});

const shutdown = async () => {
  try {
    await closeWorker();
  } finally {
    await database.close();
  }
};

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);

console.info("Knowledge-source worker is running");
