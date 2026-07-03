import { z } from "zod";

export const createChatbotSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    systemInstructions: z.string().trim().min(1).max(10_000),
    chatProviderId: z.uuid(),
    knowledgeBaseId: z.uuid(),
  })
  .strict();

export type CreateChatbotInput = z.infer<typeof createChatbotSchema>;
