import { Hono } from "hono";
import type { AppEnv } from "../../context";
import { requireAuth } from "../../middleware/require-auth";
import { requireOrganization } from "../../middleware/require-organization";
import { requireOrganizationPermission } from "../../middleware/require-organization-permission";
import {
  askChatbotPreviewSchema,
  chatbotPreviewParamsSchema,
} from "../../schemas/ask-preview";
import { askChatbotPreview } from "../../services/chatbot-ask-preview";
import type { RouteDependencies } from "../types";
import { jsonValidator, paramValidator } from "../validators";

type CreateChatbotAskPreviewRouteOptions = Pick<
  RouteDependencies,
  "auth" | "db" | "encryptionKey"
>;

const chatbotPreviewParamsValidator = paramValidator({
  schema: chatbotPreviewParamsSchema,
  message: "Invalid chatbot ID.",
});

const askChatbotPreviewValidator = jsonValidator({
  schema: askChatbotPreviewSchema,
  message: "Invalid ask preview input.",
});

const chatbotNotFoundResponse = {
  code: "CHATBOT_NOT_FOUND",
  message: "Chatbot was not found.",
} as const;

const retrievalFailedResponse = {
  code: "RETRIEVAL_FAILED",
  message: "Retrieval failed.",
} as const;

const chatProviderFailedResponse = {
  code: "CHAT_PROVIDER_FAILED",
  message: "Chat provider failed.",
} as const;

export const createChatbotAskPreviewRoute = ({
  auth,
  db,
  encryptionKey,
}: CreateChatbotAskPreviewRouteOptions) =>
  new Hono<AppEnv>()
    .use("*", requireAuth(auth))
    .use("*", requireOrganization(auth))
    .post(
      "/",
      requireOrganizationPermission(auth, {
        chatbot: ["read"],
      }),
      chatbotPreviewParamsValidator,
      askChatbotPreviewValidator,
      async (c) => {
        const organization = c.get("organization");
        const { chatbotId } = c.req.valid("param");
        const input = c.req.valid("json");

        const result = await askChatbotPreview({
          db,
          chatbotId,
          encryptionKey,
          input,
          organizationId: organization.id,
        });

        if (result.status === "chatbot_not_found") {
          return c.json(chatbotNotFoundResponse, 404);
        }

        if (result.status === "retrieval_failed") {
          return c.json(retrievalFailedResponse, 502);
        }

        if (result.status === "chat_provider_failed") {
          return c.json(chatProviderFailedResponse, 502);
        }

        return c.json({
          answer: result.answer,
          citations: result.citations,
          traceId: result.traceId,
        });
      }
    );
