import { Hono } from "hono";
import type { RouteDependencies } from "../types";
import { createKnowledgeBaseCollectionRoute } from "./collection";
import { createRetrievalPreviewRoute } from "./retrieval-preview";
import { createKnowledgeSourcesRoute } from "./sources";

type CreateKnowledgeBaseRoutesOptions = Pick<
  RouteDependencies,
  "auth" | "db" | "encryptionKey" | "startKnowledgeSourceIngestion"
>;

export const createKnowledgeBaseRoutes = ({
  auth,
  db,
  encryptionKey,
  startKnowledgeSourceIngestion,
}: CreateKnowledgeBaseRoutesOptions) =>
  new Hono()
    .route("/", createKnowledgeBaseCollectionRoute({ auth, db }))
    .route(
      "/:knowledgeBaseId/sources",
      createKnowledgeSourcesRoute({ auth, db, startKnowledgeSourceIngestion })
    )
    .route(
      "/:knowledgeBaseId/retrieval-preview",
      createRetrievalPreviewRoute({ auth, db, encryptionKey })
    );
