import { randomUUID } from "node:crypto";
import { encryptApiKey } from "@geho/crypto";
import type { DbClient } from "@geho/db";
import { desc, eq } from "@geho/db/helper";
import { modelProvider } from "@geho/db/schema";
import type { CreateModelProviderInput } from "../schemas/model-providers";

export type ModelProviderDto = Omit<
  typeof modelProvider.$inferSelect,
  "organizationId" | "encryptedApiKey"
>;

export type CreateModelProviderOptions = {
  db: DbClient;
  encryptionKey: Uint8Array;
  input: CreateModelProviderInput;
  organizationId: string;
};

export type ListModelProviderOptions = {
  db: DbClient;
  organizationId: string;
};

export type CreateModelProviderResult = {
  status: "created";
  modelProvider: ModelProviderDto;
};

export type ListModelProviderResult = {
  status: "success";
  modelProviders: ModelProviderDto[];
};

const providerSelection = {
  id: modelProvider.id,
  name: modelProvider.name,
  provider: modelProvider.provider,
  capability: modelProvider.capability,
  baseUrl: modelProvider.baseUrl,
  modelId: modelProvider.modelId,
  createdAt: modelProvider.createdAt,
  updatedAt: modelProvider.updatedAt,
};

export const createModelProvider = async ({
  db,
  encryptionKey,
  input,
  organizationId,
}: CreateModelProviderOptions): Promise<CreateModelProviderResult> => {
  // Encrypt the input model provider api key
  const encryptedApiKey = await encryptApiKey({
    apiKey: input.apiKey,
    encryptionKey,
  });

  const now = new Date();

  const rows = await db
    .insert(modelProvider)
    .values({
      id: randomUUID(),
      organizationId,
      name: input.name,
      provider: input.provider,
      capability: input.capability,
      baseUrl: input.baseUrl ?? null,
      encryptedApiKey,
      modelId: input.modelId,
      createdAt: now,
      updatedAt: now,
    })
    .returning(providerSelection);

  const provider = rows[0];

  if (!provider) {
    throw new Error("Model provider insert returned no record");
  }

  return {
    status: "created",
    modelProvider: provider,
  };
};

export const listModelProviders = async ({
  db,
  organizationId,
}: ListModelProviderOptions): Promise<ListModelProviderResult> => {
  const modelProviders = await db
    .select(providerSelection)
    .from(modelProvider)
    .where(eq(modelProvider.organizationId, organizationId))
    .orderBy(desc(modelProvider.createdAt), desc(modelProvider.id));

  return {
    status: "success",
    modelProviders,
  };
};
