import { useChat } from "@ai-sdk/react";
import { SendIcon } from "lucide-react";
import { type SubmitEvent, useMemo, useState } from "react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/internal/components/ui/input-group";
import { Spinner } from "@/internal/components/ui/spinner";
import type {
  WidgetCitation,
  WidgetUIMessage,
} from "@/internal/widget-contract";
import { createWidgetTransport } from "../widget-transport";

type WidgetChatRuntimeProps = {
  apiUrl: string;
  embedKey: string;
  sessionId: string;
  sessionToken: string;
  initialMessages: WidgetUIMessage[];
};

export function WidgetChatRuntime({
  apiUrl,
  embedKey,
  sessionId,
  sessionToken,
  initialMessages,
}: WidgetChatRuntimeProps) {
  const [input, setInput] = useState("");

  const transport = useMemo(
    () =>
      createWidgetTransport({
        apiUrl,
        embedKey,
        sessionId,
        sessionToken,
      }),
    [apiUrl, embedKey, sessionId, sessionToken]
  );

  const { messages, sendMessage, status, error } = useChat<WidgetUIMessage>({
    id: sessionId,
    messages: initialMessages,
    transport,
  });

  const isBusy = status === "submitted" || status === "streaming";
  const canSend =
    status === "ready" &&
    input.trim().length > 0 &&
    input.trim().length <= 2000;

  const submitMessage = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    const content = input.trim();

    if (!content || status !== "ready") {
      return;
    }

    setInput("");
    sendMessage({ text: content });
  };

  return (
    <>
      <div
        aria-live="polite"
        className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto"
      >
        {messages.length === 0 ? (
          <p className="m-auto text-center text-muted-foreground text-sm">
            Ask Heho a question.
          </p>
        ) : (
          messages.map((message) => (
            <WidgetMessage key={message.id} message={message} />
          ))
        )}

        {status === "submitted" ? (
          <p className="text-muted-foreground text-sm">Thinking…</p>
        ) : null}
      </div>

      {error ? (
        <div
          className="rounded-md border border-destructive/40 p-3 text-destructive text-sm"
          role="alert"
        >
          The answer could not be completed. Message recovery will be added with
          the resume phase.
        </div>
      ) : null}

      <form className="w-full" onSubmit={submitMessage}>
        <InputGroup>
          <InputGroupTextarea
            aria-label="Message"
            disabled={isBusy || status === "error"}
            maxLength={2000}
            onChange={(event) => setInput(event.currentTarget.value)}
            placeholder="Ask a question..."
            value={input}
          />

          <InputGroupAddon align="block-end">
            <span className="text-muted-foreground text-xs">
              {input.length}/2000
            </span>

            <InputGroupButton
              aria-label={isBusy ? "Sending message" : "Send message"}
              disabled={!canSend}
              size="icon-sm"
              type="submit"
            >
              {isBusy ? <Spinner /> : <SendIcon data-icon="inline-end" />}
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </form>
    </>
  );
}

function WidgetMessage({ message }: { message: WidgetUIMessage }) {
  if (message.role === "user") {
    return (
      <div className="ml-auto max-w-[85%] rounded-xl bg-primary px-3 py-2 text-primary-foreground">
        {getUserText(message)}
      </div>
    );
  }

  const answer = getAssistantAnswer(message);
  const citations = getAssistantCitations(message);

  return (
    <div className="mr-auto max-w-[90%] space-y-2">
      <div className="rounded-xl bg-muted px-3 py-2">
        {answer || <span className="text-muted-foreground">Generating…</span>}
      </div>

      {citations.length > 0 ? (
        <ol className="space-y-1 text-muted-foreground text-xs">
          {citations.map((citation) => (
            <li key={citation.chunkId}>
              {citation.sourceTitle}
              {" · chunk "}
              {citation.chunkIndex}
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}

function getUserText(message: WidgetUIMessage): string {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");
}

function getAssistantAnswer(message: WidgetUIMessage): string {
  const part = message.parts.find(
    (candidate) => candidate.type === "data-answer"
  );

  return part?.data.text ?? "";
}

function getAssistantCitations(message: WidgetUIMessage): WidgetCitation[] {
  const part = message.parts.find(
    (candidate) => candidate.type === "data-citations"
  );

  return part?.data ?? [];
}
