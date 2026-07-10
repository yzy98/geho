import { Hono } from "hono";
import type { RouteDependencies } from "../types";
import { createModelProviderCollectionRoute } from "./collection";

type CreateModelProviderRoutesOptions = Pick<
  RouteDependencies,
  "auth" | "db" | "encryptionKey"
>;

export const createModelProviderRoutes = ({
  auth,
  db,
  encryptionKey,
}: CreateModelProviderRoutesOptions) =>
  new Hono().route(
    "/",
    createModelProviderCollectionRoute({ auth, db, encryptionKey })
  );
