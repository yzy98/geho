import { Hono } from "hono";
import {
  widgetSessionAccessHeadersSchema,
  widgetSessionParamsSchema,
} from "../../schemas/widget";
import { resolveWidgetAccess } from "../../services/widget-access";
import { listWidgetMessages } from "../../services/widget-messages";
import { authorizeWidgetSession } from "../../services/widget-session-access";
import type { RouteDependencies } from "../types";
import { headerValidator, paramValidator } from "../validators";

type CreateWidgetMessagesRouteOptions = Pick<RouteDependencies, "db">;

const invalidWidgetAccessResponse = {
  code: "INVALID_WIDGET_ACCESS",
  message: "Widget access was denied.",
} as const;

const sessionExpiredResponse = {
  code: "SESSION_EXPIRED",
  message: "Widget session has expired.",
} as const;

const widgetSessionParamsValidator = paramValidator({
  schema: widgetSessionParamsSchema,
  message: "Invalid widget session ID.",
});

const widgetSessionAccessHeadersValidator = headerValidator({
  schema: widgetSessionAccessHeadersSchema,
  ...invalidWidgetAccessResponse,
});

export const createWidgetMessagesRoute = ({
  db,
}: CreateWidgetMessagesRouteOptions) =>
  new Hono().get(
    "/",
    widgetSessionParamsValidator,
    widgetSessionAccessHeadersValidator,
    async (c) => {
      const { sessionId } = c.req.valid("param");
      const { origin, rawEmbedKey, rawSessionToken } = c.req.valid("header");

      // Raw Embed Key and Origin decide trustable Organization/Chatbot scope
      const scope = await resolveWidgetAccess({
        db,
        origin,
        rawEmbedKey,
      });

      if (!scope) {
        return c.json(invalidWidgetAccessResponse, 403);
      }

      // Session ID + Session Token must belong to the same Session
      const access = await authorizeWidgetSession({
        db,
        scope,
        sessionId,
        rawSessionToken,
      });

      if (access.status === "invalid_access") {
        return c.json(invalidWidgetAccessResponse, 403);
      }

      if (access.status === "expired") {
        return c.json(sessionExpiredResponse, 410);
      }

      // Fetch the returned access Session's Messages
      const result = await listWidgetMessages({
        db,
        session: access.session,
      });

      return c.json({
        messages: result.messages,
      });
    }
  );
