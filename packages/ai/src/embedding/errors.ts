export class UnsupportedEmbeddingModelError extends Error {
  constructor(modelId: string) {
    super(`Unsupported embedding model: ${modelId}`);
    this.name = "UnsupportedEmbeddingModelError";
  }
}
