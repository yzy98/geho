import type { KnowledgeSourceProcessingJob } from "@geho/shared";

export type StartKnowledgeSourceIngestion = (
  payload: KnowledgeSourceProcessingJob
) => Promise<void>;

type EnqueueKnowledgeSourceJob = (
  payload: KnowledgeSourceProcessingJob,
  options: {
    jobId: string;
  }
) => Promise<unknown>;

export const createKnowledgeSourceIngestionStarter =
  ({
    enqueue,
  }: {
    enqueue: EnqueueKnowledgeSourceJob;
  }): StartKnowledgeSourceIngestion =>
  async (payload) => {
    await enqueue(payload, {
      jobId: payload.sourceId,
    });
  };
