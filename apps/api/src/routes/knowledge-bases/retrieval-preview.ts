import { Hono } from "hono";
import type { AppEnv } from "../../context";
import { requireAuth } from "../../middleware/require-auth";
import { requireOrganization } from "../../middleware/require-organization";
import { requireOrganizationPermission } from "../../middleware/require-organization-permission";
import {
  knowledgeBaseParamsSchema,
  retrievalPreviewSchema,
} from "../../schemas/knowledge-bases";
import { retrieveKnowledgeChunks } from "../../services/knowledge-retrieval";
import type { RouteDependencies } from "../types";
import { jsonValidator, paramValidator } from "../validators";

type CreateRetrievalPreviewRouteOptions = Pick<
  RouteDependencies,
  "auth" | "db" | "encryptionKey"
>;

const knowledgeBaseParamsValidator = paramValidator({
  schema: knowledgeBaseParamsSchema,
  message: "Invalid knowledge base ID.",
});

const retrievalPreviewValidator = jsonValidator({
  schema: retrievalPreviewSchema,
  message: "Invalid retrieval preview input.",
});

const knowledgeBaseNotFoundResponse = {
  code: "KNOWLEDGE_BASE_NOT_FOUND",
  message: "Knowledge base was not found.",
} as const;

const embeddingProviderFailedResponse = {
  code: "EMBEDDING_PROVIDER_FAILED",
  message: "Embedding provider failed.",
} as const;

export const createRetrievalPreviewRoute = ({
  auth,
  db,
  encryptionKey,
}: CreateRetrievalPreviewRouteOptions) =>
  new Hono<AppEnv>()
    .use("*", requireAuth(auth))
    .use("*", requireOrganization(auth))
    .post(
      "/",
      requireOrganizationPermission(auth, {
        knowledgeBase: ["read"],
      }),
      knowledgeBaseParamsValidator,
      retrievalPreviewValidator,
      async (c) => {
        const organization = c.get("organization");
        const { knowledgeBaseId } = c.req.valid("param");
        const input = c.req.valid("json");

        const result = await retrieveKnowledgeChunks({
          db,
          encryptionKey,
          input,
          knowledgeBaseId,
          organizationId: organization.id,
        });

        if (result.status === "knowledge_base_not_found") {
          return c.json(knowledgeBaseNotFoundResponse, 404);
        }

        if (result.status === "embedding_provider_failed") {
          return c.json(embeddingProviderFailedResponse, 502);
        }

        return c.json({
          chunks: result.chunks,
        });
      }
    );
