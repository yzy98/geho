import { Hono } from "hono";
import type { RouteDependencies } from "../types";
import { createOrganizationCollectionRoute } from "./collection";
import { createOrganizationMembersRoute } from "./members";

type CreateOrganizationRoutesOptions = Pick<RouteDependencies, "auth" | "db">;

export const createOrganizationRoutes = ({
  auth,
  db,
}: CreateOrganizationRoutesOptions) =>
  new Hono()
    .route("/", createOrganizationCollectionRoute({ auth, db }))
    .route("/members", createOrganizationMembersRoute({ auth, db }));
