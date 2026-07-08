import { mutationOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { createApiError } from "@/lib/api-error";

const retrievalPreviewClient =
  apiClient["knowledge-bases"][":knowledgeBaseId"]["retrieval-preview"];

export type RetrievalPreviewInput = Parameters<
  typeof retrievalPreviewClient.$post
>[0]["json"];

const previewKnowledgeRetrieval = async (
  knowledgeBaseId: string,
  input: RetrievalPreviewInput
) => {
  const response = await retrievalPreviewClient.$post({
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

export const retrievalPreviewMutationOptions = (knowledgeBaseId: string) =>
  mutationOptions({
    mutationFn: (input: RetrievalPreviewInput) =>
      previewKnowledgeRetrieval(knowledgeBaseId, input),
  });

export type RetrievalPreviewChunk = Awaited<
  ReturnType<typeof previewKnowledgeRetrieval>
>["chunks"][number];
