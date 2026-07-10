import {
  mutationOptions,
  type QueryClient,
  queryOptions,
} from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { createApiError } from "@/lib/api-error";

const knowledgeBasesClient = apiClient["knowledge-bases"];

export type CreateKnowledgeBaseInput = Parameters<
  typeof knowledgeBasesClient.$post
>[0]["json"];

const listKnowledgeBases = async (signal: AbortSignal) => {
  const response = await knowledgeBasesClient.$get(undefined, {
    init: { signal },
  });

  if (!response.ok) {
    throw await createApiError(response);
  }

  return response.json();
};

const getKnowledgeBaseDetails = async (
  knowledgeBaseId: string,
  signal: AbortSignal
) => {
  const response = await knowledgeBasesClient[":knowledgeBaseId"].$get(
    {
      param: {
        knowledgeBaseId,
      },
    },
    {
      init: { signal },
    }
  );

  if (!response.ok) {
    throw await createApiError(response);
  }

  return response.json();
};

const createKnowledgeBase = async (input: CreateKnowledgeBaseInput) => {
  const response = await knowledgeBasesClient.$post({
    json: input,
  });

  if (!response.ok) {
    throw await createApiError(response);
  }

  return response.json();
};

export const knowledgeBasesQueryKey = (organizationId: string) =>
  ["knowledge-bases", organizationId] as const;

export const knowledgeBasesQueryOptions = (organizationId: string) =>
  queryOptions({
    queryKey: knowledgeBasesQueryKey(organizationId),
    queryFn: ({ signal }) => listKnowledgeBases(signal),
  });

export const knowledgeBaseDetailsQueryKey = (
  organizationId: string,
  knowledgeBaseId: string
) => [...knowledgeBasesQueryKey(organizationId), knowledgeBaseId] as const;

export const knowledgeBaseDetailsQueryOptions = (
  organizationId: string,
  knowledgeBaseId: string
) =>
  queryOptions({
    queryKey: knowledgeBaseDetailsQueryKey(organizationId, knowledgeBaseId),
    queryFn: ({ signal }) => getKnowledgeBaseDetails(knowledgeBaseId, signal),
  });

export const createKnowledgeBaseMutationOptions = (
  queryClient: QueryClient,
  organizationId: string
) =>
  mutationOptions({
    mutationFn: createKnowledgeBase,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: knowledgeBasesQueryKey(organizationId),
      });
    },
  });

export type KnowledgeBase = Awaited<
  ReturnType<typeof listKnowledgeBases>
>["knowledgeBases"][number];
export type KnowledgeBaseDetails = Awaited<
  ReturnType<typeof getKnowledgeBaseDetails>
>["knowledgeBase"];
