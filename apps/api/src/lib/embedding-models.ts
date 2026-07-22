import { createGoogle } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import {
  findSupportedEmbeddingModel,
  type SupportedEmbeddingModel,
  type SupportedEmbeddingModelIdFor,
  type SupportedEmbeddingModelProvider,
} from "@geho/shared";
import type { EmbeddingModel } from "ai";

type ResolvedEmbeddingModelFor<
  TProvider extends SupportedEmbeddingModelProvider,
> = {
  model: EmbeddingModel;
  modelId: SupportedEmbeddingModelIdFor<TProvider>;
  provider: TProvider;
};

export type ResolvedEmbeddingModel = {
  [TProvider in SupportedEmbeddingModelProvider]: ResolvedEmbeddingModelFor<TProvider>;
}[SupportedEmbeddingModelProvider];

export const assertUnsupportedProvider = (provider: never): never => {
  throw new Error(`Unsupported provider: ${provider}`);
};

const resolveOpenAIEmbeddingModel = ({
  apiKey,
  baseUrl,
  modelId,
}: {
  apiKey: string;
  baseUrl: string | null | undefined;
  modelId: SupportedEmbeddingModelIdFor<"openai">;
}): ResolvedEmbeddingModelFor<"openai"> => {
  const openai = createOpenAI({
    apiKey,
    ...(baseUrl ? { baseURL: baseUrl } : {}),
  });

  return {
    model: openai.embedding(modelId),
    provider: "openai",
    modelId,
  };
};

const resolveGoogleEmbeddingModel = ({
  apiKey,
  baseUrl,
  modelId,
}: {
  apiKey: string;
  baseUrl: string | null | undefined;
  modelId: SupportedEmbeddingModelIdFor<"google">;
}): ResolvedEmbeddingModelFor<"google"> => {
  const google = createGoogle({
    apiKey,
    ...(baseUrl ? { baseURL: baseUrl } : {}),
  });

  return {
    model: google.embedding(modelId),
    provider: "google",
    modelId,
  };
};

const resolveSupportedEmbeddingModel = ({
  apiKey,
  baseUrl,
  model,
}: {
  apiKey: string;
  baseUrl: string | null | undefined;
  model: SupportedEmbeddingModel;
}): ResolvedEmbeddingModel => {
  const { id, provider } = model;
  switch (provider) {
    case "google":
      return resolveGoogleEmbeddingModel({
        apiKey,
        baseUrl,
        modelId: id,
      });
    case "openai":
      return resolveOpenAIEmbeddingModel({
        apiKey,
        baseUrl,
        modelId: id,
      });
    default:
      return assertUnsupportedProvider(provider);
  }
};

export const resolveEmbeddingModel = ({
  apiKey,
  baseUrl,
  modelId,
  provider,
}: {
  apiKey: string;
  baseUrl?: string | null;
  modelId: string;
  provider: string;
}): ResolvedEmbeddingModel => {
  const model = findSupportedEmbeddingModel({
    id: modelId,
    provider,
  });
  if (!model) {
    throw new Error(`Unsupported embedding model: ${modelId}`);
  }

  return resolveSupportedEmbeddingModel({
    apiKey,
    baseUrl,
    model,
  });
};
