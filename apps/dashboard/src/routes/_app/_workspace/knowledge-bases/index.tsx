import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@geho/ui/components/alert";
import { Button, buttonVariants } from "@geho/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@geho/ui/components/card";
import { Skeleton } from "@geho/ui/components/skeleton";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  createFileRoute,
  type ErrorComponentProps,
  Link,
} from "@tanstack/react-router";
import { AlertTriangleIcon, ArrowRightIcon, PlusIcon } from "lucide-react";
import { useState } from "react";
import { CreateKnowledgeBaseDialog } from "@/components/dialogs/create-knowledge-base-dialog";
import { useOrganizationPermission } from "@/hooks/use-organization-permission";
import {
  type KnowledgeBase,
  knowledgeBasesQueryOptions,
} from "@/queries/knowledge-base";
import {
  type ModelProvider,
  modelProvidersQueryOptions,
} from "@/queries/model-provider";
import { organizationPermissionQueryOptions } from "@/queries/organization-permission";

export const Route = createFileRoute("/_app/_workspace/knowledge-bases/")({
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(
        knowledgeBasesQueryOptions(context.organization.id)
      ),
      context.queryClient.ensureQueryData(
        modelProvidersQueryOptions(context.organization.id)
      ),
      context.queryClient.ensureQueryData(
        organizationPermissionQueryOptions(
          context.organization.id,
          "createKnowledgeBase"
        )
      ),
    ]),
  pendingComponent: KnowledgeBasesPending,
  errorComponent: KnowledgeBasesError,
  component: KnowledgeBasesPage,
});

function KnowledgeBasesPage() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const { organization } = Route.useRouteContext();
  const {
    data: { knowledgeBases },
  } = useSuspenseQuery(knowledgeBasesQueryOptions(organization.id));
  const {
    data: { modelProviders },
  } = useSuspenseQuery(modelProvidersQueryOptions(organization.id));

  const embeddingModels = modelProviders.filter(
    (modelProviders) => modelProviders.capability === "embedding"
  );
  const hasEmbeddingModel = embeddingModels.length > 0;
  const canCreateKnowledgeBase = useOrganizationPermission(
    "createKnowledgeBase"
  );

  return (
    <>
      <div className="mb-4 flex items-start justify-between gap-4">
        <p className="text-muted-foreground text-sm">
          Create reusable knowledge collections for your chatbots.
        </p>

        {canCreateKnowledgeBase && hasEmbeddingModel && (
          <Button onClick={() => setCreateDialogOpen(true)}>
            <PlusIcon data-icon="inline-start" />
            Add knowledge base
          </Button>
        )}

        {canCreateKnowledgeBase && !hasEmbeddingModel && (
          <Link className={buttonVariants()} to="/models">
            Configure an embedding model
          </Link>
        )}
      </div>

      {knowledgeBases.length === 0 ? (
        <KnowledgeBasesEmptyAlert
          canCreate={canCreateKnowledgeBase}
          hasEmbeddingModel={hasEmbeddingModel}
        />
      ) : (
        <KnowledgeBaseList
          embeddingModels={embeddingModels}
          knowledgeBases={knowledgeBases}
        />
      )}

      {canCreateKnowledgeBase && hasEmbeddingModel && (
        <CreateKnowledgeBaseDialog
          embeddingModels={embeddingModels}
          onOpenChange={setCreateDialogOpen}
          open={createDialogOpen}
          organizationId={organization.id}
        />
      )}
    </>
  );
}

function KnowledgeBasesEmptyAlert({
  canCreate,
  hasEmbeddingModel,
}: {
  canCreate: boolean;
  hasEmbeddingModel: boolean;
}) {
  return (
    <Alert>
      <AlertTriangleIcon />
      <AlertTitle>
        {hasEmbeddingModel
          ? "No knowledge bases configured"
          : "Embedding model required"}
      </AlertTitle>
      <AlertDescription>
        {canCreate
          ? hasEmbeddingModel
            ? "Create a reusable knowledge base for your chatbots."
            : "Configure an embedding model before creating a knowledge base."
          : "You do not have permission to create knowledge bases."}
      </AlertDescription>
    </Alert>
  );
}

type KnowledgeBaseListProps = {
  knowledgeBases: KnowledgeBase[];
  embeddingModels: ModelProvider[];
};

function KnowledgeBaseList({
  knowledgeBases,
  embeddingModels,
}: KnowledgeBaseListProps) {
  const embeddingModelsById = new Map(
    embeddingModels.map((embeddingModel) => [embeddingModel.id, embeddingModel])
  );

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {knowledgeBases.map((knowledgeBase) => (
        <KnowledgeBaseCard
          embeddingModel={embeddingModelsById.get(
            knowledgeBase.embeddingProviderId
          )}
          key={knowledgeBase.id}
          knowledgeBase={knowledgeBase}
        />
      ))}
    </div>
  );
}

type KnowledgeBaseCardProps = {
  knowledgeBase: KnowledgeBase;
  embeddingModel: ModelProvider | undefined;
};

function KnowledgeBaseCard({
  knowledgeBase,
  embeddingModel,
}: KnowledgeBaseCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{knowledgeBase.name}</CardTitle>
        <CardDescription>Reusable knowledge collection</CardDescription>
      </CardHeader>

      <CardContent>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
          <dt className="text-muted-foreground">Embedding model provider</dt>
          <dd
            className="truncate text-right"
            title={formatModel(embeddingModel)}
          >
            {formatModel(embeddingModel)}
          </dd>

          <dt className="text-muted-foreground">Model ID</dt>
          <dd
            className="truncate text-right"
            title={embeddingModel?.modelId ?? "Model missing"}
          >
            {embeddingModel?.modelId ?? "Model missing"}
          </dd>
        </dl>
      </CardContent>

      <CardFooter>
        <Link
          className={buttonVariants({
            size: "sm",
            variant: "outline",
          })}
          params={{ knowledgeBaseId: knowledgeBase.id }}
          to="/knowledge-bases/$knowledgeBaseId"
        >
          Manage sources
          <ArrowRightIcon data-icon="inline-end" />
        </Link>
      </CardFooter>
    </Card>
  );
}

function formatModel(provider?: ModelProvider) {
  if (!provider) {
    return "Model missing";
  }

  return `${provider.name} · ${provider.provider}`;
}

function KnowledgeBasesPending() {
  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-2">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    </div>
  );
}

function KnowledgeBasesError({ error, reset }: ErrorComponentProps) {
  return (
    <Alert variant="destructive">
      <AlertTriangleIcon />
      <AlertTitle>Unable to load knowledge bases</AlertTitle>
      <AlertDescription>
        {error instanceof Error
          ? error.message
          : "An unexpected error occurred."}
      </AlertDescription>
      <AlertAction>
        <Button onClick={reset} size="xs" type="button" variant="secondary">
          Try again
        </Button>
      </AlertAction>
    </Alert>
  );
}
