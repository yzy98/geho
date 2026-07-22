import { Hono } from "hono";
import { cors } from "hono/cors";
import { requireWidgetAccess } from "../../middleware/require-widget-access";
import type { RouteDependencies } from "../types";
import { createWidgetMessagesRoute } from "./messages";
import { createWidgetSessionsRoute } from "./sessions";

type CreateWidgetRoutesOptions = Pick<
  RouteDependencies,
  "db" | "encryptionKey"
>;

export const createWidgetRoutes = ({
  db,
  encryptionKey,
}: CreateWidgetRoutesOptions) =>
  new Hono()
    .use(
      "*",
      cors({
        origin: (origin) => origin,
        allowHeaders: ["Content-Type", "Authorization", "X-Geho-Key"],
        allowMethods: ["POST", "GET", "OPTIONS"],
        maxAge: 86_400,
        credentials: false,
      })
    )
    .use("*", requireWidgetAccess(db))
    .route("/sessions", createWidgetSessionsRoute({ db }))
    .route(
      "/sessions/:sessionId/messages",
      createWidgetMessagesRoute({ db, encryptionKey })
    );
