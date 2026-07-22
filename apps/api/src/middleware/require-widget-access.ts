import type { DbClient } from "@geho/db";
import { createMiddleware } from "hono/factory";
import type { WidgetEnv } from "../context";
import { widgetAccessHeadersSchema } from "../schemas/widget";
import { resolveWidgetAccess } from "../services/widget-access";

export const invalidWidgetAccessResponse = {
  code: "INVALID_WIDGET_ACCESS",
  message: "Widget access was denied.",
} as const;

export const requireWidgetAccess = (db: DbClient) =>
  createMiddleware<WidgetEnv>(async (c, next) => {
    // Validate headers
    const parsed = await widgetAccessHeadersSchema.safeParseAsync({
      origin: c.req.header("origin"),
      "x-geho-key": c.req.header("x-geho-key"),
    });

    if (!parsed.success) {
      return c.json(invalidWidgetAccessResponse, 403);
    }

    const { origin, rawEmbedKey } = parsed.data;

    const scope = await resolveWidgetAccess({
      db,
      origin,
      rawEmbedKey,
    });

    if (!scope) {
      return c.json(invalidWidgetAccessResponse, 403);
    }

    c.set("widgetScope", scope);

    await next();
  });
