import { useChat } from "@ai-sdk/react";
import { SendIcon } from "lucide-react";
import { type SubmitEvent, useEffect, useMemo, useRef, useState } from "react";
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
import { WidgetApiError } from "../widget-client";
import { createWidgetTransport } from "../widget-transport";
import { Alert, AlertAction, AlertDescription } from "./ui/alert";
import { Button } from "./ui/button";

type WidgetChatRuntimeProps = {
  apiUrl: string;
  embedKey: string;
  sessionId: string;
  sessionToken: string;
  initialMessages: WidgetUIMessage[];
  needsResume: boolean;
  onRefreshHistory: () => void;
};

export function WidgetChatRuntime({
  apiUrl,
  embedKey,
  sessionId,
  sessionToken,
  initialMessages,
  needsResume,
  onRefreshHistory,
}: WidgetChatRuntimeProps) {
  const [input, setInput] = useState("");

  const didAutoResume = useRef(false);
  const didRequestHistoryRefresh = useRef(false);

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

  const { messages, sendMessage, regenerate, status, error, clearError } =
    useChat<WidgetUIMessage>({
      id: sessionId,
      messages: initialMessages,
      transport,
    });

  const isBusy = status === "submitted" || status === "streaming";
  const canSend =
    status === "ready" &&
    input.trim().length > 0 &&
    input.trim().length <= 2000;

  const resumeMessageId =
    needsResume && initialMessages.at(-1)?.role === "user"
      ? initialMessages.at(-1)?.id
      : undefined;

  useEffect(() => {
    if (!resumeMessageId || didAutoResume.current) {
      return;
    }

    didAutoResume.current = true;
    regenerate({ messageId: resumeMessageId });
  }, [resumeMessageId, regenerate]);

  useEffect(() => {
    if (
      error instanceof WidgetApiError &&
      error.code === "NO_UNANSWERED_MESSAGE" &&
      !didRequestHistoryRefresh.current
    ) {
      didRequestHistoryRefresh.current = true;
      onRefreshHistory();
    }
  }, [error, onRefreshHistory]);

  const submitMessage = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    const content = input.trim();

    if (!content || status !== "ready") {
      return;
    }

    setInput("");
    sendMessage({ text: content });
  };

  const retryResume = () => {
    clearError();

    if (!resumeMessageId) {
      return;
    }

    regenerate({ messageId: resumeMessageId });
  };

  return (
    <>
      <div
        aria-live="polite"
        className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto"
      >
        {messages.length === 0 ? (
          <p className="m-auto text-center text-muted-foreground text-sm">
            Ask Geho a question.
          </p>
        ) : (
          messages.map((message) => (
            <WidgetMessage key={message.id} message={message} />
          ))
        )}

        {status === "submitted" ? (
          <p className="text-muted-foreground text-sm">Thinking…</p>
        ) : null}

        {error ? (
          <Alert className="max-w-sm" variant="warning">
            <AlertDescription>
              Couldn&apos;t complete the answer.
            </AlertDescription>
            <AlertAction>
              <Button onClick={retryResume} size="xs" variant="ghost">
                Continue
              </Button>
            </AlertAction>
          </Alert>
        ) : null}
      </div>

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
              {isBusy ? <Spinner /> : <SendIcon />}
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
