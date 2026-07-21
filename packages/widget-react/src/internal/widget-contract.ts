import type { UIMessage } from "ai";

export type WidgetCitation = {
  chunkId: string;
  sourceId: string;
  sourceTitle: string;
  chunkIndex: number;
  similarity: number;
};

export type WidgetUIMessage = UIMessage<
  {
    createdAt?: string;
    traceId?: string;
  },
  {
    answer: {
      text: string;
    };
    citations: WidgetCitation[];
  }
>;

export type WidgetMessageDto =
  | {
      id: string;
      role: "user";
      content: string;
      createdAt: string;
    }
  | {
      id: string;
      role: "assistant";
      content: string;
      createdAt: string;
      citations: WidgetCitation[];
    };

export type CreateWidgetSessionResponse = {
  sessionId: string;
  sessionToken: string;
  createdAt: string;
};

export type WidgetSession = CreateWidgetSessionResponse & {
  persistence: "local-storage" | "memory";
};

export type ListWidgetMessagesResponse = {
  messages: WidgetMessageDto[];
};

export function mapWidgetHistory(
  messages: WidgetMessageDto[]
): WidgetUIMessage[] {
  return messages.map((message): WidgetUIMessage => {
    if (message.role === "user") {
      return {
        id: message.id,
        role: "user",
        metadata: {
          createdAt: message.createdAt,
        },
        parts: [
          {
            type: "text",
            text: message.content,
          },
        ],
      };
    }

    return {
      id: message.id,
      role: "assistant",
      metadata: {
        createdAt: message.createdAt,
      },
      parts: [
        {
          type: "data-answer",
          id: "answer",
          data: {
            text: message.content,
          },
        },
        {
          type: "data-citations",
          id: "citations",
          data: message.citations,
        },
      ],
    };
  });
}
