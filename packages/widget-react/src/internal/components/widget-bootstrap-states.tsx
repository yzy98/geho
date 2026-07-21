import { Button } from "@/internal/components/ui/button";
import { Spinner } from "@/internal/components/ui/spinner";

export function WidgetConnectingState() {
  return (
    <div
      aria-live="polite"
      className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-10 text-center"
    >
      <Spinner className="size-5" />
      <div className="space-y-1">
        <p className="font-medium text-sm">Connecting to Heho</p>
        <p className="text-muted-foreground text-xs">
          Preparing a secure anonymous chat session…
        </p>
      </div>
    </div>
  );
}

export function WidgetConfigurationError({ message }: { message: string }) {
  return (
    <div
      className="m-auto max-w-sm space-y-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4"
      role="alert"
    >
      <div className="space-y-1">
        <p className="font-medium text-destructive text-sm">
          Widget configuration error
        </p>
        <p className="text-muted-foreground text-xs">{message}</p>
      </div>
      <ul className="list-disc space-y-1 pl-4 text-muted-foreground text-xs">
        <li>Confirm that the Heho API URL is correct.</li>
        <li>Confirm that the Embed Key is active.</li>
        <li>Add this page origin to the Embed Key allowed domains.</li>
      </ul>
    </div>
  );
}

export function WidgetConnectionError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div
      className="m-auto max-w-sm space-y-3 rounded-lg border bg-muted/30 p-4"
      role="alert"
    >
      <div className="space-y-1">
        <p className="font-medium text-sm">Unable to connect</p>
        <p className="text-muted-foreground text-xs">{message}</p>
      </div>
      <Button onClick={onRetry} size="sm" type="button" variant="outline">
        Retry connection
      </Button>
    </div>
  );
}

export function WidgetStorageWarning({ message }: { message: string }) {
  return (
    <div
      className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs"
      role="status"
    >
      {message}
    </div>
  );
}
