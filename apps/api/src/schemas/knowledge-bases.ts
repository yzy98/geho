import { z } from "zod";

export const createKnowledgeBaseSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    embeddingProviderId: z.uuid(),
  })
  .strict();

export type CreateKnowledgeBaseInput = z.infer<
  typeof createKnowledgeBaseSchema
>;
