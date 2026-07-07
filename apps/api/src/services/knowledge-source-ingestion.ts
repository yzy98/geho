import type { DbClient } from "@heho/db";
import type { GenerateEmbeddings } from "../lib/embedding";
import { processKnowledgeSource } from "./knowledge-sources";

export type StartKnowledgeSourceIngestion = (options: {
  sourceId: string;
  organizationId: string;
}) => void;

export const createInProcessKnowledgeSourceIngestionStarter =
  ({
    db,
    encryptionKey,
    generateEmbeddings,
    onError = console.error,
  }: {
    db: DbClient;
    encryptionKey: Uint8Array;
    generateEmbeddings: GenerateEmbeddings;
    onError?: (error: unknown) => void;
  }): StartKnowledgeSourceIngestion =>
  ({ sourceId, organizationId }) => {
    queueMicrotask(() => {
      processKnowledgeSource({
        db,
        encryptionKey,
        generateEmbeddings,
        sourceId,
        organizationId,
      }).catch(onError);
    });
  };
