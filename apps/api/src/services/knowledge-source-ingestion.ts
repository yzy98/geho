import {
  type KnowledgeSourceProcessingJob,
  knowledgeSourceProcessingJobSchema,
  processKnowledgeSourceJobName,
} from "@geho/shared";
import type { Queue } from "bullmq";

export type StartKnowledgeSourceIngestion = (
  payload: KnowledgeSourceProcessingJob
) => Promise<void>;

type KnowledgeSourceQueue = Pick<Queue<KnowledgeSourceProcessingJob>, "add">;

export const createKnowledgeSourceIngestionStarter =
  ({ queue }: { queue: KnowledgeSourceQueue }): StartKnowledgeSourceIngestion =>
  async (payload) => {
    const parsedPayload = knowledgeSourceProcessingJobSchema.parse(payload);

    await queue.add(processKnowledgeSourceJobName, parsedPayload, {
      jobId: parsedPayload.sourceId,
    });
  };
