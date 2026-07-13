import z from "zod";
import { isEmbedKey } from "../lib/embed-key";
import { isSerializedWidgetOrigin } from "../lib/widget-origin";

export const widgetAccessHeadersSchema = z
  .object({
    origin: z.string().max(2048).refine(isSerializedWidgetOrigin, {
      message: "Origin must be a valid HTTP origin",
    }),

    "x-heho-key": z.string().refine(isEmbedKey, {
      message: "X-Heho-Key must be a valid embed key",
    }),
  })
  .transform((headers) => ({
    origin: headers.origin,
    rawEmbedKey: headers["x-heho-key"],
  }));

export type WidgetAccessHeaders = z.infer<typeof widgetAccessHeadersSchema>;
