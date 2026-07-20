import {
  createSessionCacheKey,
  deleteMemorySession,
  getMemorySession,
  setMemorySession,
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
};

const inFlightBootstraps = new Map<string, Promise<WidgetBootstrapReadyData>>();

async function createAndStoreSession(options: {
  normalizedApiUrl: string;
  embedKey: string;
  cacheKey: string;
}): Promise<WidgetBootstrapReadyData> {
  // POST /widget/sessions API to create a new Chat Session
  const session = await createWidgetSession({
    apiUrl: options.normalizedApiUrl,
    embedKey: options.embedKey,
  });

  // Store the newly created Session into memory storage
  setMemorySession(options.cacheKey, session);

  return {
    normalizedApiUrl: options.normalizedApiUrl,
    session,
    messages: [], // Newly created Session has no Messages
  };
}

async function runBootstrap(options: {
  normalizedApiUrl: string;
  embedKey: string;
  cacheKey: string;
}): Promise<WidgetBootstrapReadyData> {
  // Read if the Chat session is stored in memory already
  const storedSession = getMemorySession(options.cacheKey);

  // Create a new Chat Session and store it in memory
  if (!storedSession) {
    return await createAndStoreSession(options);
  }

  try {
    // Get /widget/sessions/:sessionId/messages to get session history chat messages
    const history = await listWidgetMessages({
      apiUrl: options.normalizedApiUrl,
      embedKey: options.embedKey,
      session: storedSession,
    });

    return {
      normalizedApiUrl: options.normalizedApiUrl,
      session: storedSession,
      messages: mapWidgetHistory(history),
    };
  } catch (error) {
    // Session expired, remove it from memory
    if (
      error instanceof WidgetApiError &&
      error.status === 410 &&
      error.code === "SESSION_EXPIRED"
    ) {
      deleteMemorySession(options.cacheKey);
      return await createAndStoreSession(options);
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

  // Calculate the cache key of this widget
  const cacheKey = createSessionCacheKey(normalizedApiUrl, embedKey);

  const existing = inFlightBootstraps.get(cacheKey);

  if (existing) {
    return await existing;
  }

  // Core logic
  const promise = runBootstrap({
    normalizedApiUrl,
    embedKey,
    cacheKey,
  });

  inFlightBootstraps.set(cacheKey, promise);

  try {
    return await promise;
  } finally {
    if (inFlightBootstraps.get(cacheKey) === promise) {
      inFlightBootstraps.delete(cacheKey);
    }
  }
}
