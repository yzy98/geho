import type { AuthServer } from "@heho/auth/server";
import type { DbClient } from "@heho/db";
import { sql } from "@heho/db/helper";
import { organization } from "@heho/db/schema";
import type { Organization } from "../context";
import type { CreateOrganizationInput } from "../schemas/organizations";

export type CurrentOrganization = Organization;

export type CreateInitialOrganizationOptions = {
  auth: AuthServer;
  db: DbClient;
  headers: Headers;
  input: CreateOrganizationInput;
  userId: string;
};

export type CreateInitialOrganizationResult =
  | {
      status: "created";
      organization: CurrentOrganization;
    }
  | {
      status: "user_already_has_organization";
      organization: CurrentOrganization;
    }
  | {
      status: "organization_membership_required";
    };

type DbTransaction = Parameters<Parameters<DbClient["transaction"]>[0]>[0];

const ORGANIZATION_INITIALIZATION_LOCK_KEY = 73_640_001;

export const createInitialOrganization = async ({
  auth,
  db,
  headers,
  input,
  userId,
}: CreateInitialOrganizationOptions): Promise<CreateInitialOrganizationResult> =>
  await db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(${ORGANIZATION_INITIALIZATION_LOCK_KEY})`
    );

    // Use better auth to check if the current user belongs to an organization
    const userOrganizations = await auth.api.listOrganizations({
      headers,
    });

    // One tenant
    const currentOrganization = userOrganizations[0];

    if (currentOrganization) {
      return {
        status: "user_already_has_organization",
        organization: currentOrganization,
      };
    }

    // User belongs to no organization, check if organization exists in the system
    const organizationExists = await hasAnyOrganization(tx);

    if (organizationExists) {
      return {
        status: "organization_membership_required",
      };
    }

    // User belongs no organization, and no organization exists
    // Create one
    const createdOrganization = await auth.api.createOrganization({
      body: {
        name: input.name,
        slug: input.slug,
        logo: input.logo,
        metadata: input.metadata,
        userId,
        keepCurrentActiveOrganization: false,
      },
    });

    const { members: _, ...organization } = createdOrganization;

    return {
      status: "created",
      organization,
    };
  });

export const hasAnyOrganization = async (db: DbClient | DbTransaction) => {
  const rows = await db
    .select({ id: organization.id })
    .from(organization)
    .limit(1);

  return rows.length > 0;
};
