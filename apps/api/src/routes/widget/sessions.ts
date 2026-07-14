import { Hono } from "hono";
import type { WidgetEnv } from "../../context";
import { createWidgetSession } from "../../services/widget-session";
import type { RouteDependencies } from "../types";

type CreateWidgetSessionsRouteOptions = Pick<RouteDependencies, "db">;

export const createWidgetSessionsRoute = ({
  db,
}: CreateWidgetSessionsRouteOptions) =>
  new Hono<WidgetEnv>().post("/", async (c) => {
    const scope = c.get("widgetScope");

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
