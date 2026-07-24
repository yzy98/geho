export class UnsupportedChatModelError extends Error {
  constructor(modelId: string) {
    super(`Unsupported chat model: ${modelId}`);
    this.name = "UnsupportedChatModelError";
  }
}
