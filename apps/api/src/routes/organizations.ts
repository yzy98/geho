import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import type { CreateAppOptions } from "../app";
import type { AppEnv } from "../context";
import { requireAuth } from "../middleware/require-auth";
import { createOrganizationSchema } from "../schemas/organizations";
import {
  createInitialOrganization,
  hasAnyOrganization,
} from "../services/organizations";

type CreateOrganizationsRouteOptions = Omit<CreateAppOptions, "encryptionKey">;

const createOrganizationValidator = zValidator(
  "json",
  createOrganizationSchema,
  (result, c) => {
    if (!result.success) {
      return c.json(
        {
          code: "VALIDATION_ERROR",
          message: "Invalid organization input.",
          issues: result.error.issues,
        },
        400
      );
    }
  }
);

export const createOrganizationsRoute = ({
  auth,
  db,
}: CreateOrganizationsRouteOptions) =>
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
        return c.json(
          {
            code: "ORGANIZATION_MEMBERSHIP_REQUIRED",
            message:
              "An organization already exists. Ask an owner to invite this user.",
          },
          403
        );
      }

      // Organization not exists, and user does not belong to any
      return c.json(
        {
          code: "ORGANIZATION_ONBOARDING_REQUIRED",
          message: "Create an organization to continue.",
        },
        403
      );
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
        return c.json(
          {
            code: "ORGANIZATION_MEMBERSHIP_REQUIRED",
            message:
              "An organization already exists. Ask an owner to invite this user.",
          },
          403
        );
      }

      return c.json(
        {
          organization: result.organization,
        },
        201
      );
    });
