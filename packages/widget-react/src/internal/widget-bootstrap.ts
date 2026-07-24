import {
  createSessionPersistence,
  persistSession,
  readPersistedSession,
  removePersistedSession,
  type SessionPersistence,
} from "./session-storage";
import {
  createWidgetSession,
  listWidgetMessages,
  normalizeApiUrl,
  WidgetApiError,
  WidgetConfigurationError,
} from "./widget-client";
import {
  mapWidgetHistory,
  type WidgetSession,
  type WidgetUIMessage,
} from "./widget-contract";

export type WidgetBootstrapReadyData = {
  normalizedApiUrl: string;
  session: WidgetSession;
  messages: WidgetUIMessage[];
  needsResume: boolean;
  storageWarning: string | null;
};

const inFlightBootstraps = new Map<string, Promise<WidgetBootstrapReadyData>>();

function hasUnansweredMessage(messages: WidgetUIMessage[]): boolean {
  return messages.at(-1)?.role === "user";
}

async function createAndPersistSession(options: {
  normalizedApiUrl: string;
  embedKey: string;
  persistence: SessionPersistence;
}): Promise<WidgetBootstrapReadyData> {
  // POST /widget/sessions API to create a new Chat Session
  const session = await createWidgetSession({
    apiUrl: options.normalizedApiUrl,
    embedKey: options.embedKey,
  });

  // Persist session (LocalStorage or fallhack Memory)
  const persisted = persistSession(options.persistence, session);

  return {
    normalizedApiUrl: options.normalizedApiUrl,
    session: persisted.session,
    storageWarning: persisted.warning,
    messages: [], // Newly created Session has no Messages
    needsResume: false,
  };
}

async function runBootstrap(options: {
  normalizedApiUrl: string;
  embedKey: string;
  persistence: SessionPersistence;
}): Promise<WidgetBootstrapReadyData> {
  // Get persisted session from localStorage or fallbacked memory storage
  const persistedSession = readPersistedSession(options.persistence);

  // Create a new Chat Session and persist it
  // Newly created session has no messages, so return it
  if (!persistedSession) {
    return await createAndPersistSession(options);
  }

  try {
    // Get /widget/sessions/:sessionId/messages to get session history chat messages
    const history = await listWidgetMessages({
      apiUrl: options.normalizedApiUrl,
      embedKey: options.embedKey,
      session: persistedSession,
    });
    const messages = mapWidgetHistory(history);

    return {
      normalizedApiUrl: options.normalizedApiUrl,
      session: persistedSession,
      messages,
      needsResume: hasUnansweredMessage(messages),
      storageWarning: options.persistence.warning,
    };
  } catch (error) {
    // Session expired, remove it from persistence
    // And create a new session, return it
    if (
      error instanceof WidgetApiError &&
      error.status === 410 &&
      error.code === "SESSION_EXPIRED"
    ) {
      removePersistedSession(options.persistence);
      return await createAndPersistSession(options);
    }

    throw error;
  }
}

export async function bootstrapWidget({
  apiUrl,
  embedKey: propsEmbedKey,
}: {
  apiUrl: string;
  embedKey: string;
}): Promise<WidgetBootstrapReadyData> {
  const normalizedApiUrl = normalizeApiUrl(apiUrl);
  const embedKey = propsEmbedKey.trim();

  if (!embedKey) {
    throw new WidgetConfigurationError("embedKey is required.");
  }

  // Create session persistence for storage, based on normalizeApiUrl and embedKey
  const persistence = await createSessionPersistence(
    normalizedApiUrl,
    embedKey
  );

  const existing = inFlightBootstraps.get(persistence.cacheKey);

  if (existing) {
    return await existing;
  }

  // Core logic
  const promise = runBootstrap({
    normalizedApiUrl,
    embedKey,
    persistence,
  });

  inFlightBootstraps.set(persistence.cacheKey, promise);

  try {
    return await promise;
  } finally {
    if (inFlightBootstraps.get(persistence.cacheKey) === promise) {
      inFlightBootstraps.delete(persistence.cacheKey);
    }
  }
}
