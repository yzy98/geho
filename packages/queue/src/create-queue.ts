import { type Job, type JobsOptions, Queue, type QueueOptions } from "bullmq";
import type z from "zod";
import { createRedisConnection } from "./redis-connection";

export type CreateQueueOptions<
  TSchema extends z.ZodType,
  TJobName extends string,
> = {
  redisURL: string;
  queueName: string;
  jobName: TJobName;
  payloadSchema: TSchema;
  options?: Omit<QueueOptions, "connection">;
};

export type CreatedQueue<TSchema extends z.ZodType, TJobName extends string> = {
  queue: Queue<Job<z.output<TSchema>, void, TJobName>>;
  enqueue: (
    payload: z.input<TSchema>,
    options?: JobsOptions
  ) => Promise<Job<z.output<TSchema>, void, TJobName>>;
  close: () => Promise<void>;
};

export const createQueue = <
  TSchema extends z.ZodType,
  TJobName extends string,
>({
  redisURL,
  queueName,
  jobName,
  payloadSchema,
  options,
}: CreateQueueOptions<TSchema, TJobName>): CreatedQueue<TSchema, TJobName> => {
  // Create Redis connection
  const connection = createRedisConnection(redisURL, {
    maxRetriesPerRequest: 1,
  });

  const queue = new Queue<Job<z.output<TSchema>, void, TJobName>>(queueName, {
    ...options,
    connection,
  });

  const enqueue = (payload: z.input<TSchema>, jobOptions?: JobsOptions) => {
    const parsedPayload = payloadSchema.parse(payload);

    return queue.add(jobName, parsedPayload, jobOptions);
  };

  let closePromise: Promise<void> | undefined;

  const close = () => {
    closePromise ??= (async () => {
      try {
        await queue.close();
      } finally {
        if (connection.status !== "end") {
          await connection.quit();
        }
      }
    })();

    return closePromise;
  };

  return {
    queue,
    enqueue,
    close,
  };
};
