import { queryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { createApiError } from "@/lib/api-error";

const workspaceOverviewClient = apiClient.organizations.overview;

const getWorkspaceOverview = async (signal: AbortSignal) => {
  const response = await workspaceOverviewClient.$get(undefined, {
    init: { signal },
  });

  if (!response.ok) {
    throw await createApiError(response);
  }

  return response.json();
};

export const workspaceOverviewQueryKey = (organizationId: string) =>
  ["workspace-overview", organizationId] as const;

export const workspaceOverviewQueryOptions = (organizationId: string) =>
  queryOptions({
    queryKey: workspaceOverviewQueryKey(organizationId),
    queryFn: ({ signal }) => getWorkspaceOverview(signal),
    staleTime: 30_000,
    refetchInterval: (query) => {
      const sources = query.state.data?.overview.stats.sources;
      const hasActiveIngestion =
        (sources?.pending ?? 0) > 0 || (sources?.processing ?? 0) > 0;
      return hasActiveIngestion ? 20_000 : false;
    },
  });

export type WorkspaceOverview = Awaited<
  ReturnType<typeof getWorkspaceOverview>
>["overview"];
