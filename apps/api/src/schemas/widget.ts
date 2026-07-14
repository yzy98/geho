import z from "zod";
import { isEmbedKey } from "../lib/embed-key";
import { isSessionToken } from "../lib/session-token";
import { isSerializedWidgetOrigin } from "../lib/widget-origin";

const widgetAccessHeaderFields = {
  origin: z.string().max(2048).refine(isSerializedWidgetOrigin, {
    error: "Origin must be a valid HTTP origin",
  }),
  "x-heho-key": z.string().refine(isEmbedKey, {
    error: "X-Heho-Key must be a valid embed key",
  }),
};

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
  .object(widgetAccessHeaderFields)
  .transform((headers) => ({
    origin: headers.origin,
    rawEmbedKey: headers["x-heho-key"],
  }));

export const widgetSessionAccessHeadersSchema = z
  .object({
    ...widgetAccessHeaderFields,
    authorization: sessionAuthorizationSchema,
  })
  .transform((headers) => ({
    origin: headers.origin,
    rawEmbedKey: headers["x-heho-key"],
    rawSessionToken: headers.authorization,
  }));

export const widgetSessionParamsSchema = z.object({
  sessionId: z.uuid("Session ID must be a valid UUID"),
});

export type WidgetAccessHeaders = z.infer<typeof widgetAccessHeadersSchema>;

export type WidgetSessionAccessHeaders = z.infer<
  typeof widgetSessionAccessHeadersSchema
>;

export type WidgetSessionParams = z.infer<typeof widgetSessionParamsSchema>;
