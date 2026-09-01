import { Hono } from "hono";
import type { AppEnv } from "../../context";
import { requireAuth } from "../../middleware/require-auth";
import { requireOrganization } from "../../middleware/require-organization";
import { getWorkspaceOverview } from "../../services/workspace-overview";
import type { RouteDependencies } from "../types";

type CreateOrganizationOverviewRouteOptions = Pick<
  RouteDependencies,
  "auth" | "db"
>;

export const createOrganizationOverviewRoute = ({
  auth,
  db,
}: CreateOrganizationOverviewRouteOptions) =>
  new Hono<AppEnv>()
    .use("*", requireAuth(auth))
    .use("*", requireOrganization(auth))
    .get("/", async (c) => {
      const organization = c.get("organization");

      const overview = await getWorkspaceOverview({
        db,
        organizationId: organization.id,
        workspaceName: organization.name,
      });

      return c.json({ overview });
    });
