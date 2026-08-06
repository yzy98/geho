import { Hono } from "hono";
import type { AppEnv } from "../../context";
import { requireAuth } from "../../middleware/require-auth";
import { requireOrganization } from "../../middleware/require-organization";
import { requireOrganizationPermission } from "../../middleware/require-organization-permission";
import {
  createTextKnowledgeSourceSchema,
  knowledgeSourcesParamsSchema,
} from "../../schemas/knowledge-sources";
import {
  createKnowledgeSourceAndRequestIngestion,
  listKnowledgeSources,
} from "../../services/knowledge-sources";
import type { RouteDependencies } from "../types";
import { jsonValidator, paramValidator } from "../validators";

type CreateKnowledgeSourcesRouteOptions = Pick<
  RouteDependencies,
  "auth" | "db"
>;

const knowledgeSourcesParamsValidator = paramValidator({
  schema: knowledgeSourcesParamsSchema,
  message: "Invalid knowledge base ID.",
});

const createKnowledgeSourceValidator = jsonValidator({
  schema: createTextKnowledgeSourceSchema,
  message: "Invalid knowledge source input.",
});

const knowledgeBaseNotFoundResponse = {
  code: "KNOWLEDGE_BASE_NOT_FOUND",
  message: "Knowledge base was not found.",
} as const;

export const createKnowledgeSourcesRoute = ({
  auth,
  db,
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

        const result = await createKnowledgeSourceAndRequestIngestion({
          db,
          input,
          knowledgeBaseId,
          organizationId: organization.id,
        });

        if (result.status === "knowledge_base_not_found") {
          return c.json(knowledgeBaseNotFoundResponse, 404);
        }

        return c.json(
          {
            source: result.source,
          },
          201
        );
      }
    );
