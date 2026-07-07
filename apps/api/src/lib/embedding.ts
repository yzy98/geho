import type { GoogleEmbeddingModelOptions } from "@ai-sdk/google";
import type { OpenAIEmbeddingModelOptions } from "@ai-sdk/openai";
import { embed, embedMany } from "ai";
import {
  assertUnsupportedProvider,
  type ResolvedEmbeddingModel,
} from "./embedding-models";

export const EMBEDDING_DIMENSIONS = 1536;

type GenerateEmbeddingOptions = {
  model: ResolvedEmbeddingModel;
  value: string;
  abortSignal?: AbortSignal;
};

type GenerateEmbeddingsOptions = {
  model: ResolvedEmbeddingModel;
  values: string[];
  abortSignal?: AbortSignal;
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

const openAIDocumentEmbeddingOptions = openAIQueryEmbeddingOptions;

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

export type GenerateEmbedding = (
  options: GenerateEmbeddingOptions
) => Promise<number[]>;

export type GenerateEmbeddings = (
  options: GenerateEmbeddingsOptions
) => Promise<number[][]>;

export const generateEmbedding: GenerateEmbedding = async ({
  model,
  value,
  abortSignal,
}) => {
  const { embedding } = await embed({
    model: model.model,
    value,
    providerOptions: getQueryEmbeddingOptions(model.provider),
    ...(abortSignal ? { abortSignal } : {}),
  });

  return embedding;
};

export const generateEmbeddings: GenerateEmbeddings = async ({
  model,
  values,
  abortSignal,
}) => {
  if (values.length === 0) {
    return [];
  }

  const { embeddings } = await embedMany({
    model: model.model,
    values,
    providerOptions: getDocumentEmbeddingOptions(model.provider),
    ...(abortSignal ? { abortSignal } : {}),
  });

  return embeddings;
};
