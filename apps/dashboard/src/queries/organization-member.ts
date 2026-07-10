import {
  mutationOptions,
  type QueryClient,
  queryOptions,
} from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { createApiError } from "@/lib/api-error";

const organizationMembersClient = apiClient.organizations.members;

export type AddOrganizationMemberInput = Parameters<
  typeof organizationMembersClient.$post
>[0]["json"];

const listOrganizationMembers = async (signal: AbortSignal) => {
  const response = await organizationMembersClient.$get(undefined, {
    init: { signal },
  });

  if (!response.ok) {
    throw await createApiError(response);
  }

  return response.json();
};

const addOrganizationMember = async (input: AddOrganizationMemberInput) => {
  const response = await organizationMembersClient.$post({
    json: input,
  });

  if (!response.ok) {
    throw await createApiError(response);
  }

  return response.json();
};

export const organizationMembersQueryKey = (organizationId: string) =>
  ["organization-members", organizationId] as const;

export const organizationMembersQueryOptions = (organizationId: string) =>
  queryOptions({
    queryKey: organizationMembersQueryKey(organizationId),
    queryFn: ({ signal }) => listOrganizationMembers(signal),
  });

export const addOrganizationMemberMutationOptions = (
  queryClient: QueryClient,
  organizationId: string
) =>
  mutationOptions({
    mutationFn: addOrganizationMember,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: organizationMembersQueryKey(organizationId),
      });
    },
  });

export type OrganizationMember = Awaited<
  ReturnType<typeof listOrganizationMembers>
>["members"][number];
