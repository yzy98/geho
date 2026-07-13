import { Hono } from "hono";
import { cors } from "hono/cors";
import type { RouteDependencies } from "../types";
import { createWidgetSessionsRoute } from "./sessions";

type CreateWidgetRoutesOptions = Pick<RouteDependencies, "db">;

export const createWidgetRoutes = ({ db }: CreateWidgetRoutesOptions) =>
  new Hono()
    .use(
      "*",
      cors({
        origin: (origin) => origin,
        allowHeaders: ["Content-Type", "Authorization", "X-Heho-Key"],
        allowMethods: ["POST", "GET", "OPTIONS"],
        maxAge: 86_400,
        credentials: false,
      })
    )
    .route("/sessions", createWidgetSessionsRoute({ db }));
