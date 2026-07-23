export { createChatModel } from "./chat";

export { createEmbeddingModel, EMBEDDING_DIMENSIONS } from "./embedding";

export {
  UnsupportedChatModelError,
  UnsupportedEmbeddingModelError,
} from "./errors";

export type {
  AiCallOptions,
  AiModelConfig,
  EmbeddingModelClient,
} from "./types";
