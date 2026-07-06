import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import type { CreateAppOptions } from "../app";
import type { AppEnv } from "../context";
import { requireAuth } from "../middleware/require-auth";
import { requireOrganization } from "../middleware/require-organization";
import { requireOrganizationPermission } from "../middleware/require-organization-permission";
import { createKnowledgeBaseSchema } from "../schemas/knowledge-bases";
import {
  createKnowledgeBase,
  getKnowledgeBase,
  listKnowledgeBases,
} from "../services/knowledge-bases";

type CreateKnowledgeBasesRouteOptions = Omit<CreateAppOptions, "encryptionKey">;

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

const invalidEmbeddingProviderResponse = {
  code: "INVALID_EMBEDDING_PROVIDER",
  message: "Selected embedding provider is invalid.",
} as const;

const knowledgeBaseNotFoundResponse = {
  code: "KNOWLEDGE_BASE_NOT_FOUND",
  message: "Knowledge base was not found.",
} as const;

export const createKnowledgeBasesRoute = ({
  auth,
  db,
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
      async (c) => {
        const organization = c.get("organization");
        const knowledgeBaseId = c.req.param("knowledgeBaseId");

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
    );
