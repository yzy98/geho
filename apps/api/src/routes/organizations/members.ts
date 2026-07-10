import { Hono } from "hono";
import type { AppEnv } from "../../context";
import { requireAuth } from "../../middleware/require-auth";
import { requireOrganization } from "../../middleware/require-organization";
import { requireOrganizationPermission } from "../../middleware/require-organization-permission";
import { addOrganizationMemberSchema } from "../../schemas/organization-members";
import { addOrganizationMember } from "../../services/organization-members";
import type { RouteDependencies } from "../types";
import { jsonValidator } from "../validators";

type CreateOrganizationMembersRouteOptions = Pick<
  RouteDependencies,
  "auth" | "db"
>;

const addOrganizationMemberValidator = jsonValidator({
  schema: addOrganizationMemberSchema,
  message: "Invalid organization member input.",
});

const userNotFoundResponse = {
  code: "USER_NOT_FOUND",
  message: "No registered user was found for this email.",
} as const;

const userAlreadyOrganizationMemberResponse = {
  code: "USER_ALREADY_ORGANIZATION_MEMBER",
  message: "This user is already an organization member.",
} as const;

export const createOrganizationMembersRoute = ({
  auth,
  db,
}: CreateOrganizationMembersRouteOptions) =>
  new Hono<AppEnv>()
    .use("*", requireAuth(auth))
    .get("/", requireOrganization(auth), async (c) => {
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
      "/",
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
