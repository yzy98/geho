import type { DbClient } from "@geho/db";
import { and, count, desc, eq, inArray } from "@geho/db/helper";
import {
  chatbot,
  knowledgeBase,
  knowledgeSource,
  member,
  modelProvider,
} from "@geho/db/schema";

export type GetWorkspaceOverviewOptions = {
  db: DbClient;
  organizationId: string;
  workspaceName: string;
};

export type KnowledgeBaseIngestionStatus =
  | "empty"
  | "processing"
  | "ready"
  | "needs_attention";

export type WorkspaceOverviewDto = {
  workspaceName: string;
  stats: {
    modelProviders: {
      chat: number;
      embedding: number;
    };
    knowledgeBaseCount: number;
    chatbotCount: number;
    memberCount: number;
    sources: {
      total: number;
      pending: number;
      processing: number;
      ready: number;
      failed: number;
    };
  };
  setup: {
    hasChatModel: boolean;
    hasEmbeddingModel: boolean;
    hasKnowledgeBase: boolean;
    hasReadySource: boolean;
    hasChatbot: boolean;
  };
  recentKnowledgeBases: {
    id: string;
    name: string;
    createdAt: Date;
    sourceCount: number;
    ingestionStatus: KnowledgeBaseIngestionStatus;
  }[];
};

type SourceCounts = WorkspaceOverviewDto["stats"]["sources"];

const createSourceCounts = (): SourceCounts => ({
  total: 0,
  pending: 0,
  processing: 0,
  ready: 0,
  failed: 0,
});

const getIngestionStatus = (
  sources: SourceCounts
): KnowledgeBaseIngestionStatus => {
  if (sources.pending > 0 || sources.processing > 0) {
    return "processing";
  }

  if (sources.failed > 0) {
    return "needs_attention";
  }

  if (sources.ready > 0) {
    return "ready";
  }

  return "empty";
};

export const getWorkspaceOverview = async ({
  db,
  organizationId,
  workspaceName,
}: GetWorkspaceOverviewOptions): Promise<WorkspaceOverviewDto> => {
  const [
    modelProviderRows,
    knowledgeBaseCountRows,
    chatbotCountRows,
    memberCountRows,
    sourceStatusRows,
    recentKnowledgeBases,
  ] = await Promise.all([
    db
      .select({
        capability: modelProvider.capability,
        value: count(modelProvider.id),
      })
      .from(modelProvider)
      .where(eq(modelProvider.organizationId, organizationId))
      .groupBy(modelProvider.capability),

    db
      .select({ value: count(knowledgeBase.id) })
      .from(knowledgeBase)
      .where(eq(knowledgeBase.organizationId, organizationId)),

    db
      .select({ value: count(chatbot.id) })
      .from(chatbot)
      .where(eq(chatbot.organizationId, organizationId)),

    db
      .select({ value: count(member.id) })
      .from(member)
      .where(eq(member.organizationId, organizationId)),

    db
      .select({
        status: knowledgeSource.status,
        value: count(knowledgeSource.id),
      })
      .from(knowledgeSource)
      .where(eq(knowledgeSource.organizationId, organizationId))
      .groupBy(knowledgeSource.status),

    db
      .select({
        id: knowledgeBase.id,
        name: knowledgeBase.name,
        createdAt: knowledgeBase.createdAt,
      })
      .from(knowledgeBase)
      .where(eq(knowledgeBase.organizationId, organizationId))
      .orderBy(desc(knowledgeBase.createdAt), desc(knowledgeBase.id))
      .limit(4),
  ]);

  const recentKnowledgeBaseIds = recentKnowledgeBases.map(
    (knowledgeBase) => knowledgeBase.id
  );

  const recentSourceRows =
    recentKnowledgeBaseIds.length === 0
      ? []
      : await db
          .select({
            knowledgeBaseId: knowledgeSource.knowledgeBaseId,
            status: knowledgeSource.status,
            value: count(knowledgeSource.id),
          })
          .from(knowledgeSource)
          .where(
            and(
              eq(knowledgeSource.organizationId, organizationId),
              inArray(knowledgeSource.knowledgeBaseId, recentKnowledgeBaseIds)
            )
          )
          .groupBy(knowledgeSource.knowledgeBaseId, knowledgeSource.status);

  const modelProviders = {
    chat: 0,
    embedding: 0,
  };

  for (const row of modelProviderRows) {
    modelProviders[row.capability] = Number(row.value);
  }

  const sources = createSourceCounts();

  for (const row of sourceStatusRows) {
    const value = Number(row.value);

    sources[row.status] = value;
    sources.total += value;
  }

  const sourcesByKnowledgeBase = new Map<string, SourceCounts>();

  for (const row of recentSourceRows) {
    const sourceCounts =
      sourcesByKnowledgeBase.get(row.knowledgeBaseId) ?? createSourceCounts();
    const value = Number(row.value);

    sourceCounts[row.status] = value;
    sourceCounts.total += value;
    sourcesByKnowledgeBase.set(row.knowledgeBaseId, sourceCounts);
  }

  const stats = {
    modelProviders,
    knowledgeBaseCount: Number(knowledgeBaseCountRows[0]?.value ?? 0),
    chatbotCount: Number(chatbotCountRows[0]?.value ?? 0),
    memberCount: Number(memberCountRows[0]?.value ?? 0),
    sources,
  };

  return {
    workspaceName,
    stats,
    setup: {
      hasChatModel: stats.modelProviders.chat > 0,
      hasEmbeddingModel: stats.modelProviders.embedding > 0,
      hasKnowledgeBase: stats.knowledgeBaseCount > 0,
      hasReadySource: stats.sources.ready > 0,
      hasChatbot: stats.chatbotCount > 0,
    },
    recentKnowledgeBases: recentKnowledgeBases.map((knowledgeBase) => {
      const sourceCounts =
        sourcesByKnowledgeBase.get(knowledgeBase.id) ?? createSourceCounts();

      return {
        ...knowledgeBase,
        sourceCount: sourceCounts.total,
        ingestionStatus: getIngestionStatus(sourceCounts),
      };
    }),
  };
};
