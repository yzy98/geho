import type { AsyncIterableStream, DeepPartial, LanguageModel } from "ai";
import type { StructuredRagAnswer } from "./schema";

export type RagHistoryMessage = {
  role: "user" | "assistant";
  content: string;
};

export type RagContextChunk = {
  chunkId: string;
  sourceId: string;
  sourceTitle: string;
  chunkIndex: number;
  content: string;
  similarity: number;
};

export type RagCitation = {
  chunkId: string;
  sourceId: string;
  sourceTitle: string;
  chunkIndex: number;
  similarity: number;
};

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
