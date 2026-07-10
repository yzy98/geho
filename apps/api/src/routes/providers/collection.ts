import { Hono } from "hono";
import type { AppEnv } from "../../context";
import { requireAuth } from "../../middleware/require-auth";
import { requireOrganization } from "../../middleware/require-organization";
import { requireOrganizationPermission } from "../../middleware/require-organization-permission";
import { createLlmProviderSchema } from "../../schemas/llm-providers";
import {
  createLlmProvider,
  listLlmProviders,
} from "../../services/llm-providers";
import type { RouteDependencies } from "../types";
import { jsonValidator } from "../validators";

type CreateProviderCollectionRouteOptions = Pick<
  RouteDependencies,
  "auth" | "db" | "encryptionKey"
>;

const createProviderValidator = jsonValidator({
  schema: createLlmProviderSchema,
  message: "Invalid llm-provider input.",
});

export const createProviderCollectionRoute = ({
  auth,
  db,
  encryptionKey,
}: CreateProviderCollectionRouteOptions) =>
  new Hono<AppEnv>()
    .use("*", requireAuth(auth))
    .use("*", requireOrganization(auth))
    .get(
      "/",
      requireOrganizationPermission(auth, {
        llmProvider: ["read"],
      }),
      async (c) => {
        const organization = c.get("organization");

        const result = await listLlmProviders({
          db,
          organizationId: organization.id,
        });

        return c.json({
          providers: result.providers,
        });
      }
    )
    .post(
      "/",
      requireOrganizationPermission(auth, {
        llmProvider: ["create"],
      }),
      createProviderValidator,
      async (c) => {
        const organization = c.get("organization");
        const input = c.req.valid("json");

        const result = await createLlmProvider({
          db,
          encryptionKey,
          input,
          organizationId: organization.id,
        });

        return c.json(
          {
            provider: result.provider,
          },
          201
        );
      }
    );
