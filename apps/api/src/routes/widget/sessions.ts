import { Hono } from "hono";
import { widgetAccessHeadersSchema } from "../../schemas/widget";
import { resolveWidgetAccess } from "../../services/widget-access";
import { createWidgetSession } from "../../services/widget-session";
import type { RouteDependencies } from "../types";
import { headerValidator } from "../validators";

type CreateWidgetSessionsRouteOptions = Pick<RouteDependencies, "db">;

const invalidWidgetAccessResponse = {
  code: "INVALID_WIDGET_ACCESS",
  message: "Widget access was denied.",
} as const;

const widgetAccessHeadersValidator = headerValidator({
  schema: widgetAccessHeadersSchema,
  ...invalidWidgetAccessResponse,
});

export const createWidgetSessionsRoute = ({
  db,
}: CreateWidgetSessionsRouteOptions) =>
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
