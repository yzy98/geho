import {
  mutationOptions,
  type QueryClient,
  queryOptions,
} from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { createApiError } from "@/lib/api-error";

const llmProvidersClient = apiClient["llm-providers"];

export type CreateLlmProviderInput = Parameters<
  typeof llmProvidersClient.$post
>[0]["json"];

const listLlmProviders = async (signal: AbortSignal) => {
  // Manually slow down 3s in dev environment
  // if (import.meta.env.DEV) {
  //   await new Promise((resolve) => setTimeout(resolve, 3000));
  //   throw new Error("Simulated provider loading failure.");
  // }

  const response = await llmProvidersClient.$get(undefined, {
    init: { signal },
  });

  if (!response.ok) {
    throw await createApiError(response);
  }

  return response.json();
};

const createLlmProvider = async (input: CreateLlmProviderInput) => {
  const response = await llmProvidersClient.$post({
    json: input,
  });

  if (!response.ok) {
    throw await createApiError(response);
  }

  return response.json();
};

export const llmProvidersQueryKey = (organizationId: string) =>
  ["llm-providers", organizationId] as const;

export const llmProvidersQueryOptions = (organizationId: string) =>
  queryOptions({
    queryKey: llmProvidersQueryKey(organizationId),
    queryFn: ({ signal }) => listLlmProviders(signal),
  });

export const createLlmProviderMutationOptions = (
  queryClient: QueryClient,
  organizationId: string
) =>
  mutationOptions({
    mutationFn: createLlmProvider,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: llmProvidersQueryKey(organizationId),
      });
    },
  });

export type LlmProvider = Awaited<
  ReturnType<typeof listLlmProviders>
>["providers"][number];
