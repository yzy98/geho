import z from "zod";

export const knowledgeSourceProcessingQueueName = "knowledge-source-processing";

export const processKnowledgeSourceJobName = "process-knowledge-source";

export const knowledgeSourceProcessingJobSchema = z.object({
  sourceId: z.uuid(),
  organizationId: z.string().min(1),
});

export type KnowledgeSourceProcessingJob = z.output<
  typeof knowledgeSourceProcessingJobSchema
>;

export const knowledgeSourceIngestionRequestedEventType =
  "knowledge_source.ingestion_requested";

export const knowledgeSourceIngestionRequestedPayloadSchema =
  knowledgeSourceProcessingJobSchema;
