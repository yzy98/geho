import { useCallback, useEffect, useState } from "react";

import {
  bootstrapWidget,
  type WidgetBootstrapReadyData,
} from "../widget-bootstrap";
import { WidgetApiError, WidgetConfigurationError } from "../widget-client";

export type WidgetBootstrapState =
  | { status: "loading" }
  | ({ status: "ready" } & WidgetBootstrapReadyData)
  | { status: "configuration-error"; message: string }
  | { status: "recoverable-error"; message: string };

export type UseWidgetBootstrapResult = WidgetBootstrapState & {
  retry: () => void;
};

function toBootstrapErrorState(error: unknown): WidgetBootstrapState {
  if (error instanceof WidgetConfigurationError) {
    return {
      status: "configuration-error",
      message: error.message,
    };
  }

  if (error instanceof WidgetApiError && error.status === 403) {
    return {
      status: "configuration-error",
      message:
        "Widget access was denied. Check apiUrl, embedKey, and the Embed Key allowed origin.",
    };
  }

  if (
    error instanceof WidgetApiError &&
    error.status >= 400 &&
    error.status < 500
  ) {
    return {
      status: "recoverable-error",
      message: "The Widget API rejected the Session request.",
    };
  }

  return {
    status: "recoverable-error",
    message:
      "Geho could not be reached. Check the API server and network connection.",
  };
}

export function useWidgetBootstrap({
  apiUrl,
  embedKey,
}: {
  apiUrl: string;
  embedKey: string;
}): UseWidgetBootstrapResult {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<WidgetBootstrapState>({
    status: "loading",
  });

  const retry = useCallback(() => {
    setAttempt((current) => current + 1);
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: ignore
  useEffect(() => {
    let active = true;
    setState({ status: "loading" });

    bootstrapWidget({
      apiUrl,
      embedKey,
    })
      .then((ready) => {
        if (active) {
          setState({ status: "ready", ...ready });
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setState(toBootstrapErrorState(error));
        }
      });

    return () => {
      // 不 abort 共享 Promise，使用 active guard 丢弃过期结果。
      active = false;
    };
  }, [apiUrl, embedKey, attempt]);

  return { ...state, retry };
}
