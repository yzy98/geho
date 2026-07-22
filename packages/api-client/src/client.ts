import type { AppType } from "@geho/api/app";
import { hc } from "hono/client";

export const createApiClient = (apiUrl = "/api") =>
  hc<AppType>(apiUrl, {
    init: {
      credentials: "include",
    },
  });

export type ApiClient = ReturnType<typeof createApiClient>;
