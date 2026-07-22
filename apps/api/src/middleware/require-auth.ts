import type { AuthServer } from "@geho/auth/server";
import { createMiddleware } from "hono/factory";
import type { AppEnv } from "../context";

export const requireAuth = (auth: AuthServer) =>
  createMiddleware<AppEnv>(async (c, next) => {
    const session = await auth.api.getSession({
      headers: c.req.raw.headers,
    });

    if (!session) {
      return c.json(
        {
          code: "UNAUTHORIZED",
          message: "Authentication required.",
        },
        401
      );
    }

    c.set("session", session.session);
    c.set("user", session.user);

    await next();
  });
