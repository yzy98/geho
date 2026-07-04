import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import type { CreateAppOptions } from "../app";
import type { AppEnv } from "../context";
import { requireAuth } from "../middleware/require-auth";
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

const organizationMembershipRequiredResponse = {
  code: "ORGANIZATION_MEMBERSHIP_REQUIRED",
  message: "Current user does not belong to an organization.",
} as const;

const insufficientRoleResponse = {
  code: "INSUFFICIENT_ORGANIZATION_ROLE",
  message: "Only the organization owner can create knowledge bases.",
} as const;

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
    .get("/", async (c) => {
      const user = c.get("user");

      const result = await listKnowledgeBases({
        db,
        userId: user.id,
      });

      if (result.status === "organization_membership_required") {
        return c.json(organizationMembershipRequiredResponse, 403);
      }

      return c.json({
        knowledgeBases: result.knowledgeBases,
      });
    })
    .post("/", createKnowledgeBaseValidator, async (c) => {
      const user = c.get("user");
      const input = c.req.valid("json");

      const result = await createKnowledgeBase({
        db,
        input,
        userId: user.id,
      });

      if (result.status === "organization_membership_required") {
        return c.json(organizationMembershipRequiredResponse, 403);
      }

      if (result.status === "insufficient_role") {
        return c.json(insufficientRoleResponse, 403);
      }

      if (result.status === "invalid_embedding_provider") {
        return c.json(invalidEmbeddingProviderResponse, 400);
      }

      return c.json(
        {
          knowledgeBase: result.knowledgeBase,
        },
        201
      );
    })
    .get("/:knowledgeBaseId", async (c) => {
      const user = c.get("user");
      const knowledgeBaseId = c.req.param("knowledgeBaseId");

      const result = await getKnowledgeBase({
        db,
        knowledgeBaseId,
        userId: user.id,
      });

      if (result.status === "organization_membership_required") {
        return c.json(organizationMembershipRequiredResponse, 403);
      }

      if (result.status === "not_found") {
        return c.json(knowledgeBaseNotFoundResponse, 404);
      }

      return c.json({
        knowledgeBase: result.knowledgeBase,
      });
    });
