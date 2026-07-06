import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import type { CreateAppOptions } from "../app";
import type { AppEnv } from "../context";
import { requireAuth } from "../middleware/require-auth";
import { requireOrganization } from "../middleware/require-organization";
import { requireOrganizationPermission } from "../middleware/require-organization-permission";
import {
  chatbotEmbedKeysParamsSchema,
  createEmbedKeySchema,
} from "../schemas/embed-keys";
import { createEmbedKey, listChatbotEmbedKeys } from "../services/embed-keys";

type CreateChatbotEmbedKeysRouteOptions = Omit<
  CreateAppOptions,
  "encryptionKey"
>;

const chatbotEmbedKeysParamsValidator = zValidator(
  "param",
  chatbotEmbedKeysParamsSchema,
  (result, c) => {
    if (!result.success) {
      return c.json(
        {
          code: "VALIDATION_ERROR",
          message: "Invalid chatbot ID.",
          issues: result.error.issues,
        },
        400
      );
    }
  }
);

const createEmbedKeyValidator = zValidator(
  "json",
  createEmbedKeySchema,
  (result, c) => {
    if (!result.success) {
      return c.json(
        {
          code: "VALIDATION_ERROR",
          message: "Invalid embed key input.",
          issues: result.error.issues,
        },
        400
      );
    }
  }
);

const invalidChatbotResponse = {
  code: "INVALID_CHATBOT",
  message: "Selected chatbot is invalid.",
} as const;

export const createChatbotEmbedKeysRoute = ({
  auth,
  db,
}: CreateChatbotEmbedKeysRouteOptions) =>
  new Hono<AppEnv>()
    .use("*", requireAuth(auth))
    .use("*", requireOrganization(auth))
    .get(
      "/:chatbotId/embed-keys",
      requireOrganizationPermission(auth, {
        embedKey: ["read"],
      }),
      chatbotEmbedKeysParamsValidator,
      async (c) => {
        const organization = c.get("organization");
        const { chatbotId } = c.req.valid("param");

        const result = await listChatbotEmbedKeys({
          db,
          chatbotId,
          organizationId: organization.id,
        });

        if (result.status === "invalid_chatbot") {
          return c.json(invalidChatbotResponse, 400);
        }

        return c.json({
          embedKeys: result.embedKeys,
        });
      }
    )
    .post(
      "/:chatbotId/embed-keys",
      requireOrganizationPermission(auth, {
        embedKey: ["create"],
      }),
      chatbotEmbedKeysParamsValidator,
      createEmbedKeyValidator,
      async (c) => {
        const organization = c.get("organization");
        const { chatbotId } = c.req.valid("param");
        const input = c.req.valid("json");

        const result = await createEmbedKey({
          db,
          chatbotId,
          input,
          organizationId: organization.id,
        });

        if (result.status === "invalid_chatbot") {
          return c.json(invalidChatbotResponse, 400);
        }

        return c.json(
          {
            embedKey: result.embedKey,
            key: result.key,
          },
          201
        );
      }
    );
