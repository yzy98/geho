export class UnsupportedChatModelError extends Error {
  constructor(modelId: string) {
    super(`Unsupported chat model: ${modelId}`);
    this.name = "UnsupportedChatModelError";
  }
}

export class UnsupportedEmbeddingModelError extends Error {
  constructor(modelId: string) {
    super(`Unsupported embedding model: ${modelId}`);
    this.name = "UnsupportedEmbeddingModelError";
  }
}
