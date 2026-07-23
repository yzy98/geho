import { prepareRagPrompt, resolveCitations } from "@geho/rag";
import { streamText } from "ai";
import { ragAnswerOutput } from "./output";
import type { RagAnswerOptions, RagAnswerStream } from "./types";

export const streamRagAnswer = ({
  model,
  instructions,
  question,
  history,
  chunks,
  abortSignal,
}: RagAnswerOptions): RagAnswerStream => {
  const prepared = prepareRagPrompt({
    question,
    history,
    chunks,
  });

  const streamed = streamText({
    model,
    instructions,
    ...prepared.modelInput,
    output: ragAnswerOutput,
    temperature: 0,
    ...(abortSignal ? { abortSignal } : {}),
  });

  return {
    partialOutputStream: streamed.partialOutputStream,
    complete: async () => {
      const output = await streamed.output;

      return {
        answer: output.answer,
        citations: resolveCitations({
          chunks,
          citedChunkIds: output.citedChunkIds,
        }),
        promptPreview: prepared.promptPreview,
      };
    },
  };
};
