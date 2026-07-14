import type { DbClient } from "@heho/db";
import { createMiddleware } from "hono/factory";
import type { WidgetSessionEnv } from "../context";
import {
  widgetSessionAuthorizationHeadersSchema,
  widgetSessionParamsSchema,
} from "../schemas/widget";
import { authorizeWidgetSession } from "../services/widget-session-access";
import { invalidWidgetAccessResponse } from "./require-widget-access";

export const sessionExpiredResponse = {
  code: "SESSION_EXPIRED",
  message: "Widget session has expired.",
} as const;

export const requireWidgetSessionAccess = (db: DbClient) =>
  createMiddleware<WidgetSessionEnv>(async (c, next) => {
    // Valid params sessionId
    const parsedParams = await widgetSessionParamsSchema.safeParseAsync(
      c.req.param()
    );

    if (!parsedParams.success) {
      return c.json(
        {
          code: "VALIDATION_ERROR",
          message: "Invalid widget session ID.",
          issues: parsedParams.error.issues,
        },
        400
      );
    }

    // Validate headers Authorization
    const parsedHeaders =
      await widgetSessionAuthorizationHeadersSchema.safeParseAsync({
        authorization: c.req.header("authorization"),
      });

    if (!parsedHeaders.success) {
      return c.json(invalidWidgetAccessResponse, 403);
    }

    const access = await authorizeWidgetSession({
      db,
      scope: c.get("widgetScope"),
      sessionId: parsedParams.data.sessionId,
      rawSessionToken: parsedHeaders.data.rawSessionToken,
    });

    if (access.status === "invalid_access") {
      return c.json(invalidWidgetAccessResponse, 403);
    }

    if (access.status === "expired") {
      return c.json(sessionExpiredResponse, 410);
    }

    c.set("widgetSession", access.session);

    await next();
  });
