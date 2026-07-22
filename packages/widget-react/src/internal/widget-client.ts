import type {
  CreateWidgetSessionResponse,
  ListWidgetMessagesResponse,
  WidgetMessageDto,
  WidgetSession,
} from "./widget-contract";

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null;
}

export class WidgetApiError extends Error {
  readonly status: number;
  readonly code: string | undefined;

  constructor(options: { status: number; code?: string; message: string }) {
    super(options.message);
    this.name = "WidgetApiError";
    this.status = options.status;
    this.code = options.code;
  }
}

export class WidgetConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WidgetConfigurationError";
  }
}

export function normalizeApiUrl(rawApiUrl: string): string {
  const trimmed = rawApiUrl.trim();

  if (!trimmed) {
    throw new WidgetConfigurationError("apiUrl is required.");
  }

  let url: URL;

  try {
    url = new URL(trimmed);
  } catch {
    throw new WidgetConfigurationError("apiUrl must be a valid absolute URL.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new WidgetConfigurationError("apiUrl must use HTTP or HTTPS.");
  }

  if (url.username || url.password) {
    throw new WidgetConfigurationError(
      "apiUrl must not include username or password."
    );
  }

  if (url.search || url.hash) {
    throw new WidgetConfigurationError(
      "apiUrl must not include query parameters or fragments."
    );
  }

  const pathname = url.pathname.replace(/\/+$/, "");
  return pathname ? `${url.origin}${pathname}` : url.origin;
}

function parseApiError(response: Response, payload: unknown): WidgetApiError {
  const code =
    isRecord(payload) && typeof payload.code === "string"
      ? payload.code
      : undefined;
  const message =
    isRecord(payload) && typeof payload.message === "string"
      ? payload.message
      : `Widget API request failed with status ${response.status}.`;

  return new WidgetApiError({
    status: response.status,
    ...(code === undefined ? {} : { code }),
    message,
  });
}

async function requestJson(
  input: RequestInfo | URL,
  init: RequestInit
): Promise<unknown> {
  const response = await globalThis.fetch(input, init);
  let payload: unknown;

  try {
    payload = await response.json();
  } catch {
    throw new WidgetApiError({
      status: response.status,
      message: "Widget API returned an invalid JSON response.",
    });
  }

  if (!response.ok) {
    throw parseApiError(response, payload);
  }

  return payload;
}

function parseCreatedSession(payload: unknown): CreateWidgetSessionResponse {
  if (
    !isRecord(payload) ||
    typeof payload.sessionId !== "string" ||
    typeof payload.sessionToken !== "string" ||
    typeof payload.createdAt !== "string"
  ) {
    throw new WidgetApiError({
      status: 200,
      message: "Widget API returned an invalid Session response.",
    });
  }

  return {
    sessionId: payload.sessionId,
    sessionToken: payload.sessionToken,
    createdAt: payload.createdAt,
  };
}

function isWidgetCitation(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.chunkId === "string" &&
    typeof value.sourceId === "string" &&
    typeof value.sourceTitle === "string" &&
    typeof value.chunkIndex === "number" &&
    typeof value.similarity === "number"
  );
}

function isWidgetMessage(value: unknown): value is WidgetMessageDto {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.content !== "string" ||
    typeof value.createdAt !== "string"
  ) {
    return false;
  }

  if (value.role === "user") {
    return true;
  }

  return (
    value.role === "assistant" &&
    Array.isArray(value.citations) &&
    value.citations.every(isWidgetCitation)
  );
}

function parseMessages(payload: unknown): ListWidgetMessagesResponse {
  if (
    !(
      isRecord(payload) &&
      Array.isArray(payload.messages) &&
      payload.messages.every(isWidgetMessage)
    )
  ) {
    throw new WidgetApiError({
      status: 200,
      message: "Widget API returned an invalid message history.",
    });
  }

  return { messages: payload.messages };
}

export async function createWidgetSession(options: {
  apiUrl: string;
  embedKey: string;
}): Promise<WidgetSession> {
  const payload = await requestJson(`${options.apiUrl}/widget/sessions`, {
    method: "POST",
    credentials: "omit",
    headers: { "X-Geho-Key": options.embedKey },
  });

  return {
    ...parseCreatedSession(payload),
    persistence: "memory",
  };
}

export async function listWidgetMessages(options: {
  apiUrl: string;
  embedKey: string;
  session: WidgetSession;
}): Promise<WidgetMessageDto[]> {
  const payload = await requestJson(
    `${options.apiUrl}/widget/sessions/${encodeURIComponent(
      options.session.sessionId
    )}/messages`,
    {
      method: "GET",
      credentials: "omit",
      headers: {
        "X-Geho-Key": options.embedKey,
        Authorization: `Bearer ${options.session.sessionToken}`,
      },
    }
  );

  return parseMessages(payload).messages;
}
