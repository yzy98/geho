export { createChatModel } from "./chat/create-model";
export { UnsupportedChatModelError } from "./chat/errors";

export { EMBEDDING_DIMENSIONS } from "./embedding/constants";
export { createEmbeddingModel } from "./embedding/create-client";
export { UnsupportedEmbeddingModelError } from "./embedding/errors";
export type {
  AiCallOptions,
  CreateEmbeddingModel,
  EmbeddingModelClient,
} from "./embedding/types";

export type { AiModelConfig } from "./model-config";

export { generateRagAnswer } from "./rag-answer/generate";
export { streamRagAnswer } from "./rag-answer/stream";
export type {
  RagAnswerOptions,
  RagAnswerStream,
} from "./rag-answer/types";
