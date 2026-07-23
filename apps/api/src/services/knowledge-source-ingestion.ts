import type { CreateEmbeddingModel } from "@geho/ai";
import type { DbClient } from "@geho/db";
import { processKnowledgeSource } from "./knowledge-source-processing";

export type StartKnowledgeSourceIngestion = (options: {
  sourceId: string;
  organizationId: string;
}) => void;

export const createInProcessKnowledgeSourceIngestionStarter =
  ({
    db,
    encryptionKey,
    createEmbeddingModel,
    onError = console.error,
  }: {
    db: DbClient;
    encryptionKey: Uint8Array;
    createEmbeddingModel: CreateEmbeddingModel;
    onError?: (error: unknown) => void;
  }): StartKnowledgeSourceIngestion =>
  ({ sourceId, organizationId }) => {
    queueMicrotask(() => {
      processKnowledgeSource({
        db,
        encryptionKey,
        createEmbeddingModel,
        sourceId,
        organizationId,
      }).catch(onError);
    });
  };
