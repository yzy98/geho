import {
  findSupportedChatModel,
  findSupportedEmbeddingModel,
} from "@heho/shared";
import { z } from "zod";

const baseSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    baseUrl: z.url().nullable().optional(),
    apiKey: z
      .string()
      .min(1)
      .refine((value) => value.trim().length > 0, {
        message: "API key is required",
      }),
  })
  .strict();

const chatProviderSchema = baseSchema
  .extend({
    capability: z.literal("chat"),
    provider: z.string().min(1),
    modelId: z.string().min(1),
  })
  .refine(
    ({ provider, modelId }) =>
      findSupportedChatModel({
        id: modelId,
        provider,
      }) !== undefined,
    {
      message: "Chat model is not supported by this provider",
      path: ["modelId"],
    }
  );

const embeddingProviderSchema = baseSchema
  .extend({
    capability: z.literal("embedding"),
    provider: z.string().min(1),
    modelId: z.string().min(1),
  })
  .refine(
    ({ provider, modelId }) =>
      findSupportedEmbeddingModel({
        id: modelId,
        provider,
      }) !== undefined,
    {
      message: "Embedding model is not supported by this provider",
      path: ["modelId"],
    }
  );

export const createModelProviderSchema = z.discriminatedUnion("capability", [
  chatProviderSchema,
  embeddingProviderSchema,
]);

export type CreateModelProviderInput = z.infer<
  typeof createModelProviderSchema
>;
