import { createGoogle, type GoogleEmbeddingModelOptions } from "@ai-sdk/google";
import { createOpenAI, type OpenAIEmbeddingModelOptions } from "@ai-sdk/openai";
import {
  findSupportedEmbeddingModel,
  type SupportedEmbeddingModel,
  type SupportedEmbeddingModelIdFor,
  type SupportedEmbeddingModelProvider,
} from "@geho/shared";
import { type EmbeddingModel, embed, embedMany } from "ai";
import { UnsupportedEmbeddingModelError } from "./errors";
import type { AiModelConfig, EmbeddingModelClient } from "./types";

export const EMBEDDING_DIMENSIONS = 1536;

type ResolvedEmbeddingModelFor<
  TProvider extends SupportedEmbeddingModelProvider,
> = {
  model: EmbeddingModel;
  modelId: SupportedEmbeddingModelIdFor<TProvider>;
  provider: TProvider;
};

type ResolvedEmbeddingModel = {
  [TProvider in SupportedEmbeddingModelProvider]: ResolvedEmbeddingModelFor<TProvider>;
}[SupportedEmbeddingModelProvider];

const assertUnsupportedProvider = (provider: never): never => {
  throw new Error(`Unsupported provider: ${provider}`);
};

const resolveOpenAIEmbeddingModel = ({
  apiKey,
  baseURL,
  modelId,
}: {
  apiKey: string;
  baseURL: string | null | undefined;
  modelId: SupportedEmbeddingModelIdFor<"openai">;
}): ResolvedEmbeddingModelFor<"openai"> => {
  const openai = createOpenAI({
    apiKey,
    ...(baseURL ? { baseURL } : {}),
  });

  return {
    model: openai.embedding(modelId),
    provider: "openai",
    modelId,
  };
};

const resolveGoogleEmbeddingModel = ({
  apiKey,
  baseURL,
  modelId,
}: {
  apiKey: string;
  baseURL: string | null | undefined;
  modelId: SupportedEmbeddingModelIdFor<"google">;
}): ResolvedEmbeddingModelFor<"google"> => {
  const google = createGoogle({
    apiKey,
    ...(baseURL ? { baseURL } : {}),
  });

  return {
    model: google.embedding(modelId),
    provider: "google",
    modelId,
  };
};

const resolveSupportedEmbeddingModel = ({
  apiKey,
  baseURL,
  model,
}: {
  apiKey: string;
  baseURL: string | null | undefined;
  model: SupportedEmbeddingModel;
}): ResolvedEmbeddingModel => {
  const { id, provider } = model;
  switch (provider) {
    case "google":
      return resolveGoogleEmbeddingModel({
        apiKey,
        baseURL,
        modelId: id,
      });
    case "openai":
      return resolveOpenAIEmbeddingModel({
        apiKey,
        baseURL,
        modelId: id,
      });
    default:
      return assertUnsupportedProvider(provider);
  }
};

const resolveEmbeddingModel = (
  config: AiModelConfig
): ResolvedEmbeddingModel => {
  const model = findSupportedEmbeddingModel({
    provider: config.provider,
    id: config.modelId,
  });

  if (!model) {
    throw new UnsupportedEmbeddingModelError(config.modelId);
  }

  return resolveSupportedEmbeddingModel({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
    model,
  });
};

const googleQueryEmbeddingOptions = {
  google: {
    outputDimensionality: EMBEDDING_DIMENSIONS,
    taskType: "RETRIEVAL_QUERY",
  } satisfies GoogleEmbeddingModelOptions,
};

const openAIQueryEmbeddingOptions = {
  openai: {
    dimensions: EMBEDDING_DIMENSIONS,
  } satisfies OpenAIEmbeddingModelOptions,
};

const getQueryEmbeddingOptions = (
  provider: ResolvedEmbeddingModel["provider"]
) => {
  switch (provider) {
    case "google":
      return googleQueryEmbeddingOptions;
    case "openai":
      return openAIQueryEmbeddingOptions;
    default:
      return assertUnsupportedProvider(provider);
  }
};

const googleDocumentEmbeddingOptions = {
  google: {
    outputDimensionality: EMBEDDING_DIMENSIONS,
    taskType: "RETRIEVAL_DOCUMENT",
  } satisfies GoogleEmbeddingModelOptions,
};

const openAIDocumentEmbeddingOptions = {
  openai: {
    dimensions: EMBEDDING_DIMENSIONS,
  } satisfies OpenAIEmbeddingModelOptions,
};

const getDocumentEmbeddingOptions = (
  provider: ResolvedEmbeddingModel["provider"]
) => {
  switch (provider) {
    case "google":
      return googleDocumentEmbeddingOptions;
    case "openai":
      return openAIDocumentEmbeddingOptions;
    default:
      return assertUnsupportedProvider(provider);
  }
};

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
