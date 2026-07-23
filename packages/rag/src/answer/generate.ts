import { generateText } from "ai";
import { resolveCitations } from "./citations";
import { prepareRagPrompt } from "./prompt";
import { ragAnswerOutput } from "./schema";
import type { RagAnswerOptions, RagAnswerResult } from "./types";

export const generateRagAnswer = async ({
  model,
  instructions,
  question,
  history,
  chunks,
  abortSignal,
}: RagAnswerOptions): Promise<RagAnswerResult> => {
  const prepared = prepareRagPrompt({
    question,
    history,
    chunks,
  });

  const generated = await generateText({
    model,
    instructions,
    ...prepared.modelInput,
    output: ragAnswerOutput,
    temperature: 0,
    ...(abortSignal ? { abortSignal } : {}),
  });

  return {
    answer: generated.output.answer,
    citations: resolveCitations({
      chunks,
      citedChunkIds: generated.output.citedChunkIds,
    }),
    promptPreview: prepared.promptPreview,
  };
};
