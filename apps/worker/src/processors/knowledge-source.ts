import { randomUUID } from "node:crypto";
import { type CreateEmbeddingModel, EMBEDDING_DIMENSIONS } from "@geho/ai";
import { decryptApiKey } from "@geho/crypto";
import type { DbClient } from "@geho/db";
import { and, eq, isNull, ne, or } from "@geho/db/helper";
import {
  knowledgeBase,
  knowledgeChunk,
  knowledgeSource,
  modelProvider,
} from "@geho/db/schema";
import { type Chunk, getChunks } from "@geho/rag";

const SOURCE_ERROR = {
  EMPTY_CONTENT: "EMPTY_CONTENT",
  EMBEDDING_PROVIDER_FAILED: "EMBEDDING_PROVIDER_FAILED",
  INVALID_EMBEDDING_BATCH: "INVALID_EMBEDDING_BATCH",
  UNSUPPORTED_EMBEDDING_MODEL: "UNSUPPORTED_EMBEDDING_MODEL",
} as const;

const SOURCE_ERROR_MESSAGE = {
  EMPTY_CONTENT: "Source content produced no chunks.",
  EMBEDDING_PROVIDER_FAILED: "Embedding provider failed.",
  INVALID_EMBEDDING_BATCH: "Embedding provider returned invalid embeddings.",
  UNSUPPORTED_EMBEDDING_MODEL: "Embedding model is unsupported.",
} as const;

export type ProcessingOwner = {
  jobId: string;
  token: string;
};

export type ProcessKnowledgeSourceOptions = {
  db: DbClient;
  encryptionKey: Uint8Array;
  createEmbeddingModel: CreateEmbeddingModel;
  organizationId: string;
  sourceId: string;
  processingOwner: ProcessingOwner;
};

const sourceProcessingSelection = {
  id: knowledgeSource.id,
  knowledgeBaseId: knowledgeSource.knowledgeBaseId,
  organizationId: knowledgeSource.organizationId,
  title: knowledgeSource.title,
  status: knowledgeSource.status,
  rawContent: knowledgeSource.rawContent,
};

const claimSourceForProcessing = async ({
  db,
  sourceId,
  organizationId,
  processingOwner,
}: {
  db: DbClient;
  sourceId: string;
  organizationId: string;
  processingOwner: ProcessingOwner;
}) => {
  const now = new Date();

  const rows = await db
    .update(knowledgeSource)
    .set({
      status: "processing",
      processingJobId: processingOwner.jobId,
      processingToken: processingOwner.token,
      updatedAt: now,
      errorCode: null,
      errorMessage: null,
    })
    .where(
      and(
        eq(knowledgeSource.organizationId, organizationId),
        eq(knowledgeSource.id, sourceId),
        or(
          eq(knowledgeSource.status, "pending"),

          // Recover an old processing row that predates ownership fields.
          and(
            eq(knowledgeSource.status, "processing"),
            isNull(knowledgeSource.processingJobId),
            isNull(knowledgeSource.processingToken)
          ),

          // Reclaim the same BullMQ job with a new lock token.
          and(
            eq(knowledgeSource.status, "processing"),
            eq(knowledgeSource.processingJobId, processingOwner.jobId),
            or(
              isNull(knowledgeSource.processingToken),
              ne(knowledgeSource.processingToken, processingOwner.token)
            )
          )
        )
      )
    )
    .returning(sourceProcessingSelection);

  return rows[0] ?? null;
};

const markSourceFailed = ({
  db,
  sourceId,
  organizationId,
  processingOwner,
  errorCode,
  errorMessage,
}: {
  db: DbClient;
  sourceId: string;
  organizationId: string;
  processingOwner: ProcessingOwner;
  errorCode: string;
  errorMessage: string;
}): Promise<boolean> =>
  db.transaction(async (tx) => {
    const rows = await tx
      .update(knowledgeSource)
      .set({
        status: "failed",
        processingJobId: null,
        processingToken: null,
        errorCode,
        errorMessage,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(knowledgeSource.organizationId, organizationId),
          eq(knowledgeSource.id, sourceId),
          eq(knowledgeSource.status, "processing"),
          eq(knowledgeSource.processingJobId, processingOwner.jobId),
          eq(knowledgeSource.processingToken, processingOwner.token)
        )
      )
      .returning({
        id: knowledgeSource.id,
      });

    if (!rows[0]) {
      return false;
    }

    await tx
      .delete(knowledgeChunk)
      .where(
        and(
          eq(knowledgeChunk.organizationId, organizationId),
          eq(knowledgeChunk.sourceId, sourceId)
        )
      );

    return true;
  });

const markSourceReady = ({
  db,
  sourceId,
  organizationId,
  processingOwner,
  chunks,
  embeddings,
}: {
  db: DbClient;
  sourceId: string;
  organizationId: string;
  processingOwner: ProcessingOwner;
  chunks: Chunk[];
  embeddings: number[][];
}): Promise<boolean> => {
  const now = new Date();

  // Re-insert knowledge chunks
  const chunkRows = chunks.map((chunk, index) => {
    const embedding = embeddings[index];

    if (!embedding) {
      throw new Error("Validated embedding batch is missing an embedding");
    }

    return {
      id: randomUUID(),
      organizationId,
      sourceId,
      chunkIndex: chunk.chunkIndex,
      content: chunk.content,
      embedding,
      createdAt: now,
    };
  });

  return db.transaction(async (tx) => {
    // Acquire the right to commit before touching chunks.
    const rows = await tx
      .update(knowledgeSource)
      .set({
        status: "ready",
        processingJobId: null,
        processingToken: null,
        errorCode: null,
        errorMessage: null,
        updatedAt: now,
      })
      .where(
        and(
          eq(knowledgeSource.organizationId, organizationId),
          eq(knowledgeSource.id, sourceId),
          eq(knowledgeSource.status, "processing"),
          eq(knowledgeSource.processingJobId, processingOwner.jobId),
          eq(knowledgeSource.processingToken, processingOwner.token)
        )
      )
      .returning({
        id: knowledgeSource.id,
      });

    if (!rows[0]) {
      return false;
    }

    // Delete matched knowledge chunks if any
    await tx
      .delete(knowledgeChunk)
      .where(
        and(
          eq(knowledgeChunk.organizationId, organizationId),
          eq(knowledgeChunk.sourceId, sourceId)
        )
      );

    await tx.insert(knowledgeChunk).values(chunkRows);

    return true;
  });
};

const getKnowledgeBaseEmbeddingProvider = async ({
  db,
  knowledgeBaseId,
  organizationId,
}: {
  db: DbClient;
  knowledgeBaseId: string;
  organizationId: string;
}) => {
  const rows = await db
    .select({
      knowledgeBaseId: knowledgeBase.id,
      embeddingProvider: {
        id: modelProvider.id,
        provider: modelProvider.provider,
        modelId: modelProvider.modelId,
        baseUrl: modelProvider.baseUrl,
        encryptedApiKey: modelProvider.encryptedApiKey,
      },
    })
    .from(knowledgeBase)
    .innerJoin(
      modelProvider,
      and(
        eq(knowledgeBase.organizationId, modelProvider.organizationId),
        eq(knowledgeBase.embeddingProviderId, modelProvider.id),
        eq(modelProvider.capability, "embedding")
      )
    )
    .where(
      and(
        eq(knowledgeBase.organizationId, organizationId),
        eq(knowledgeBase.id, knowledgeBaseId)
      )
    )
    .limit(1);

  return rows[0]?.embeddingProvider ?? null;
};

const isValidEmbeddingMatch = ({
  embeddings,
  expectedCount,
}: {
  embeddings: number[][];
  expectedCount: number;
}) =>
  embeddings.length === expectedCount &&
  embeddings.every((embedding) => embedding.length === EMBEDDING_DIMENSIONS);

export const processKnowledgeSource = async ({
  db,
  encryptionKey,
  createEmbeddingModel,
  organizationId,
  sourceId,
  processingOwner,
}: ProcessKnowledgeSourceOptions): Promise<void> => {
  // Mark the current knowledge source as processing
  const source = await claimSourceForProcessing({
    db,
    organizationId,
    sourceId,
    processingOwner,
  });

  if (!source) {
    return;
  }

  try {
    // Get chunks
    const chunks = await getChunks(source.rawContent);

    if (chunks.length === 0) {
      await markSourceFailed({
        db,
        sourceId,
        organizationId,
        processingOwner,
        errorCode: SOURCE_ERROR.EMPTY_CONTENT,
        errorMessage: SOURCE_ERROR_MESSAGE.EMPTY_CONTENT,
      });
      return;
    }

    // Get the matched knowledge base's embedding provider details
    const provider = await getKnowledgeBaseEmbeddingProvider({
      db,
      organizationId,
      knowledgeBaseId: source.knowledgeBaseId,
    });

    if (!provider) {
      await markSourceFailed({
        db,
        sourceId,
        organizationId,
        processingOwner,
        errorCode: SOURCE_ERROR.EMBEDDING_PROVIDER_FAILED,
        errorMessage: SOURCE_ERROR_MESSAGE.EMBEDDING_PROVIDER_FAILED,
      });
      return;
    }

    // Decrypt embedding provider's encryptedApiKey
    const apiKey = await decryptApiKey({
      encryptedApiKey: provider.encryptedApiKey,
      encryptionKey,
    });

    // Create the embedding model
    const model = createEmbeddingModel({
      apiKey,
      modelId: provider.modelId,
      provider: provider.provider,
      baseURL: provider.baseUrl,
    });

    // Generate embeddings
    const embeddings = await model.embedDocuments(
      chunks.map((chunk) => chunk.content)
    );

    // Check if embeddings generated are valid
    if (
      !isValidEmbeddingMatch({
        embeddings,
        expectedCount: chunks.length,
      })
    ) {
      await markSourceFailed({
        db,
        sourceId,
        organizationId,
        processingOwner,
        errorCode: SOURCE_ERROR.INVALID_EMBEDDING_BATCH,
        errorMessage: SOURCE_ERROR_MESSAGE.INVALID_EMBEDDING_BATCH,
      });
      return;
    }

    await markSourceReady({
      db,
      sourceId,
      organizationId,
      processingOwner,
      embeddings,
      chunks,
    });
  } catch (error) {
    const isUnsupportedModel =
      error instanceof Error &&
      error.message.startsWith("Unsupported embedding model:");

    await markSourceFailed({
      db,
      sourceId,
      organizationId,
      processingOwner,
      errorCode: isUnsupportedModel
        ? SOURCE_ERROR.UNSUPPORTED_EMBEDDING_MODEL
        : SOURCE_ERROR.EMBEDDING_PROVIDER_FAILED,
      errorMessage: isUnsupportedModel
        ? SOURCE_ERROR_MESSAGE.UNSUPPORTED_EMBEDDING_MODEL
        : SOURCE_ERROR_MESSAGE.EMBEDDING_PROVIDER_FAILED,
    });
  }
};
