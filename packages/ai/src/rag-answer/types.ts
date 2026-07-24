import type {
  RagCitation,
  RagContextChunk,
  RagHistoryMessage,
  StructuredRagAnswer,
} from "@geho/rag";
import type { AsyncIterableStream, DeepPartial, LanguageModel } from "ai";

export type RagAnswerOptions = {
  model: LanguageModel;
  instructions: string;
  question: string;
  history: readonly RagHistoryMessage[];
  chunks: readonly RagContextChunk[];
  abortSignal?: AbortSignal;
};

export type RagAnswerResult = {
  answer: string;
  citations: RagCitation[];
  promptPreview: string;
};

export type RagAnswerStream = {
  partialOutputStream: AsyncIterableStream<DeepPartial<StructuredRagAnswer>>;
  complete: () => Promise<RagAnswerResult>;
};
