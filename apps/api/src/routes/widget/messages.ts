import { Hono } from "hono";
import type { WidgetSessionEnv } from "../../context";
import { invalidWidgetAccessResponse } from "../../middleware/require-widget-access";
import {
  requireWidgetSessionAccess,
  sessionExpiredResponse,
} from "../../middleware/require-widget-session-access";
import { createWidgetMessageSchema } from "../../schemas/widget";
import {
  createWidgetMessage,
  listWidgetMessages,
} from "../../services/widget-messages";
import type { RouteDependencies } from "../types";
import { jsonValidator } from "../validators";

type CreateWidgetMessagesRouteOptions = Pick<
  RouteDependencies,
  "db" | "encryptionKey"
>;

const messageIdConflictResponse = {
  code: "MESSAGE_ID_CONFLICT",
  message: "Client message ID was already used with different content.",
} as const;

const chatGenerationFailedResponse = {
  code: "CHAT_GENERATION_FAILED",
  message: "Chat response generation failed.",
} as const;

const createWidgetMessageValidator = jsonValidator({
  schema: createWidgetMessageSchema,
  message: "Invalid widget message input.",
});

export const createWidgetMessagesRoute = ({
  db,
  encryptionKey,
}: CreateWidgetMessagesRouteOptions) =>
  new Hono<WidgetSessionEnv>()
    .use("*", requireWidgetSessionAccess(db))
    .get("/", async (c) => {
      const session = c.get("widgetSession");

      // Fetch the returned access Session's Messages
      const result = await listWidgetMessages({
        db,
        session,
      });

      return c.json({
        messages: result.messages,
      });
    })
    .post("/", createWidgetMessageValidator, async (c) => {
      const session = c.get("widgetSession");
      const input = c.req.valid("json");

      const result = await createWidgetMessage({
        db,
        encryptionKey,
        session,
        input,
      });

      if (result.status === "invalid_access") {
        return c.json(invalidWidgetAccessResponse, 403);
      }

      if (result.status === "session_expired") {
        return c.json(sessionExpiredResponse, 410);
      }

      if (result.status === "message_id_conflict") {
        return c.json(messageIdConflictResponse, 409);
      }

      if (result.status === "chat_generation_failed") {
        return c.json(chatGenerationFailedResponse, 502);
      }

      return c.json(
        {
          userMessageId: result.userMessageId,
          assistantMessage: result.assistantMessage,
          traceId: result.traceId,
        },
        result.replayed ? 200 : 201
      );
    });
