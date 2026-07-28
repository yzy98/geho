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
  fusedScore: number;
};

export type RagCitation = {
  chunkId: string;
  sourceId: string;
  sourceTitle: string;
  chunkIndex: number;
  fusedScore: number;
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
