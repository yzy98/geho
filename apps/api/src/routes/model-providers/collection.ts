import { Hono } from "hono";
import type { AppEnv } from "../../context";
import { requireAuth } from "../../middleware/require-auth";
import { requireOrganization } from "../../middleware/require-organization";
import { requireOrganizationPermission } from "../../middleware/require-organization-permission";
import { createModelProviderSchema } from "../../schemas/model-providers";
import {
  createModelProvider,
  listModelProviders,
} from "../../services/model-providers";
import type { RouteDependencies } from "../types";
import { jsonValidator } from "../validators";

type CreateModelProviderCollectionRouteOptions = Pick<
  RouteDependencies,
  "auth" | "db" | "encryptionKey"
>;

const createModelProviderValidator = jsonValidator({
  schema: createModelProviderSchema,
  message: "Invalid model provider input.",
});

export const createModelProviderCollectionRoute = ({
  auth,
  db,
  encryptionKey,
}: CreateModelProviderCollectionRouteOptions) =>
  new Hono<AppEnv>()
    .use("*", requireAuth(auth))
    .use("*", requireOrganization(auth))
    .get(
      "/",
      requireOrganizationPermission(auth, {
        modelProvider: ["read"],
      }),
      async (c) => {
        const organization = c.get("organization");

        const result = await listModelProviders({
          db,
          organizationId: organization.id,
        });

        return c.json({
          modelProviders: result.modelProviders,
        });
      }
    )
    .post(
      "/",
      requireOrganizationPermission(auth, {
        modelProvider: ["create"],
      }),
      createModelProviderValidator,
      async (c) => {
        const organization = c.get("organization");
        const input = c.req.valid("json");

        const result = await createModelProvider({
          db,
          encryptionKey,
          input,
          organizationId: organization.id,
        });

        return c.json(
          {
            modelProvider: result.modelProvider,
          },
          201
        );
      }
    );
