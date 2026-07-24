import { embed, embedMany } from "ai";
import type { AiModelConfig } from "../model-config";
import {
  getDocumentEmbeddingOptions,
  getQueryEmbeddingOptions,
  resolveEmbeddingModel,
} from "./resolve-model";
import type { EmbeddingModelClient } from "./types";

export const createEmbeddingModel = (
  config: AiModelConfig
): EmbeddingModelClient => {
  const resolved = resolveEmbeddingModel(config);

  return {
    async embedQuery(value, options) {
      const { embedding } = await embed({
        model: resolved.model,
        value,
        providerOptions: getQueryEmbeddingOptions(resolved.provider),
        ...(options?.abortSignal ? { abortSignal: options.abortSignal } : {}),
      });

      return embedding;
    },

    async embedDocuments(values, options) {
      if (values.length === 0) {
        return [];
      }

      const { embeddings } = await embedMany({
        model: resolved.model,
        values: [...values],
        providerOptions: getDocumentEmbeddingOptions(resolved.provider),
        ...(options?.abortSignal ? { abortSignal: options.abortSignal } : {}),
      });

      return embeddings;
    },
  };
};
