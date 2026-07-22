import { AlertTriangleIcon } from "lucide-react";
import { Spinner } from "@/internal/components/ui/spinner";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "./ui/alert";
import { Button } from "./ui/button";

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
    <Alert className="m-auto max-w-sm" variant="warning">
      <AlertTriangleIcon />
      <AlertTitle>Widget configuration error</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
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
    <Alert className="m-auto max-w-sm" variant="warning">
      <AlertTriangleIcon />
      <AlertTitle>Unable to connect</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
      <AlertAction>
        <Button onClick={onRetry} size="xs" type="button">
          Retry
        </Button>
      </AlertAction>
    </Alert>
  );
}

export function WidgetStorageWarning({ message }: { message: string }) {
  return (
    <Alert className="max-w-sm" variant="warning">
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
