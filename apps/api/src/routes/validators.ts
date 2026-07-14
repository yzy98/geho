import { zValidator } from "@hono/zod-validator";
import type z from "zod";

export const paramValidator = <TSchema extends z.ZodType>({
  schema,
  message,
}: {
  schema: TSchema;
  message: string;
}) =>
  zValidator("param", schema, (result, c) => {
    if (!result.success) {
      return c.json(
        {
          code: "VALIDATION_ERROR",
          message,
          issues: result.error.issues,
        },
        400
      );
    }
  });

export const jsonValidator = <TSchema extends z.ZodType>({
  schema,
  message,
}: {
  schema: TSchema;
  message: string;
}) =>
  zValidator("json", schema, (result, c) => {
    if (!result.success) {
      return c.json(
        {
          code: "VALIDATION_ERROR",
          message,
          issues: result.error.issues,
        },
        400
      );
    }
  });

export const headerValidator = <TSchema extends z.ZodType>({
  schema,
  code,
  message,
}: {
  schema: TSchema;
  code: string;
  message: string;
}) =>
  zValidator("header", schema, (result, c) => {
    if (!result.success) {
      return c.json(
        {
          code,
          message,
        },
        403
      );
    }
  });
