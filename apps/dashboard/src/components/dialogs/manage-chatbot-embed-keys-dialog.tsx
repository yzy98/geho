import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@geho/ui/components/alert";
import { Button } from "@geho/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@geho/ui/components/card";
import { Input } from "@geho/ui/components/input";
import { ResponsiveDialog } from "@geho/ui/components/responsive-dialog";
import { Separator } from "@geho/ui/components/separator";
import { Skeleton } from "@geho/ui/components/skeleton";
import { toast } from "@geho/ui/components/sonner";
import { useIsMobile } from "@geho/ui/hooks/use-mobile";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangleIcon, CopyIcon, KeyRoundIcon } from "lucide-react";
import { useRef, useState } from "react";
import { CreateEmbedKeyForm } from "@/components/forms/create-embed-key-form";
import type { Chatbot } from "@/queries/chatbot";
import {
  type CreateEmbedKeyResult,
  chatbotEmbedKeysQueryOptions,
  type EmbedKey,
} from "@/queries/embed-key";

type ManageChatbotEmbedKeysDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  chatbot: Chatbot;
  canCreate: boolean;
};

export const ManageChatbotEmbedKeysDialog = ({
  open,
  onOpenChange,
  organizationId,
  chatbot,
  canCreate,
}: ManageChatbotEmbedKeysDialogProps) => {
  const [createdResult, setCreatedResult] =
    useState<CreateEmbedKeyResult | null>(null);

  const isMobile = useIsMobile();

  const {
    data: queryData,
    error,
    isError,
    isPending,
    refetch,
  } = useQuery(
    chatbotEmbedKeysQueryOptions({
      organizationId,
      chatbotId: chatbot.id,
    })
  );

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setCreatedResult(null);
    }

    onOpenChange(nextOpen);
  };

  return (
    <ResponsiveDialog
      description={`Manage website embed keys for ${chatbot.name}.`}
      onOpenChange={handleOpenChange}
      open={open}
      title="Embed keys"
    >
      <div className={isMobile ? "px-4" : undefined}>
        {createdResult ? (
          <EmbedKeyReveal
            onDone={() => handleOpenChange(false)}
            rawKey={createdResult.key}
          />
        ) : (
          <div className="flex flex-col gap-4">
            <EmbedKeyQueryContent
              canCreate={canCreate}
              embedKeys={queryData?.embedKeys}
              error={error}
              isError={isError}
              isPending={isPending}
              onRetry={refetch}
            />
            {canCreate && (
              <>
                <Separator />
                <CreateEmbedKeyForm
                  chatbotId={chatbot.id}
                  onCreated={setCreatedResult}
                  organizationId={organizationId}
                />
              </>
            )}
          </div>
        )}
      </div>
    </ResponsiveDialog>
  );
};

type EmbedKeyRevealProps = {
  rawKey: string;
  onDone: () => void;
};

function EmbedKeyReveal({ rawKey, onDone }: EmbedKeyRevealProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const copyKey = async () => {
    try {
      await navigator.clipboard.writeText(rawKey);
      toast.success("Embed key copied.");
    } catch {
      inputRef.current?.focus();
      inputRef.current?.select();

      toast.error("Unable to copy automatically. Press Ctrl+C or Cmd+C.");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Alert>
        <KeyRoundIcon />
        <AlertTitle>Copy this key now</AlertTitle>
        <AlertDescription>
          This key is shown only once. Store it before closing.
        </AlertDescription>
      </Alert>
      <div className="flex items-center gap-2">
        <Input
          aria-label="Embed key"
          autoComplete="off"
          className="font-mono"
          onFocus={(event) => event.currentTarget.select()}
          readOnly
          ref={inputRef}
          spellCheck={false}
          type="text"
          value={rawKey}
        />
        <Button
          aria-label="Copy embed key"
          onClick={copyKey}
          size="icon"
          type="button"
          variant="outline"
        >
          <CopyIcon />
        </Button>
      </div>
      <Button onClick={onDone} type="button">
        Done
      </Button>
    </div>
  );
}

type EmbedKeyQueryContentProps = {
  embedKeys: EmbedKey[] | undefined;
  error: Error | null;
  isError: boolean;
  isPending: boolean;
  onRetry: () => void;
  canCreate: boolean;
};

function EmbedKeyQueryContent({
  embedKeys,
  error,
  isError,
  isPending,
  onRetry,
  canCreate,
}: EmbedKeyQueryContentProps) {
  if (isPending) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertTriangleIcon />
        <AlertTitle>Unable to load embed keys</AlertTitle>
        <AlertDescription>
          {error?.message ?? "An unexpected error occurred."}
        </AlertDescription>
        <AlertAction>
          <Button onClick={onRetry} size="xs" type="button" variant="secondary">
            Try again
          </Button>
        </AlertAction>
      </Alert>
    );
  }

  if (!embedKeys?.length) {
    return (
      <Alert>
        <KeyRoundIcon />
        <AlertTitle>No embed keys</AlertTitle>
        <AlertDescription>
          {canCreate
            ? "Create a key to connect this chatbot to a website."
            : "The organization owner must create the first embed key."}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {embedKeys.map((embedKey) => (
        <EmbedKeyCard embedKey={embedKey} key={embedKey.id} />
      ))}
    </div>
  );
}

function EmbedKeyCard({ embedKey }: { embedKey: EmbedKey }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{embedKey.keyPrefix}</CardTitle>
        <CardDescription>
          Created{" "}
          {new Intl.DateTimeFormat(undefined, {
            dateStyle: "medium",
          }).format(new Date(embedKey.createdAt))}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {embedKey.allowedDomains.length > 0 ? (
          <ul className="flex flex-col">
            {embedKey.allowedDomains.map((domain) => (
              <li className="truncate" key={domain} title={domain}>
                {domain}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">Any origin</p>
        )}
      </CardContent>
    </Card>
  );
}
