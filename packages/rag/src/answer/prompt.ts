import { MAX_RAG_HISTORY_MESSAGES } from "./constants";
import type {
  PreparedRagPrompt,
  RagContextChunk,
  RagHistoryMessage,
  RagPromptMessage,
} from "./types";

export const buildRagContext = (chunks: readonly RagContextChunk[]): string => {
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
    content:
    ${chunk.content}
    `
    )
    .join("\n---\n");
};

export const buildRagPrompt = ({
  question,
  chunks,
}: {
  question: string;
  chunks: readonly RagContextChunk[];
}): string => `Question:
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

export const buildRagMessages = ({
  history,
  prompt,
}: {
  history: readonly RagHistoryMessage[];
  prompt: string;
}): RagPromptMessage[] => [
  ...history.slice(-MAX_RAG_HISTORY_MESSAGES).map(
    (message): RagPromptMessage => ({
      role: message.role,
      content: message.content,
    })
  ),
  {
    role: "user",
    content: prompt,
  },
];

export const buildPromptPreview = ({
  history,
  prompt,
}: {
  history: readonly RagHistoryMessage[];
  prompt: string;
}): string => {
  const boundedHistory = history.slice(-MAX_RAG_HISTORY_MESSAGES);

  if (boundedHistory.length === 0) {
    return prompt;
  }

  const historyPreview = boundedHistory
    .map((message) => `${message.role.toUpperCase()}:\n${message.content}`)
    .join("\n\n");

  return `Conversation history:
${historyPreview}

CURRENT USER REQUEST:
${prompt}`;
};

export const prepareRagPrompt = ({
  question,
  history,
  chunks,
}: {
  question: string;
  history: readonly RagHistoryMessage[];
  chunks: readonly RagContextChunk[];
}): PreparedRagPrompt => {
  const boundedHistory = history.slice(-MAX_RAG_HISTORY_MESSAGES);

  const prompt = buildRagPrompt({
    question,
    chunks,
  });

  return {
    modelInput:
      boundedHistory.length === 0
        ? {
            prompt,
          }
        : {
            messages: buildRagMessages({
              history: boundedHistory,
              prompt,
            }),
          },
    promptPreview: buildPromptPreview({
      history: boundedHistory,
      prompt,
    }),
  };
};
