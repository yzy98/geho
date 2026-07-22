import type { AuthServer } from "@geho/auth/server";
import { createMiddleware } from "hono/factory";
import type { AppEnv } from "../context";

const organizationMembershipRequiredResponse = {
  code: "ORGANIZATION_MEMBERSHIP_REQUIRED",
  message: "Current user does not belong to an organization.",
} as const;

export const requireOrganization = (auth: AuthServer) =>
  createMiddleware<AppEnv>(async (c, next) => {
    const organizations = await auth.api.listOrganizations({
      headers: c.req.raw.headers,
    });

    // One tenant
    const organization = organizations[0];

    if (!organization) {
      return c.json(organizationMembershipRequiredResponse, 403);
    }

    c.set("organization", organization);

    await next();
  });
