import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import type { CreateAppOptions } from "../app";
import type { AppEnv } from "../context";
import { requireAuth } from "../middleware/require-auth";
import { requireOrganization } from "../middleware/require-organization";
import { requireOrganizationPermission } from "../middleware/require-organization-permission";
import { createChatbotSchema } from "../schemas/chatbots";
import { createChatbot, listChatbots } from "../services/chatbots";

type CreateChatbotsRouteOptions = Omit<CreateAppOptions, "encryptionKey">;

const createChatbotValidator = zValidator(
  "json",
  createChatbotSchema,
  (result, c) => {
    if (!result.success) {
      return c.json(
        {
          code: "VALIDATION_ERROR",
          message: "Invalid chatbot input.",
          issues: result.error.issues,
        },
        400
      );
    }
  }
);

const invalidChatProviderResponse = {
  code: "INVALID_CHAT_PROVIDER",
  message: "Selected chat provider is invalid.",
} as const;

const invalidKnowledgeBaseResponse = {
  code: "INVALID_KNOWLEDGE_BASE",
  message: "Selected knowledge base is invalid.",
} as const;

export const createChatbotsRoute = ({ auth, db }: CreateChatbotsRouteOptions) =>
  new Hono<AppEnv>()
    .use("*", requireAuth(auth))
    .use("*", requireOrganization(auth))
    .get(
      "/",
      requireOrganizationPermission(auth, {
        chatbot: ["read"],
      }),
      async (c) => {
        const organization = c.get("organization");

        const result = await listChatbots({
          db,
          organizationId: organization.id,
        });

        return c.json({
          chatbots: result.chatbots,
        });
      }
    )
    .post(
      "/",
      requireOrganizationPermission(auth, {
        chatbot: ["create"],
      }),
      createChatbotValidator,
      async (c) => {
        const organization = c.get("organization");
        const input = c.req.valid("json");

        const result = await createChatbot({
          db,
          input,
          organizationId: organization.id,
        });

        if (result.status === "invalid_chat_provider") {
          return c.json(invalidChatProviderResponse, 400);
        }

        if (result.status === "invalid_knowledge_base") {
          return c.json(invalidKnowledgeBaseResponse, 400);
        }

        return c.json(
          {
            chatbot: result.chatbot,
          },
          201
        );
      }
    );
