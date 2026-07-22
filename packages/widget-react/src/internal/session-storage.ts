import type { WidgetSession } from "./widget-contract";

const STORAGE_PREFIX = "geho:widget-react:v1:";
const SESSION_TOKEN_PATTERN = /^st_[A-Za-z0-9_-]{43}$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type StoredWidgetSessionV1 = {
  version: 1;
  sessionId: string;
  sessionToken: string;
  createdAt: string;
  storedAt: string;
};

export type SessionPersistence = {
  cacheKey: string;
  storageKey: string | null;
  storage: Storage | null;
  warning: string | null;
};

// Fallback Memory storage
const memorySessions = new Map<string, WidgetSession>();

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function createFingerprint(
  normalizedApiUrl: string,
  embedKey: string
): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    throw new Error("Web Crypto is unavailable.");
  }

  const source = JSON.stringify([normalizedApiUrl, embedKey]);
  const encoded = new TextEncoder().encode(source);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", encoded);
  return toHex(digest);
}

function parseStoredSession(rawValue: string): WidgetSession | null {
  let parsed: unknown;

  try {
    parsed = JSON.parse(rawValue);
  } catch {
    return null;
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("version" in parsed) ||
    parsed.version !== 1 ||
    !("sessionId" in parsed) ||
    typeof parsed.sessionId !== "string" ||
    !UUID_PATTERN.test(parsed.sessionId) ||
    !("sessionToken" in parsed) ||
    typeof parsed.sessionToken !== "string" ||
    !SESSION_TOKEN_PATTERN.test(parsed.sessionToken) ||
    !("createdAt" in parsed) ||
    typeof parsed.createdAt !== "string" ||
    Number.isNaN(Date.parse(parsed.createdAt)) ||
    !("storedAt" in parsed) ||
    typeof parsed.storedAt !== "string" ||
    Number.isNaN(Date.parse(parsed.storedAt))
  ) {
    return null;
  }

  return {
    sessionId: parsed.sessionId,
    sessionToken: parsed.sessionToken,
    createdAt: parsed.createdAt,
    persistence: "local-storage",
  };
}

function getLocalStorage(): Storage | null {
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

/**
 * Create session persistence for storage
 * @param normalizedApiUrl
 * @param embedKey
 * @returns
 */
export async function createSessionPersistence(
  normalizedApiUrl: string,
  embedKey: string
): Promise<SessionPersistence> {
  let storageKey: string | null = null;
  let warning: string | null = null;

  try {
    const fingerprint = await createFingerprint(normalizedApiUrl, embedKey);
    storageKey = `${STORAGE_PREFIX}${fingerprint}`;
  } catch {
    warning =
      "This browser cannot persist the Widget Session. Refreshing will start a new conversation.";
  }

  const storage = getLocalStorage();

  if (!storage) {
    warning =
      "Local storage is unavailable. Refreshing will start a new conversation.";
  }

  return {
    cacheKey: storageKey ?? JSON.stringify([normalizedApiUrl, embedKey]),
    storageKey,
    storage,
    warning,
  };
}

/**
 * Get persisted session from localStorage or fallbacked memory storage
 * @param persistence
 * @returns
 */
export function readPersistedSession(
  persistence: SessionPersistence
): WidgetSession | null {
  const { cacheKey, storageKey, storage } = persistence;

  if (storage && storageKey) {
    try {
      const rawValue = storage.getItem(storageKey);

      if (rawValue) {
        const parsed = parseStoredSession(rawValue);

        if (parsed) {
          // Store it into fallback memory storage
          memorySessions.set(cacheKey, parsed);
          return parsed;
        }

        storage.removeItem(storageKey);
      }
    } catch {
      // localStorage not works, try fallback memory cache
      persistence.storage = null;
      persistence.warning =
        "Local storage became unavailable. Refreshing may start a new conversation.";
    }
  }

  // Read it from fallback memory storage
  const cachedSession = memorySessions.get(cacheKey);

  if (!cachedSession) {
    return null;
  }

  const memorySession: WidgetSession = {
    ...cachedSession,
    persistence: "memory",
  };

  memorySessions.set(cacheKey, memorySession);

  persistence.warning ??=
    "This conversation is available only for the current page.";

  return memorySession;
}

/**
 * Persist session into storage
 * @param persistence
 * @param session
 * @returns
 */
export function persistSession(
  persistence: SessionPersistence,
  session: WidgetSession
): { session: WidgetSession; warning: string | null } {
  const memorySession: WidgetSession = {
    ...session,
    persistence: "memory",
  };

  // Store session into fallback memeory storage
  // At least ensure persistence is "memory"
  memorySessions.set(persistence.cacheKey, memorySession);

  // Check localStorage works or not
  if (!(persistence.storageKey && persistence.storage)) {
    return {
      session: memorySession,
      warning:
        persistence.warning ??
        "LocalStorage not works. The Widget Session is available only for this page.",
    };
  }

  const record: StoredWidgetSessionV1 = {
    version: 1,
    sessionId: session.sessionId,
    sessionToken: session.sessionToken,
    createdAt: session.createdAt,
    storedAt: new Date().toISOString(),
  };

  try {
    // Store session into localStorage
    persistence.storage.setItem(persistence.storageKey, JSON.stringify(record));

    const persistedSession: WidgetSession = {
      ...session,
      persistence: "local-storage",
    };

    // Update the persistence to "local-storage"
    memorySessions.set(persistence.cacheKey, persistedSession);

    return {
      session: persistedSession,
      warning: null,
    };
  } catch {
    return {
      session: memorySession,
      warning:
        "The Widget Session could not be persisted. Refreshing may start a new conversation.",
    };
  }
}

/**
 * Remove session from storage
 * @param persistence
 * @returns
 */
export function removePersistedSession(persistence: SessionPersistence) {
  // Remove it from meomory storage
  memorySessions.delete(persistence.cacheKey);

  if (!(persistence.storage && persistence.storageKey)) {
    return;
  }

  try {
    persistence.storage.removeItem(persistence.storageKey);
  } catch {
    // 删除失败不能阻断 Session 重建。
  }
}
