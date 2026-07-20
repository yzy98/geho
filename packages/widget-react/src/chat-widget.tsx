import { MessageCircleIcon, XIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/internal/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/internal/components/ui/card";
import { WidgetShadowRoot } from "@/internal/shadow-root";
import { useWidgetBootstrap } from "./internal/hooks/use-widget-bootstrap";
import {
  WidgetConfigurationError,
  WidgetConnectingState,
  WidgetConnectionError,
} from "./internal/widget-bootstrap-states";
import { WidgetChatRuntime } from "./internal/widget-chat-runtime";

export type ChatWidgetProps = {
  apiUrl: string;
  embedKey: string;
};

export function ChatWidget({ apiUrl, embedKey }: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const bootstrap = useWidgetBootstrap({
    apiUrl,
    embedKey,
  });

  return (
    <WidgetShadowRoot>
      <div className="pointer-events-none fixed inset-0 z-2147483000">
        <div className="pointer-events-auto absolute right-4 bottom-4">
          {isOpen ? (
            <Card className="h-[min(38rem,calc(100vh-6rem))] w-[min(24rem,calc(100vw-2rem))]">
              <CardHeader className="border-b">
                <CardTitle>Ask Heho</CardTitle>
                <CardAction>
                  <Button
                    aria-label="Close chat"
                    onClick={() => setIsOpen(false)}
                    size="icon-sm"
                    type="button"
                    variant="ghost"
                  >
                    <XIcon data-icon="inline-start" />
                  </Button>
                </CardAction>
              </CardHeader>

              <CardContent className="flex min-h-0 flex-1 flex-col gap-3">
                {bootstrap.status === "loading" ? (
                  <WidgetConnectingState />
                ) : null}

                {bootstrap.status === "configuration-error" ? (
                  <WidgetConfigurationError message={bootstrap.message} />
                ) : null}

                {bootstrap.status === "recoverable-error" ? (
                  <WidgetConnectionError
                    message={bootstrap.message}
                    onRetry={bootstrap.retry}
                  />
                ) : null}

                {bootstrap.status === "ready" ? (
                  <WidgetChatRuntime
                    apiUrl={bootstrap.normalizedApiUrl}
                    embedKey={embedKey.trim()}
                    initialMessages={bootstrap.messages}
                    key={bootstrap.session.sessionId}
                    sessionId={bootstrap.session.sessionId}
                    sessionToken={bootstrap.session.sessionToken}
                  />
                ) : null}
              </CardContent>
            </Card>
          ) : (
            <Button
              aria-label="Open chat"
              className="rounded-full shadow-lg"
              onClick={() => setIsOpen(true)}
              size="icon-lg"
              type="button"
            >
              <MessageCircleIcon data-icon="inline-start" />
            </Button>
          )}
        </div>
      </div>
    </WidgetShadowRoot>
  );
}
