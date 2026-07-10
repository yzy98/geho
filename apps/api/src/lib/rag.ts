import { generateText, Output } from "ai";
import z from "zod";
import type { ResolvedChatModel } from "./chat-models";
import type { RagChunk } from "./retrieval";

const buildRagContext = (chunks: RagChunk[]) => {
  if (chunks.length === 0) {
    return "No chunks were retrieved.";
  }

  return chunks
    .map(
      (chunk, index) => `
    [${index + 1}]
    chunkId: ${chunk.chunkId}
    sourceTitle: ${chunk.sourceTitle}
    chunkIndex: ${chunk.chunkIndex}
    similarity: ${chunk.similarity}
    content:
    ${chunk.content}
    `
    )
    .join("\n---\n");
};

const buildRagPrompt = ({
  question,
  chunks,
}: {
  question: string;
  chunks: RagChunk[];
}) => `Question:
${question}

Use only the retrieved chunks below to answer the user question.

Rules:
- If the chunks do not contain enough information, say you do not know.
- Cite only chunk IDs that appear in the retrieved chunks.
- Do not invent citations.
- Return a concise answer.

Retrieved chunks:
${buildRagContext(chunks)}

Answer:`;

const ragAnswerSchema = z
  .object({
    answer: z.string().min(1),
    citedChunkIds: z.array(z.string()),
  })
  .strict();

type RagAnswer = z.infer<typeof ragAnswerSchema>;

type GenerateRagAnswer = (options: {
  model: ResolvedChatModel;
  instructions: string;
  question: string;
  chunks: RagChunk[];
  abortSignal?: AbortSignal;
}) => Promise<{
  answer: RagAnswer;
  prompt: string;
}>;

export const generateRagAnswer: GenerateRagAnswer = async ({
  model,
  instructions,
  question,
  chunks,
  abortSignal,
}) => {
  const prompt = buildRagPrompt({
    question,
    chunks,
  });

  const result = await generateText({
    model: model.model,
    instructions,
    prompt,
    output: Output.object({
      schema: ragAnswerSchema,
      name: "citedAnswer",
      description: "An answer with citations to retrieved chunk IDs.",
    }),
    temperature: 0,
    ...(abortSignal ? { abortSignal } : {}),
  });

  return {
    answer: result.output,
    prompt,
  };
};
