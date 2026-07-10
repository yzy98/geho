import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import type { CreateAppOptions } from "../app";
import type { AppEnv } from "../context";
import { requireAuth } from "../middleware/require-auth";
import { requireOrganization } from "../middleware/require-organization";
import { requireOrganizationPermission } from "../middleware/require-organization-permission";
import { createLlmProviderSchema } from "../schemas/llm-providers";
import { createLlmProvider, listLlmProviders } from "../services/llm-providers";

type CreateLlmProvidersRouteOptions = CreateAppOptions;

const createLlmProviderValidator = zValidator(
  "json",
  createLlmProviderSchema,
  (result, c) => {
    if (!result.success) {
      return c.json(
        {
          code: "VALIDATION_ERROR",
          message: "Invalid llm-provider input.",
          issues: result.error.issues,
        },
        400
      );
    }
  }
);

export const createLlmProvidersRoute = ({
  auth,
  db,
  encryptionKey,
}: CreateLlmProvidersRouteOptions) =>
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
      createLlmProviderValidator,
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
