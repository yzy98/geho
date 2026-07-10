import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import type { CreateAppOptions } from "../app";
import type { AppEnv } from "../context";
import { requireAuth } from "../middleware/require-auth";
import { requireOrganization } from "../middleware/require-organization";
import { requireOrganizationPermission } from "../middleware/require-organization-permission";
import { addOrganizationMemberSchema } from "../schemas/organization-members";
import { createOrganizationSchema } from "../schemas/organizations";
import { addOrganizationMember } from "../services/organization-members";
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

const addOrganizationMemberValidator = zValidator(
  "json",
  addOrganizationMemberSchema,
  (result, c) => {
    if (!result.success) {
      return c.json(
        {
          code: "VALIDATION_ERROR",
          message: "Invalid organization member input.",
          issues: result.error.issues,
        },
        400
      );
    }
  }
);

const organizationMembershipRequiredResponse = {
  code: "ORGANIZATION_MEMBERSHIP_REQUIRED",
  message: "An organization already exists. Ask an owner to add the user.",
} as const;

const organizationOnboardingRequiredResponse = {
  code: "ORGANIZATION_ONBOARDING_REQUIRED",
  message: "Create an organization to continue.",
} as const;

const userNotFoundResponse = {
  code: "USER_NOT_FOUND",
  message: "No registered user was found for this email.",
} as const;

const userAlreadyOrganizationMemberResponse = {
  code: "USER_ALREADY_ORGANIZATION_MEMBER",
  message: "This user is already an organization member.",
} as const;

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
    })
    .get("/members", requireOrganization(auth), async (c) => {
      const organization = c.get("organization");

      const result = await auth.api.listMembers({
        headers: c.req.raw.headers,
        query: {
          organizationId: organization.id,
          limit: 100,
          offset: 0,
          sortBy: "createdAt",
          sortDirection: "desc",
        },
      });

      return c.json({
        members: result.members.map((member) => ({
          id: member.id,
          role: member.role,
          createdAt: member.createdAt,
          user: {
            name: member.user.name,
            email: member.user.email,
            image: member.user.image ?? null,
          },
        })),
        total: result.total,
      });
    })
    .post(
      "/members",
      requireOrganization(auth),
      requireOrganizationPermission(auth, {
        member: ["create"],
      }),
      addOrganizationMemberValidator,
      async (c) => {
        const organization = c.get("organization");
        const input = c.req.valid("json");

        const result = await addOrganizationMember({
          auth,
          db,
          input,
          organizationId: organization.id,
        });

        if (result.status === "user_not_found") {
          return c.json(userNotFoundResponse, 404);
        }

        if (result.status === "already_a_member") {
          return c.json(userAlreadyOrganizationMemberResponse, 409);
        }

        return c.json(
          {
            member: result.member,
          },
          201
        );
      }
    );
