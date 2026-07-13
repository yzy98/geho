import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { widgetAccessHeadersSchema } from "../../schemas/widget";
import { resolveWidgetAccess } from "../../services/widget-access";
import { createWidgetSession } from "../../services/widget-sessions";
import type { RouteDependencies } from "../types";

type CreateWidgetSessionsOptions = Pick<RouteDependencies, "db">;

const invalidWidgetAccessResponse = {
  code: "INVALID_WIDGET_ACCESS",
  message: "Widget access was denied.",
} as const;

const widgetAccessHeadersValidator = zValidator(
  "header",
  widgetAccessHeadersSchema,
  (result, c) => {
    if (!result.success) {
      return c.json(invalidWidgetAccessResponse, 403);
    }
  }
);

export const createWidgetSessionsRoute = ({
  db,
}: CreateWidgetSessionsOptions) =>
  new Hono().post("/", widgetAccessHeadersValidator, async (c) => {
    const { origin, rawEmbedKey } = c.req.valid("header");

    const scope = await resolveWidgetAccess({
      db,
      origin,
      rawEmbedKey,
    });

    if (!scope) {
      return c.json(invalidWidgetAccessResponse, 403);
    }

    const session = await createWidgetSession({
      db,
      scope,
    });

    return c.json(
      {
        sessionId: session.sessionId,
        sessionToken: session.sessionToken,
        createdAt: session.createdAt.toISOString(),
      },
      201
    );
  });
