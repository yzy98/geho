import z from "zod";
import { isEmbedKey } from "../lib/embed-key";
import { isSessionToken } from "../lib/session-token";
import { isSerializedWidgetOrigin } from "../lib/widget-origin";

const sessionAuthorizationSchema = z
  .string()
  .refine(
    (value) =>
      value.startsWith("Bearer ") &&
      isSessionToken(value.slice("Bearer ".length)),
    {
      error: "Authorization must contain a valid Session Token",
    }
  )
  .transform((value) => value.slice("Bearer ".length));

export const widgetAccessHeadersSchema = z
  .object({
    origin: z.string().max(2048).refine(isSerializedWidgetOrigin, {
      error: "Origin must be a valid HTTP origin",
    }),
    "x-heho-key": z.string().refine(isEmbedKey, {
      error: "X-Heho-Key must be a valid embed key",
    }),
  })
  .transform((headers) => ({
    origin: headers.origin,
    rawEmbedKey: headers["x-heho-key"],
  }));

export const widgetSessionAuthorizationHeadersSchema = z
  .object({
    authorization: sessionAuthorizationSchema,
  })
  .transform((headers) => ({
    rawSessionToken: headers.authorization,
  }));

export const widgetSessionParamsSchema = z.object({
  sessionId: z.uuid("Session ID must be a valid UUID"),
});

export const createWidgetMessageSchema = z
  .object({
    clientMessageId: z.uuid("Client message ID must be a valid UUID"),
    content: z.string().trim().min(1).max(2000),
  })
  .strict();

export type WidgetAccessHeaders = z.infer<typeof widgetAccessHeadersSchema>;

export type WidgetSessionAuthorizationHeaders = z.infer<
  typeof widgetSessionAuthorizationHeadersSchema
>;

export type WidgetSessionParams = z.infer<typeof widgetSessionParamsSchema>;

export type CreateWidgetMessageInput = z.infer<
  typeof createWidgetMessageSchema
>;
