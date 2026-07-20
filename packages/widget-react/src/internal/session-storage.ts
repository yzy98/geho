import type { WidgetSession } from "./widget-contract";

// Memory storage
const memorySessions = new Map<string, WidgetSession>();

export function createSessionCacheKey(
  normalizedApiUrl: string,
  embedKey: string
): string {
  return JSON.stringify([normalizedApiUrl, embedKey]);
}

export function getMemorySession(cacheKey: string): WidgetSession | null {
  return memorySessions.get(cacheKey) ?? null;
}

export function setMemorySession(cacheKey: string, session: WidgetSession) {
  memorySessions.set(cacheKey, session);
}

export function deleteMemorySession(cacheKey: string) {
  memorySessions.delete(cacheKey);
}
