import type { knowledgeSource, knowledgeSourceStatus } from "@heho/db/schema";
import { z } from "zod";
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
  (typeof knowledgeSourceStatus.enumValues)[number];

export type KnowledgeSourceDto = Omit<
  typeof knowledgeSource.$inferSelect,
  "organizationId" | "rawContent"
> & {
  chunkCount: number;
};
