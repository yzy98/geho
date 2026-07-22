import { createAnthropic } from "@ai-sdk/anthropic";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { createOpenAI } from "@ai-sdk/openai";
import {
  findSupportedChatModel,
  type SupportedChatModel,
  type SupportedChatModelIdFor,
  type SupportedChatModelProvider,
} from "@geho/shared";
import type { LanguageModel } from "ai";

type ResolvedChatModelFor<TProvider extends SupportedChatModelProvider> = {
  model: LanguageModel;
  modelId: SupportedChatModelIdFor<TProvider>;
  provider: TProvider;
};

export type ResolvedChatModel = {
  [TProvider in SupportedChatModelProvider]: ResolvedChatModelFor<TProvider>;
}[SupportedChatModelProvider];

const assertUnsupportedProvider = (provider: never): never => {
  throw new Error(`Unsupported provider: ${provider}`);
};

const resolveDeepSeekChatModel = ({
  apiKey,
  baseUrl,
  modelId,
}: {
  apiKey: string;
  baseUrl: string | null | undefined;
  modelId: SupportedChatModelIdFor<"deepseek">;
}): ResolvedChatModelFor<"deepseek"> => {
  const deepseek = createDeepSeek({
    apiKey,
    ...(baseUrl ? { baseURL: baseUrl } : {}),
  });

  return {
    model: deepseek(modelId),
    provider: "deepseek",
    modelId,
  };
};

const resolveOpenAIChatModel = ({
  apiKey,
  baseUrl,
  modelId,
}: {
  apiKey: string;
  baseUrl: string | null | undefined;
  modelId: SupportedChatModelIdFor<"openai">;
}): ResolvedChatModelFor<"openai"> => {
  const openai = createOpenAI({
    apiKey,
    ...(baseUrl ? { baseURL: baseUrl } : {}),
  });

  return {
    model: openai(modelId),
    provider: "openai",
    modelId,
  };
};

const resolveAnthropicChatModel = ({
  apiKey,
  baseUrl,
  modelId,
}: {
  apiKey: string;
  baseUrl: string | null | undefined;
  modelId: SupportedChatModelIdFor<"anthropic">;
}): ResolvedChatModelFor<"anthropic"> => {
  const anthropic = createAnthropic({
    apiKey,
    ...(baseUrl ? { baseURL: baseUrl } : {}),
  });

  return {
    model: anthropic(modelId),
    provider: "anthropic",
    modelId,
  };
};

const resolveSupportedChatModel = ({
  apiKey,
  baseUrl,
  model,
}: {
  apiKey: string;
  baseUrl: string | null | undefined;
  model: SupportedChatModel;
}): ResolvedChatModel => {
  const { id, provider } = model;
  switch (provider) {
    case "deepseek":
      return resolveDeepSeekChatModel({
        apiKey,
        baseUrl,
        modelId: id,
      });
    case "openai":
      return resolveOpenAIChatModel({
        apiKey,
        baseUrl,
        modelId: id,
      });
    case "anthropic":
      return resolveAnthropicChatModel({
        apiKey,
        baseUrl,
        modelId: id,
      });
    default:
      return assertUnsupportedProvider(provider);
  }
};

export const resolveChatModel = ({
  apiKey,
  baseUrl,
  modelId,
  provider,
}: {
  apiKey: string;
  baseUrl?: string | null;
  modelId: string;
  provider: string;
}): ResolvedChatModel => {
  const model = findSupportedChatModel({
    id: modelId,
    provider,
  });
  if (!model) {
    throw new Error(`Unsupported chat model: ${modelId}`);
  }

  return resolveSupportedChatModel({
    apiKey,
    baseUrl,
    model,
  });
};
