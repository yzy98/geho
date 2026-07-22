import type { AuthServer } from "@geho/auth/server";
import type { DbClient } from "@geho/db";
import { and, eq } from "@geho/db/helper";
import { member, user } from "@geho/db/schema";
import type { AddOrganizationMemberInput } from "../schemas/organization-members";

export type Member = Awaited<ReturnType<AuthServer["api"]["addMember"]>>;

export type AddOrganizationMemberOptions = {
  auth: AuthServer;
  db: DbClient;
  input: AddOrganizationMemberInput;
  organizationId: string;
};

export type AddOrganizationMemberResult =
  | {
      status: "added";
      member: Member;
    }
  | {
      status: "user_not_found";
    }
  | {
      status: "already_a_member";
    };

export const addOrganizationMember = async ({
  auth,
  db,
  input,
  organizationId,
}: AddOrganizationMemberOptions): Promise<AddOrganizationMemberResult> => {
  // Find the matched user
  const matchedUsers = await db
    .select()
    .from(user)
    .where(eq(user.email, input.email))
    .limit(1);

  const matchedUser = matchedUsers[0];

  if (!matchedUser) {
    return {
      status: "user_not_found",
    };
  }

  // Find the matched member
  const existingMembers = await db
    .select()
    .from(member)
    .where(
      and(
        eq(member.organizationId, organizationId),
        eq(member.userId, matchedUser.id)
      )
    )
    .limit(1);

  const existingMember = existingMembers[0];

  if (existingMember) {
    return {
      status: "already_a_member",
    };
  }

  const addedMember = await auth.api.addMember({
    body: {
      userId: matchedUser.id,
      role: "member",
      organizationId,
    },
  });

  return {
    status: "added",
    member: addedMember,
  };
};
