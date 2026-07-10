import { randomUUID } from "node:crypto";
import type { DbClient } from "@heho/db";
import { desc, eq } from "@heho/db/helper";
import { llmProvider } from "@heho/db/schema";
import { encryptApiKey } from "../lib/api-key-encryption";
import type { CreateLlmProviderInput } from "../schemas/llm-providers";

export type LlmProviderDto = Omit<
  typeof llmProvider.$inferSelect,
  "organizationId" | "encryptedApiKey"
>;

export type CreateLlmProviderOptions = {
  db: DbClient;
  encryptionKey: Uint8Array;
  input: CreateLlmProviderInput;
  organizationId: string;
};

export type ListLlmProviderOptions = {
  db: DbClient;
  organizationId: string;
};

export type CreateLlmProviderResult = {
  status: "created";
  provider: LlmProviderDto;
};

export type ListLlmProviderResult = {
  status: "success";
  providers: LlmProviderDto[];
};

const providerSelection = {
  id: llmProvider.id,
  name: llmProvider.name,
  provider: llmProvider.provider,
  capability: llmProvider.capability,
  baseUrl: llmProvider.baseUrl,
  model: llmProvider.model,
  createdAt: llmProvider.createdAt,
  updatedAt: llmProvider.updatedAt,
};

export const createLlmProvider = async ({
  db,
  encryptionKey,
  input,
  organizationId,
}: CreateLlmProviderOptions): Promise<CreateLlmProviderResult> => {
  // Encrypt the input llm api key
  const encryptedApiKey = await encryptApiKey({
    apiKey: input.apiKey,
    encryptionKey,
  });

  const now = new Date();

  const rows = await db
    .insert(llmProvider)
    .values({
      id: randomUUID(),
      organizationId,
      name: input.name,
      provider: input.provider,
      capability: input.capability,
      baseUrl: input.baseUrl ?? null,
      encryptedApiKey,
      model: input.model,
      createdAt: now,
      updatedAt: now,
    })
    .returning(providerSelection);

  const provider = rows[0];

  if (!provider) {
    throw new Error("LLM provider insert returned no record");
  }

  return {
    status: "created",
    provider,
  };
};

export const listLlmProviders = async ({
  db,
  organizationId,
}: ListLlmProviderOptions): Promise<ListLlmProviderResult> => {
  const providers = await db
    .select(providerSelection)
    .from(llmProvider)
    .where(eq(llmProvider.organizationId, organizationId))
    .orderBy(desc(llmProvider.createdAt));

  return {
    status: "success",
    providers,
  };
};
