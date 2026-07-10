import {
  mutationOptions,
  type QueryClient,
  queryOptions,
} from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { createApiError } from "@/lib/api-error";
import { knowledgeBaseDetailsQueryKey } from "./knowledge-base";

const knowledgeSourcesClient =
  apiClient["knowledge-bases"][":knowledgeBaseId"].sources;

export type CreateKnowledgeSourceInput = Parameters<
  typeof knowledgeSourcesClient.$post
>[0]["json"];

const listKnowledgeSources = async (
  knowledgeBaseId: string,
  signal: AbortSignal
) => {
  const response = await knowledgeSourcesClient.$get(
    {
      param: {
        knowledgeBaseId,
      },
    },
    {
      init: {
        signal,
      },
    }
  );

  if (!response.ok) {
    throw await createApiError(response);
  }

  return response.json();
};

const createKnowledgeSource = async (
  knowledgeBaseId: string,
  input: CreateKnowledgeSourceInput
) => {
  const response = await knowledgeSourcesClient.$post({
    param: {
      knowledgeBaseId,
    },
    json: input,
  });

  if (!response.ok) {
    throw await createApiError(response);
  }

  return response.json();
};

export const knowledgeSourcesQueryKey = (
  organizationId: string,
  knowledgeBaseId: string
) =>
  [
    ...knowledgeBaseDetailsQueryKey(organizationId, knowledgeBaseId),
    "sources",
  ] as const;

export const knowledgeSourcesQueryOptions = (
  organizationId: string,
  knowledgeBaseId: string
) =>
  queryOptions({
    queryKey: knowledgeSourcesQueryKey(organizationId, knowledgeBaseId),
    queryFn: ({ signal }) => listKnowledgeSources(knowledgeBaseId, signal),
    refetchInterval: (query) => {
      const sources = query.state.data?.sources ?? [];
      const hasActiveIngestion = sources.some(
        (source) =>
          source.status === "pending" || source.status === "processing"
      );

      return hasActiveIngestion ? 2000 : false;
    },
  });

export const createKnowledgeSourceMutationOptions = (
  queryClient: QueryClient,
  organizationId: string,
  knowledgeBaseId: string
) =>
  mutationOptions({
    mutationFn: (input: CreateKnowledgeSourceInput) =>
      createKnowledgeSource(knowledgeBaseId, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        exact: true,
        queryKey: knowledgeSourcesQueryKey(organizationId, knowledgeBaseId),
      });
    },
  });

export type KnowledgeSource = Awaited<
  ReturnType<typeof listKnowledgeSources>
>["sources"][number];
