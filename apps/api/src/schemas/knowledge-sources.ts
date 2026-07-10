import { z } from "zod";

export const knowledgeSourcesParamsSchema = z.object({
  knowledgeBaseId: z.uuid("Knowledge base ID must be a valid UUID"),
});

export const createTextKnowledgeSourceSchema = z
  .object({
    title: z.string().trim().min(1).max(100),
    content: z
      .string()
      .max(100_000)
      .refine(
        (value) => value.trim().length > 0,
        "Source content is required."
      ),
  })
  .strict();

export type CreateTextKnowledgeSourceInput = z.infer<
  typeof createTextKnowledgeSourceSchema
>;

export type KnowledgeSourceStatus =
  | "pending"
  | "processing"
  | "ready"
  | "failed";

export type KnowledgeSourceDto = {
  id: string;
  knowledgeBaseId: string;
  title: string;
  status: KnowledgeSourceStatus;
  errorCode: string | null;
  errorMessage: string | null;
  chunkCount: number;
  createdAt: Date;
  updatedAt: Date;
};
