import { Hono } from "hono";
import type { RouteDependencies } from "../types";
import { createKnowledgeBaseCollectionRoute } from "./collection";
import { createRetrievalPreviewRoute } from "./retrieval-preview";
import { createKnowledgeSourcesRoute } from "./sources";

type CreateKnowledgeBaseRoutesOptions = Pick<
  RouteDependencies,
  "auth" | "db" | "encryptionKey"
>;

export const createKnowledgeBaseRoutes = ({
  auth,
  db,
  encryptionKey,
}: CreateKnowledgeBaseRoutesOptions) =>
  new Hono()
    .route("/", createKnowledgeBaseCollectionRoute({ auth, db }))
    .route(
      "/:knowledgeBaseId/sources",
      createKnowledgeSourcesRoute({ auth, db })
    )
    .route(
      "/:knowledgeBaseId/retrieval-preview",
      createRetrievalPreviewRoute({ auth, db, encryptionKey })
    );
