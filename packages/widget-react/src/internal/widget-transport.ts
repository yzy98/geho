import { DefaultChatTransport } from "ai";
import { WidgetApiError } from "./widget-client";
import type { WidgetUIMessage } from "./widget-contract";

function getLastUserText(messages: WidgetUIMessage[]): string {
  const lastMessage = messages.at(messages.length - 1);

  if (lastMessage?.role !== "user") {
    throw new Error("The last Widget message must be a user message.");
  }

  const content = lastMessage.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("")
    .trim();

  if (!content) {
    throw new Error("The Widget message cannot be empty.");
  }

  if (content.length > 2000) {
    throw new Error("The Widget message cannot exceed 2000 characters.");
  }

  return content;
}

async function streamingFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const response = await globalThis.fetch(input, init);

  if (response.ok) {
    return response;
  }

  let code: string | undefined;
  let message = `Widget message request failed with status ${response.status}.`;

  try {
    const payload = (await response.clone().json()) as unknown;

    if (typeof payload === "object" && payload !== null) {
      if ("code" in payload && typeof payload.code === "string") {
        code = payload.code;
      }
      if ("message" in payload && typeof payload.message === "string") {
        message = payload.message;
      }
    }
  } catch {
    // 使用通用安全错误。
  }

  throw new WidgetApiError({
    status: response.status,
    ...(code === undefined ? {} : { code }),
    message,
  });
}

type CreateWidgetTransportOptions = {
  apiUrl: string;
  embedKey: string;
  sessionId: string;
  sessionToken: string;
};

export function createWidgetTransport({
  apiUrl,
  embedKey,
  sessionId,
  sessionToken,
}: CreateWidgetTransportOptions) {
  const messagesUrl = `${apiUrl}/widget/sessions/${encodeURIComponent(sessionId)}/messages`;

  return new DefaultChatTransport<WidgetUIMessage>({
    api: messagesUrl,

    // Widget API not using Cookie for now
    credentials: "omit",

    headers: {
      "X-Geho-Key": embedKey,
      Authorization: `Bearer ${sessionToken}`,
    },

    fetch: streamingFetch,

    prepareSendMessagesRequest: ({ messages, trigger }) => {
      if (trigger === "regenerate-message") {
        return {
          api: `${messagesUrl}/resume`,
          body: {},
        };
      }

      return {
        body: {
          content: getLastUserText(messages),
        },
      };
    },
  });
}
