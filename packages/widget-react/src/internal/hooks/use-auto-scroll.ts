/** biome-ignore-all lint/correctness/useExhaustiveDependencies: ignore */
import { useCallback, useLayoutEffect, useRef } from "react";

const BOTTOM_THRESHOLD_PX = 20;

export function useAutoScroll(messages: readonly unknown[]) {
  const containerRef = useRef<HTMLDivElement>(null);
  const shouldStickToBottomRef = useRef(true);

  const scrollToBottom = useCallback(() => {
    const container = containerRef.current;

    shouldStickToBottomRef.current = true;

    if (!container) {
      return;
    }

    container.scrollTo({
      top: container.scrollHeight - container.clientHeight,
      behavior: "auto",
    });
  }, []);

  const onScroll = useCallback(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;

    shouldStickToBottomRef.current = distanceFromBottom <= BOTTOM_THRESHOLD_PX;
  }, []);

  useLayoutEffect(() => {
    if (shouldStickToBottomRef.current) {
      scrollToBottom();
    }
  }, [messages, scrollToBottom]);

  return {
    containerRef,
    onScroll,
    scrollToBottom,
  };
}
