import { Hono } from "hono";
import { createChatbotRoutes } from "./chatbots";
import { createKnowledgeBaseRoutes } from "./knowledge-bases";
import { createModelProviderRoutes } from "./model-providers";
import { createOrganizationRoutes } from "./organizations";
import type { RouteDependencies } from "./types";

export const createApiRoutes = ({
  auth,
  db,
  encryptionKey,
  startKnowledgeSourceIngestion,
}: RouteDependencies) =>
  new Hono()
    // Auth route
    .on(["POST", "GET"], "/auth/*", (c) => auth.handler(c.req.raw))

    // Protected route
    .route("/organizations", createOrganizationRoutes({ auth, db }))
    .route(
      "/model-providers",
      createModelProviderRoutes({ auth, db, encryptionKey })
    )
    .route(
      "/knowledge-bases",
      createKnowledgeBaseRoutes({
        auth,
        db,
        encryptionKey,
        startKnowledgeSourceIngestion,
      })
    )
    .route("/chatbots", createChatbotRoutes({ auth, db, encryptionKey }));
