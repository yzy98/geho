import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import type { CreateAppOptions } from "../app";
import type { AppEnv } from "../context";
import { requireAuth } from "../middleware/require-auth";
import { requireOrganization } from "../middleware/require-organization";
import { requireOrganizationPermission } from "../middleware/require-organization-permission";
import {
  createKnowledgeBaseSchema,
  knowledgeBaseParamsSchema,
  retrievalPreviewSchema,
} from "../schemas/knowledge-bases";
import {
  createKnowledgeBase,
  getKnowledgeBase,
  listKnowledgeBases,
} from "../services/knowledge-bases";
import { retrieveKnowledgeChunks } from "../services/knowledge-retrieval";

type CreateKnowledgeBasesRouteOptions = Pick<
  CreateAppOptions,
  "auth" | "db" | "encryptionKey"
>;

const knowledgeBaseParamsValidator = zValidator(
  "param",
  knowledgeBaseParamsSchema,
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

const createKnowledgeBaseValidator = zValidator(
  "json",
  createKnowledgeBaseSchema,
  (result, c) => {
    if (!result.success) {
      return c.json(
        {
          code: "VALIDATION_ERROR",
          message: "Invalid knowledge base input.",
          issues: result.error.issues,
        },
        400
      );
    }
  }
);

const retrievalPreviewValidator = zValidator(
  "json",
  retrievalPreviewSchema,
  (result, c) => {
    if (!result.success) {
      return c.json(
        {
          code: "VALIDATION_ERROR",
          message: "Invalid retrieval preview input.",
          issues: result.error.issues,
        },
        400
      );
    }
  }
);

const invalidEmbeddingProviderResponse = {
  code: "INVALID_EMBEDDING_PROVIDER",
  message: "Selected embedding provider is invalid.",
} as const;

const knowledgeBaseNotFoundResponse = {
  code: "KNOWLEDGE_BASE_NOT_FOUND",
  message: "Knowledge base was not found.",
} as const;

const embeddingProviderFailedResponse = {
  code: "EMBEDDING_PROVIDER_FAILED",
  message: "Embedding provider failed.",
} as const;

export const createKnowledgeBasesRoute = ({
  auth,
  db,
  encryptionKey,
}: CreateKnowledgeBasesRouteOptions) =>
  new Hono<AppEnv>()
    .use("*", requireAuth(auth))
    .use("*", requireOrganization(auth))
    .get(
      "/",
      requireOrganizationPermission(auth, {
        knowledgeBase: ["read"],
      }),
      async (c) => {
        const organization = c.get("organization");

        const result = await listKnowledgeBases({
          db,
          organizationId: organization.id,
        });

        return c.json({
          knowledgeBases: result.knowledgeBases,
        });
      }
    )
    .post(
      "/",
      requireOrganizationPermission(auth, {
        knowledgeBase: ["create"],
      }),
      createKnowledgeBaseValidator,
      async (c) => {
        const organization = c.get("organization");
        const input = c.req.valid("json");

        const result = await createKnowledgeBase({
          db,
          input,
          organizationId: organization.id,
        });

        if (result.status === "invalid_embedding_provider") {
          return c.json(invalidEmbeddingProviderResponse, 400);
        }

        return c.json(
          {
            knowledgeBase: result.knowledgeBase,
          },
          201
        );
      }
    )
    .get(
      "/:knowledgeBaseId",
      requireOrganizationPermission(auth, {
        knowledgeBase: ["read"],
      }),
      knowledgeBaseParamsValidator,
      async (c) => {
        const organization = c.get("organization");
        const { knowledgeBaseId } = c.req.valid("param");

        const result = await getKnowledgeBase({
          db,
          knowledgeBaseId,
          organizationId: organization.id,
        });

        if (result.status === "not_found") {
          return c.json(knowledgeBaseNotFoundResponse, 404);
        }

        return c.json({
          knowledgeBase: result.knowledgeBase,
        });
      }
    )
    .post(
      "/:knowledgeBaseId/retrieval-preview",
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
