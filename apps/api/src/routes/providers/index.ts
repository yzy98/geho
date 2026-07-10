import { Hono } from "hono";
import type { RouteDependencies } from "../types";
import { createProviderCollectionRoute } from "./collection";

type CreateProviderRoutesOptions = Pick<
  RouteDependencies,
  "auth" | "db" | "encryptionKey"
>;

export const createProviderRoutes = ({
  auth,
  db,
  encryptionKey,
}: CreateProviderRoutesOptions) =>
  new Hono().route(
    "/",
    createProviderCollectionRoute({ auth, db, encryptionKey })
  );
