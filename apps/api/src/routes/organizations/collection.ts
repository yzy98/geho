import { Hono } from "hono";
import type { AppEnv } from "../../context";
import { requireAuth } from "../../middleware/require-auth";
import { createOrganizationSchema } from "../../schemas/organizations";
import {
  createInitialOrganization,
  hasAnyOrganization,
} from "../../services/organizations";
import type { RouteDependencies } from "../types";
import { jsonValidator } from "../validators";

type CreateOrganizationCollectionRouteOptions = Pick<
  RouteDependencies,
  "auth" | "db"
>;

const createOrganizationValidator = jsonValidator({
  schema: createOrganizationSchema,
  message: "Invalid organization input.",
});

const organizationMembershipRequiredResponse = {
  code: "ORGANIZATION_MEMBERSHIP_REQUIRED",
  message: "An organization already exists. Ask an owner to add the user.",
} as const;

const organizationOnboardingRequiredResponse = {
  code: "ORGANIZATION_ONBOARDING_REQUIRED",
  message: "Create an organization to continue.",
} as const;

export const createOrganizationCollectionRoute = ({
  auth,
  db,
}: CreateOrganizationCollectionRouteOptions) =>
  new Hono<AppEnv>()
    .use("*", requireAuth(auth))
    .get("/current", async (c) => {
      const organizations = await auth.api.listOrganizations({
        headers: c.req.raw.headers,
      });

      // One tenant
      const organization = organizations[0];

      if (organization) {
        return c.json({
          organization,
        });
      }

      const organizationExists = await hasAnyOrganization(db);

      // Organization exists, user does not belong to any
      if (organizationExists) {
        return c.json(organizationMembershipRequiredResponse, 403);
      }

      // Organization not exists, and user does not belong to any
      return c.json(organizationOnboardingRequiredResponse, 403);
    })
    .post("/", createOrganizationValidator, async (c) => {
      const user = c.get("user");
      const input = c.req.valid("json");

      const result = await createInitialOrganization({
        auth,
        db,
        headers: c.req.raw.headers,
        input,
        userId: user.id,
      });

      if (result.status === "user_already_has_organization") {
        return c.json(
          {
            code: "USER_ALREADY_HAS_ORGANIZATION",
            message: "Current user already belongs to an organization.",
            organization: result.organization,
          },
          409
        );
      }

      if (result.status === "organization_membership_required") {
        return c.json(organizationMembershipRequiredResponse, 403);
      }

      return c.json(
        {
          organization: result.organization,
        },
        201
      );
    });
