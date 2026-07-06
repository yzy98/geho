import { authSchema, type DbClient } from "@heho/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins/organization";
import { organizationAC, organizationRoles } from "./access-control";

export interface CreateAuthServerOptions {
  baseURL: string;
  db: DbClient;
  secret: string;
  trustedOrigins: string[];
}

export const createAuthServer = ({
  baseURL,
  db,
  secret,
  trustedOrigins,
}: CreateAuthServerOptions) =>
  betterAuth({
    appName: "Heho",
    baseURL,
    basePath: "/auth",
    secret,
    trustedOrigins,
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: authSchema,
    }),
    emailAndPassword: {
      enabled: true,
    },
    plugins: [
      organization({
        ac: organizationAC,
        roles: organizationRoles,
        creatorRole: "owner",
        teams: {
          enabled: false,
        },
        allowUserToCreateOrganization: false,
      }),
    ],
  });

export type AuthServer = ReturnType<typeof createAuthServer>;
