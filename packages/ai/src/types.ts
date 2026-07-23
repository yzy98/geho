export type AiModelConfig = {
  apiKey: string;
  provider: string;
  modelId: string;
  baseURL?: string | null;
};

export type AiCallOptions = {
  abortSignal?: AbortSignal;
};

export type EmbeddingModelClient = {
  embedQuery(value: string, options?: AiCallOptions): Promise<number[]>;
  embedDocuments(
    values: readonly string[],
    options?: AiCallOptions
  ): Promise<number[][]>;
};

export type CreateEmbeddingModel = (
  config: AiModelConfig
) => EmbeddingModelClient;
