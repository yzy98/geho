import { z } from "zod";

export const knowledgeBaseParamsSchema = z.object({
  knowledgeBaseId: z.uuid("Knowledge base ID must be a valid UUID"),
});

export const createKnowledgeBaseSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    embeddingProviderId: z.uuid(),
  })
  .strict();

export const retrievalPreviewSchema = z
  .object({
    query: z.string().trim().min(1).max(2000),
    limit: z.number().int().min(1).max(20).optional(),
    minSimilarity: z.number().min(0).max(1).optional(),
  })
  .strict();

export type CreateKnowledgeBaseInput = z.infer<
  typeof createKnowledgeBaseSchema
>;

export type RetrievalPreviewInput = z.infer<typeof retrievalPreviewSchema>;
