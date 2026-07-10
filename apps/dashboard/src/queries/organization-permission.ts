import type { OrganizationPermissionRequest } from "@heho/auth/access-control";
import { queryOptions } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";

const permissionRequests = {
  createLlmProvider: {
    llmProvider: ["create"],
  },
  createKnowledgeBase: {
    knowledgeBase: ["create"],
  },
  createKnowledgeSource: {
    knowledgeSource: ["create"],
  },
  createChatbot: {
    chatbot: ["create"],
  },
  createEmbedKey: {
    embedKey: ["create"],
  },
  addOrganizationMember: {
    member: ["create"],
  },
} satisfies Record<string, OrganizationPermissionRequest>;

export type OrganizationPermission = keyof typeof permissionRequests;

export const organizationPermissionQueryKey = (
  organizationId: string,
  permission: OrganizationPermission
) => ["organization-permission", organizationId, permission] as const;

export const organizationPermissionQueryOptions = (
  organizationId: string,
  permission: OrganizationPermission
) =>
  queryOptions({
    queryKey: organizationPermissionQueryKey(organizationId, permission),
    queryFn: async () => {
      const { data, error } = await authClient.organization.hasPermission({
        organizationId,
        permissions: permissionRequests[permission],
      });

      if (error) {
        throw new Error(
          error.message ?? "Unable to check organization permission."
        );
      }

      return data.success;
    },
    staleTime: 30_000,
  });
