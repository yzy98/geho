import { createEmbeddingModel } from "@geho/ai";
import { createDb } from "@geho/db";
import { createQueue } from "@geho/queue/queue";
import { createWorker } from "@geho/queue/worker";
import {
  knowledgeSourceIngestionRequestedEventType,
  knowledgeSourceIngestionRequestedPayloadSchema,
  knowledgeSourceProcessingJobSchema,
  knowledgeSourceProcessingQueueName,
  processKnowledgeSourceJobName,
} from "@geho/shared";
import { env } from "@/env";
import { processKnowledgeSource } from "@/processors/knowledge-source";
import {
  createOutboxDispatcher,
  PermanentOutboxDispatchError,
} from "./outbox-dispatcher";

// Create DB instance
const database = createDb(env.DATABASE_URL);

// Queue producer used exclusively by the Outbox Dispatcher
const {
  queue: knowledgeSourceQueue,
  enqueue: enqueueKnowledgeSource,
  close: closeKnowledgeSourceQueue,
} = createQueue({
  redisURL: env.REDIS_URL,
  queueName: knowledgeSourceProcessingQueueName,
  jobName: processKnowledgeSourceJobName,
  payloadSchema: knowledgeSourceProcessingJobSchema,
});

knowledgeSourceQueue.on("error", (error) => {
  console.error("knowledge-source queue error", {
    error: error.message,
  });
});

// BullMQ Worker Consumer
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

// Outbox event router
// createOutboxDispatcher starts polling immediately
// Its dispatch callback is called while the Dispatcher owns the selected outbox row.
const { close: closeOutboxDispatcher } = createOutboxDispatcher({
  db: database.db,

  dispatch: async (event) => {
    // Unknown event types remain retryable
    if (event.eventType !== knowledgeSourceIngestionRequestedEventType) {
      throw new Error(`Unsupported outbox event type: ${event.eventType}`);
    }

    // The payload field is unknown JSON at db
    // Validate it before sending to BullMQ
    const parsedPayload =
      knowledgeSourceIngestionRequestedPayloadSchema.safeParse(event.payload);

    if (!parsedPayload.success) {
      throw new PermanentOutboxDispatchError(
        `Invalid knowledge-source ingestion payload: ${parsedPayload.error.message}`
      );
    }

    // Enqueue, sourceId is the stable BullMQ job ID.
    await enqueueKnowledgeSource(parsedPayload.data, {
      jobId: parsedPayload.data.sourceId,
    });
  },
});

/**
 * Idempotent graceful shutdown.
 *
 * Shutdown order:
 *
 * 1. Stop Dispatcher polling and wait for its current dispatch.
 * 2. Close the Queue because Dispatcher no longer needs it.
 * 3. Close the Worker and wait for its active job.
 * 4. Close PostgreSQL after both components stop using it.
 */
let shutdownPromise: Promise<void> | undefined;

const shutdown = (): Promise<void> => {
  shutdownPromise ??= (async () => {
    try {
      await closeOutboxDispatcher();
    } finally {
      try {
        await closeKnowledgeSourceQueue();
      } finally {
        try {
          await closeWorker();
        } finally {
          await database.close();
        }
      }
    }
  })();

  return shutdownPromise;
};

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);

console.info("Knowledge-source worker is running");
