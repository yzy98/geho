import z from "zod";

export const ragAnswerSchema = z
  .object({
    answer: z.string().min(1),
    citedChunkIds: z.array(z.string()),
  })
  .strict();

export type StructuredRagAnswer = z.infer<typeof ragAnswerSchema>;
