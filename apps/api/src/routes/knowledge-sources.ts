import type { AuthServer } from "@heho/auth/server";
import type { DbClient } from "@heho/db";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import type { AppEnv } from "../context";
import { requireAuth } from "../middleware/require-auth";
import { requireOrganization } from "../middleware/require-organization";
import { requireOrganizationPermission } from "../middleware/require-organization-permission";
import {
  createTextKnowledgeSourceSchema,
  knowledgeSourcesParamsSchema,
} from "../schemas/knowledge-sources";
import type { StartKnowledgeSourceIngestion } from "../services/knowledge-source-ingestion";
import {
  createKnowledgeSource,
  listKnowledgeSources,
} from "../services/knowledge-sources";

type CreateKnowledgeSourcesRouteOptions = {
  auth: AuthServer;
  db: DbClient;
  startKnowledgeSourceIngestion: StartKnowledgeSourceIngestion;
};

const knowledgeSourcesParamsValidator = zValidator(
  "param",
  knowledgeSourcesParamsSchema,
  (result, c) => {
    if (!result.success) {
      return c.json(
        {
          code: "VALIDATION_ERROR",
          message: "Invalid knowledge base ID.",
          issues: result.error.issues,
        },
        400
      );
    }
  }
);

const createKnowledgeSourceValidator = zValidator(
  "json",
  createTextKnowledgeSourceSchema,
  (result, c) => {
    if (!result.success) {
      return c.json(
        {
          code: "VALIDATION_ERROR",
          message: "Invalid knowledge source input.",
          issues: result.error.issues,
        },
        400
      );
    }
  }
);

const knowledgeBaseNotFoundResponse = {
  code: "KNOWLEDGE_BASE_NOT_FOUND",
  message: "Knowledge base was not found.",
} as const;

export const createKnowledgeSourcesRoute = ({
  auth,
  db,
  startKnowledgeSourceIngestion,
}: CreateKnowledgeSourcesRouteOptions) =>
  new Hono<AppEnv>()
    .use("*", requireAuth(auth))
    .use("*", requireOrganization(auth))
    .get(
      "/",
      requireOrganizationPermission(auth, {
        knowledgeSource: ["read"],
      }),
      knowledgeSourcesParamsValidator,
      async (c) => {
        const organization = c.get("organization");
        const { knowledgeBaseId } = c.req.valid("param");

        const result = await listKnowledgeSources({
          db,
          knowledgeBaseId,
          organizationId: organization.id,
        });

        if (result.status === "knowledge_base_not_found") {
          return c.json(knowledgeBaseNotFoundResponse, 404);
        }

        return c.json({
          sources: result.sources,
        });
      }
    )
    .post(
      "/",
      requireOrganizationPermission(auth, {
        knowledgeSource: ["create"],
      }),
      knowledgeSourcesParamsValidator,
      createKnowledgeSourceValidator,
      async (c) => {
        const organization = c.get("organization");
        const { knowledgeBaseId } = c.req.valid("param");
        const input = c.req.valid("json");

        const result = await createKnowledgeSource({
          db,
          input,
          knowledgeBaseId,
          organizationId: organization.id,
        });

        if (result.status === "knowledge_base_not_found") {
          return c.json(knowledgeBaseNotFoundResponse, 404);
        }

        startKnowledgeSourceIngestion({
          sourceId: result.source.id,
          organizationId: organization.id,
        });

        return c.json(
          {
            source: result.source,
          },
          201
        );
      }
    );
