import { mutationOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { createApiError } from "@/lib/api-error";

const chatbotAskPreviewClient = apiClient.chatbots[":chatbotId"]["ask-preview"];

export type AskChatbotPreviewInput = Parameters<
  typeof chatbotAskPreviewClient.$post
>[0]["json"];

const askChatbotPreview = async (
  chatbotId: string,
  input: AskChatbotPreviewInput
) => {
  const response = await chatbotAskPreviewClient.$post({
    param: {
      chatbotId,
    },
    json: input,
  });

  if (!response.ok) {
    throw await createApiError(response);
  }

  return response.json();
};

export const askChatbotPreviewMutationOptions = (chatbotId: string) =>
  mutationOptions({
    mutationFn: (input: AskChatbotPreviewInput) =>
      askChatbotPreview(chatbotId, input),
  });

export type AskChatbotPreviewResult = Awaited<
  ReturnType<typeof askChatbotPreview>
>;

export type AskChatbotPreviewCitation =
  AskChatbotPreviewResult["citations"][number];
