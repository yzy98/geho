import z from "zod";

export const chatbotPreviewParamsSchema = z.object({
  chatbotId: z.uuid("Chatbot ID must be a valid UUID"),
});

export const askChatbotPreviewSchema = z
  .object({
    question: z.string().trim().min(1).max(2000),
  })
  .strict();

export type AskChatbotPreviewInput = z.infer<typeof askChatbotPreviewSchema>;
