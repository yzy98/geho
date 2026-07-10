import { Alert, AlertDescription, AlertTitle } from "@heho/ui/components/alert";
import { Badge } from "@heho/ui/components/badge";
import { Button } from "@heho/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@heho/ui/components/card";
import { Separator } from "@heho/ui/components/separator";
import { Skeleton } from "@heho/ui/components/skeleton";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, linkOptions } from "@tanstack/react-router";
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  ClockIcon,
  LoaderCircleIcon,
  PlusIcon,
  XCircleIcon,
} from "lucide-react";
import { useState } from "react";
import { CreateKnowledgeSourceDialog } from "@/components/dialogs/create-knowledge-source-dialog";
import { RetrievalPreviewForm } from "@/components/forms/retrieval-preview-form";
import { useOrganizationPermission } from "@/hooks/use-organization-permission";
import { knowledgeBaseDetailsQueryOptions } from "@/queries/knowledge-base";
import {
  type KnowledgeSource,
  knowledgeSourcesQueryOptions,
} from "@/queries/knowledge-source";
import { organizationPermissionQueryOptions } from "@/queries/organization-permission";
import type { DashboardBreadcrumbContext } from "@/routes/__root";

export const Route = createFileRoute(
  "/_app/_workspace/knowledge-bases/$knowledgeBaseId"
)({
  context: ({ context, params }): DashboardBreadcrumbContext => ({
    breadcrumbs: [
      ...context.breadcrumbs,
      {
        id: `knowledge-base-${params.knowledgeBaseId}`,
        label: params.knowledgeBaseId,
        linkOptions: linkOptions({
          to: "/knowledge-bases/$knowledgeBaseId",
          params: {
            knowledgeBaseId: params.knowledgeBaseId,
          },
        }),
      },
    ],
  }),
  loader: ({ context, params }) =>
    Promise.all([
      context.queryClient.ensureQueryData(
        knowledgeBaseDetailsQueryOptions(
          context.organization.id,
          params.knowledgeBaseId
        )
      ),
      context.queryClient.ensureQueryData(
        knowledgeSourcesQueryOptions(
          context.organization.id,
          params.knowledgeBaseId
        )
      ),
      context.queryClient.ensureQueryData(
        organizationPermissionQueryOptions(
          context.organization.id,
          "createKnowledgeSource"
        )
      ),
    ]),
  pendingComponent: KnowledgeBaseDetailsPending,
  errorComponent: KnowledgeBaseDetailsError,
  component: KnowledgeBaseDetailsPage,
});

function KnowledgeBaseDetailsPage() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const { knowledgeBaseId } = Route.useParams();
  const { organization } = Route.useRouteContext();

  const {
    data: { knowledgeBase },
  } = useSuspenseQuery(
    knowledgeBaseDetailsQueryOptions(organization.id, knowledgeBaseId)
  );
  const {
    data: { sources },
  } = useSuspenseQuery(
    knowledgeSourcesQueryOptions(organization.id, knowledgeBaseId)
  );

  const canCreateKnowledgeSource = useOrganizationPermission(
    "createKnowledgeSource"
  );

  const hasReadySources = sources.some((source) => source.status === "ready");

  return (
    <>
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{knowledgeBase.name}</CardTitle>
            <CardDescription>
              Embedding provider: {knowledgeBase.embeddingProvider.name} ·{" "}
              {knowledgeBase.embeddingProvider.provider} ·{" "}
              {knowledgeBase.embeddingProvider.modelId}
            </CardDescription>
          </CardHeader>
        </Card>

        {hasReadySources && (
          <Card>
            <CardHeader>
              <CardTitle>Retrieval preview</CardTitle>
              <CardDescription>
                Preview which chunks this knowledge base retrieves for a query.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RetrievalPreviewForm knowledgeBaseId={knowledgeBaseId} />
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Sources</CardTitle>
              <CardDescription>
                Add text sources that will be embedded for retrieval.
              </CardDescription>
            </div>

            {canCreateKnowledgeSource && (
              <Button onClick={() => setCreateDialogOpen(true)}>
                <PlusIcon data-icon="inline-start" />
                Add source
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {sources.length === 0 ? (
              <SourcesEmptyAlert canCreate={canCreateKnowledgeSource} />
            ) : (
              <SourceList sources={sources} />
            )}
          </CardContent>
        </Card>
      </div>

      {canCreateKnowledgeSource && (
        <CreateKnowledgeSourceDialog
          knowledgeBaseId={knowledgeBaseId}
          onOpenChange={setCreateDialogOpen}
          open={createDialogOpen}
          organizationId={organization.id}
        />
      )}
    </>
  );
}

function SourcesEmptyAlert({ canCreate }: { canCreate: boolean }) {
  return (
    <Alert>
      <AlertTriangleIcon />
      <AlertTitle>No sources yet</AlertTitle>
      <AlertDescription>
        {canCreate
          ? "Create your first source."
          : "You do not have permission to create sources."}
      </AlertDescription>
    </Alert>
  );
}

function SourceList({ sources }: { sources: KnowledgeSource[] }) {
  return (
    <div className="flex flex-col">
      {sources.map((source, index) => (
        <div key={source.id}>
          {index > 0 && <Separator />}
          <div className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="truncate font-medium">{source.title}</h3>
                <SourceStatusBadge status={source.status} />
              </div>

              <p className="text-muted-foreground text-sm">
                {source.chunkCount} chunks
              </p>

              {source.status === "failed" && source.errorMessage ? (
                <p className="mt-1 text-destructive text-sm">
                  {source.errorMessage}
                </p>
              ) : null}
            </div>

            <p className="shrink-0 text-muted-foreground text-xs">
              {new Date(source.createdAt).toLocaleString()}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function SourceStatusBadge({ status }: { status: KnowledgeSource["status"] }) {
  switch (status) {
    case "ready":
      return (
        <Badge variant="default">
          <CheckCircle2Icon data-icon="inline-start" />
          Ready
        </Badge>
      );
    case "failed":
      return (
        <Badge variant="destructive">
          <XCircleIcon data-icon="inline-start" />
          Failed
        </Badge>
      );
    case "processing":
      return (
        <Badge variant="outline">
          <LoaderCircleIcon className="animate-spin" data-icon="inline-start" />
          Processing
        </Badge>
      );
    case "pending":
      return (
        <Badge variant="outline">
          <ClockIcon data-icon="inline-start" />
          Pending
        </Badge>
      );
    default:
      return null;
  }
}

function KnowledgeBaseDetailsError() {
  return (
    <Alert>
      <AlertTriangleIcon />
      <AlertTitle>Unable to load knowledge base</AlertTitle>
      <AlertDescription>
        Check whether the knowledge base exists and you have access.
      </AlertDescription>
    </Alert>
  );
}

function KnowledgeBaseDetailsPending() {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-4 w-96" />
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}
