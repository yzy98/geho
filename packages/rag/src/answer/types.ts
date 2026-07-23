export type RagPromptMessage =
  | {
      role: "user";
      content: string;
    }
  | {
      role: "assistant";
      content: string;
    };

export type RagHistoryMessage = RagPromptMessage;

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

export type RagModelInput =
  | {
      prompt: string;
    }
  | {
      messages: RagPromptMessage[];
    };

export type PreparedRagPrompt = {
  modelInput: RagModelInput;
  promptPreview: string;
};
