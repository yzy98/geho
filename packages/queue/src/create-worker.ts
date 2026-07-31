import {
  type Job,
  UnrecoverableError,
  Worker,
  type WorkerOptions,
} from "bullmq";
import type z from "zod";
import { createRedisConnection } from "./redis-connection";

export type CreateWorkerOptions<TSchema extends z.ZodType> = {
  redisURL: string;
  queueName: string;
  payloadSchema: TSchema;
  processor: (
    payload: z.output<TSchema>,
    job: Job<z.input<TSchema>, void>
  ) => Promise<void>;
  options?: Omit<WorkerOptions, "connection">;
};

export type CreatedWorker<TSchema extends z.ZodType> = {
  worker: Worker<z.input<TSchema>, void>;
  close: () => Promise<void>;
};

export const createWorker = <TSchema extends z.ZodType>({
  redisURL,
  queueName,
  payloadSchema,
  processor,
  options,
}: CreateWorkerOptions<TSchema>): CreatedWorker<TSchema> => {
  // Create Redis connection
  const connection = createRedisConnection(redisURL, {
    maxRetriesPerRequest: null,
  });

  const worker = new Worker<z.input<TSchema>, void>(
    queueName,
    async (job) => {
      const payload = payloadSchema.safeParse(job.data);

      if (!payload.success) {
        throw new UnrecoverableError("Invalid job payload");
      }

      await processor(payload.data, job);
    },
    {
      ...options,
      connection,
    }
  );

  let closePromise: Promise<void> | undefined;

  const close = () => {
    closePromise ??= (async () => {
      try {
        await worker.close();
      } finally {
        if (connection.status !== "end") {
          await connection.quit();
        }
      }
    })();

    return closePromise;
  };

  return {
    worker,
    close,
  };
};
