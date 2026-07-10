import {
  mutationOptions,
  type QueryClient,
  queryOptions,
} from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { createApiError } from "@/lib/api-error";

const modelProvidersClient = apiClient["model-providers"];

export type CreateModelProviderInput = Parameters<
  typeof modelProvidersClient.$post
>[0]["json"];

const listModelProviders = async (signal: AbortSignal) => {
  const response = await modelProvidersClient.$get(undefined, {
    init: { signal },
  });

  if (!response.ok) {
    throw await createApiError(response);
  }

  return response.json();
};

const createModelProvider = async (input: CreateModelProviderInput) => {
  const response = await modelProvidersClient.$post({
    json: input,
  });

  if (!response.ok) {
    throw await createApiError(response);
  }

  return response.json();
};

export const modelProvidersQueryKey = (organizationId: string) =>
  ["model-providers", organizationId] as const;

export const modelProvidersQueryOptions = (organizationId: string) =>
  queryOptions({
    queryKey: modelProvidersQueryKey(organizationId),
    queryFn: ({ signal }) => listModelProviders(signal),
  });

export const createModelProviderMutationOptions = (
  queryClient: QueryClient,
  organizationId: string
) =>
  mutationOptions({
    mutationFn: createModelProvider,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: modelProvidersQueryKey(organizationId),
      });
    },
  });

export type ModelProvider = Awaited<
  ReturnType<typeof listModelProviders>
>["modelProviders"][number];
