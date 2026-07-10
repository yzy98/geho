import { Hono } from "hono";
import type { RouteDependencies } from "../types";
import { createChatbotAskPreviewRoute } from "./ask-preview";
import { createChatbotCollectionRoute } from "./collection";
import { createChatbotEmbedKeysRoute } from "./embed-keys";

type CreateChatbotRoutesOptions = Pick<
  RouteDependencies,
  "auth" | "db" | "encryptionKey"
>;

export const createChatbotRoutes = ({
  auth,
  db,
  encryptionKey,
}: CreateChatbotRoutesOptions) =>
  new Hono()
    .route("/", createChatbotCollectionRoute({ auth, db }))
    .route("/:chatbotId/embed-keys", createChatbotEmbedKeysRoute({ auth, db }))
    .route(
      "/:chatbotId/ask-preview",
      createChatbotAskPreviewRoute({ auth, db, encryptionKey })
    );
