import type { OrganizationPermissionRequest } from "@heho/auth/access-control";
import type { AuthServer } from "@heho/auth/server";
import { createMiddleware } from "hono/factory";
import type { AppEnv } from "../context";

const insufficientOrganizationPermissionRequiredResponse = {
  code: "INSUFFICIENT_ORGANIZATION_PERMISSION",
  message: "Current user does not have permission to perform this operation.",
} as const;

export const requireOrganizationPermission = (
  auth: AuthServer,
  permissions: OrganizationPermissionRequest
) =>
  createMiddleware<AppEnv>(async (c, next) => {
    const organization = c.get("organization");

    const result = await auth.api.hasPermission({
      headers: c.req.raw.headers,
      body: {
        organizationId: organization.id,
        permissions,
      },
    });

    if (!result.success) {
      return c.json(insufficientOrganizationPermissionRequiredResponse, 403);
    }

    await next();
  });
