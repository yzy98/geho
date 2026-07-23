import { createAnthropic } from "@ai-sdk/anthropic";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { createOpenAI } from "@ai-sdk/openai";
import { findSupportedChatModel } from "@geho/shared";
import type { LanguageModel } from "ai";
import { UnsupportedChatModelError } from "./errors";
import type { AiModelConfig } from "./types";

const assertNever = (provider: never): never => {
  throw new Error(`Unsupported provider: ${provider}`);
};

export const createChatModel = (config: AiModelConfig): LanguageModel => {
  const supported = findSupportedChatModel({
    provider: config.provider,
    id: config.modelId,
  });

  if (!supported) {
    throw new UnsupportedChatModelError(config.modelId);
  }

  const providerOptions = {
    apiKey: config.apiKey,
    ...(config.baseURL ? { baseURL: config.baseURL } : {}),
  };

  switch (supported.provider) {
    case "deepseek":
      return createDeepSeek(providerOptions)(supported.id);
    case "openai":
      return createOpenAI(providerOptions)(supported.id);
    case "anthropic":
      return createAnthropic(providerOptions)(supported.id);
    default:
      return assertNever(supported);
  }
};
