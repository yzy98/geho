import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@heho/ui/components/alert";
import { Button, buttonVariants } from "@heho/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@heho/ui/components/card";
import { Skeleton } from "@heho/ui/components/skeleton";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  createFileRoute,
  type ErrorComponentProps,
  Link,
} from "@tanstack/react-router";
import { AlertTriangleIcon, ArrowRightIcon, PlusIcon } from "lucide-react";
import { useState } from "react";
import { CreateKnowledgeBaseDialog } from "@/components/dialogs/create-knowledge-base-dialog";
import { hasOwnerRole } from "@/lib/utils";
import {
  type KnowledgeBase,
  knowledgeBasesQueryOptions,
} from "@/queries/knowledge-base";
import {
  type LlmProvider,
  llmProvidersQueryOptions,
} from "@/queries/llm-provider";

export const Route = createFileRoute("/_app/_workspace/knowledge-bases/")({
  staticData: {
    breadcrumb: "Knowledge Bases",
  },
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(
        knowledgeBasesQueryOptions(context.organization.id)
      ),
      context.queryClient.ensureQueryData(
        llmProvidersQueryOptions(context.organization.id)
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
    data: { providers },
  } = useSuspenseQuery(llmProvidersQueryOptions(organization.id));

  const embeddingProviders = providers.filter(
    (provider) => provider.capability === "embedding"
  );
  const canCreate = hasOwnerRole(organization.role);
  const hasEmbeddingProvider = embeddingProviders.length > 0;

  return (
    <>
      <div className="mb-4 flex items-start justify-between gap-4">
        <p className="text-muted-foreground text-sm">
          Create reusable knowledge collections for your chatbots.
        </p>

        {canCreate && hasEmbeddingProvider && (
          <Button onClick={() => setCreateDialogOpen(true)}>
            <PlusIcon data-icon="inline-start" />
            Add knowledge base
          </Button>
        )}

        {canCreate && !hasEmbeddingProvider && (
          <Link className={buttonVariants()} to="/providers">
            Configure embedding provider
          </Link>
        )}
      </div>

      {knowledgeBases.length === 0 ? (
        <KnowledgeBasesEmptyAlert
          canCreate={canCreate}
          hasEmbeddingProvider={hasEmbeddingProvider}
        />
      ) : (
        <KnowledgeBaseList
          knowledgeBases={knowledgeBases}
          providers={providers}
        />
      )}

      {canCreate && hasEmbeddingProvider && (
        <CreateKnowledgeBaseDialog
          onOpenChange={setCreateDialogOpen}
          open={createDialogOpen}
          organizationId={organization.id}
          providers={embeddingProviders}
        />
      )}
    </>
  );
}

function KnowledgeBasesEmptyAlert({
  canCreate,
  hasEmbeddingProvider,
}: {
  canCreate: boolean;
  hasEmbeddingProvider: boolean;
}) {
  return (
    <Alert>
      <AlertTriangleIcon />
      <AlertTitle>
        {hasEmbeddingProvider
          ? "No knowledge bases configured"
          : "Embedding provider required"}
      </AlertTitle>
      <AlertDescription>
        {canCreate
          ? hasEmbeddingProvider
            ? "Create a reusable knowledge base for your chatbots."
            : "Configure an embedding provider before creating a knowledge base."
          : "The organization owner must create the first knowledge base."}
      </AlertDescription>
    </Alert>
  );
}

type KnowledgeBaseListProps = {
  knowledgeBases: KnowledgeBase[];
  providers: LlmProvider[];
};

function KnowledgeBaseList({
  knowledgeBases,
  providers,
}: KnowledgeBaseListProps) {
  const providersById = new Map(
    providers.map((provider) => [provider.id, provider])
  );

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {knowledgeBases.map((knowledgeBase) => (
        <KnowledgeBaseCard
          embeddingProvider={providersById.get(
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
  embeddingProvider: LlmProvider | undefined;
};

function KnowledgeBaseCard({
  knowledgeBase,
  embeddingProvider,
}: KnowledgeBaseCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{knowledgeBase.name}</CardTitle>
        <CardDescription>Reusable knowledge collection</CardDescription>
      </CardHeader>

      <CardContent>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
          <dt className="text-muted-foreground">Embedding provider</dt>
          <dd
            className="truncate text-right"
            title={formatProvider(embeddingProvider)}
          >
            {formatProvider(embeddingProvider)}
          </dd>

          <dt className="text-muted-foreground">Model</dt>
          <dd
            className="truncate text-right"
            title={embeddingProvider?.model ?? "Provider missing"}
          >
            {embeddingProvider?.model ?? "Provider missing"}
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

function formatProvider(provider?: LlmProvider) {
  if (!provider) {
    return "Provider missing";
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
