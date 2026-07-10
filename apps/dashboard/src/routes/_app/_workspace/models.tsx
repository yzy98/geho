import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@heho/ui/components/alert";
import { Button } from "@heho/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@heho/ui/components/card";
import { Skeleton } from "@heho/ui/components/skeleton";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  createFileRoute,
  type ErrorComponentProps,
  linkOptions,
} from "@tanstack/react-router";
import { AlertTriangleIcon, PlusIcon } from "lucide-react";
import { useState } from "react";
import { CreateModelProviderDialog } from "@/components/dialogs/create-model-provider-dialog";
import { useOrganizationPermission } from "@/hooks/use-organization-permission";
import {
  type ModelProvider,
  modelProvidersQueryOptions,
} from "@/queries/model-provider";
import { organizationPermissionQueryOptions } from "@/queries/organization-permission";
import type { DashboardBreadcrumbContext } from "@/routes/__root";

export const Route = createFileRoute("/_app/_workspace/models")({
  context: ({ context }): DashboardBreadcrumbContext => ({
    breadcrumbs: [
      ...context.breadcrumbs,
      {
        id: "models",
        label: "Models",
        linkOptions: linkOptions({
          to: "/models",
        }),
      },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(
        modelProvidersQueryOptions(context.organization.id)
      ),
      context.queryClient.ensureQueryData(
        organizationPermissionQueryOptions(
          context.organization.id,
          "createModelProvider"
        )
      ),
    ]),
  pendingComponent: ModelsPending,
  errorComponent: ModelsError,
  component: ModelsPage,
});

function ModelsPage() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const { organization } = Route.useRouteContext();
  const {
    data: { modelProviders },
  } = useSuspenseQuery(modelProvidersQueryOptions(organization.id));

  const canAddModel = useOrganizationPermission("createModelProvider");

  return (
    <>
      <div className="mb-4 flex items-start justify-between gap-4">
        <p className="text-muted-foreground text-sm">
          Configure chat and embedding models used by your chatbots.
        </p>
        {canAddModel && (
          <Button onClick={() => setCreateDialogOpen(true)}>
            <PlusIcon data-icon="inline-start" />
            Add model
          </Button>
        )}
      </div>

      {modelProviders.length === 0 ? (
        <ModelsEmptyAlert canCreate={canAddModel} />
      ) : (
        <ModelList models={modelProviders} />
      )}

      {canAddModel && (
        <CreateModelProviderDialog
          onOpenChange={setCreateDialogOpen}
          open={createDialogOpen}
          organizationId={organization.id}
        />
      )}
    </>
  );
}

function ModelsEmptyAlert({ canCreate }: { canCreate: boolean }) {
  return (
    <Alert>
      <AlertTriangleIcon />
      <AlertTitle>No models configured</AlertTitle>
      <AlertDescription>
        {canCreate
          ? "Configure a model."
          : "You do not have permission to configure models."}
      </AlertDescription>
    </Alert>
  );
}

function ModelList({ models }: { models: ModelProvider[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {models.map((model) => (
        <ModelCard key={model.id} model={model} />
      ))}
    </div>
  );
}

function ModelCard({ model }: { model: ModelProvider }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{model.name}</CardTitle>
        <CardDescription>{model.provider}</CardDescription>
      </CardHeader>

      <CardContent>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
          <dt className="text-muted-foreground">Capability</dt>
          <dd className="text-right">
            {model.capability === "chat" ? "Chat" : "Embedding"}
          </dd>

          <dt className="text-muted-foreground">Model</dt>
          <dd className="truncate text-right" title={model.modelId}>
            {model.modelId}
          </dd>

          <dt className="text-muted-foreground">Base URL</dt>
          <dd
            className="truncate text-right"
            title={model.baseUrl ?? "Model default"}
          >
            {model.baseUrl ?? "Model default"}
          </dd>

          <dt className="text-muted-foreground">Credential</dt>
          <dd className="text-right">Saved</dd>
        </dl>
      </CardContent>
    </Card>
  );
}

function ModelsPending() {
  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-2">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    </div>
  );
}

function ModelsError({ error, reset }: ErrorComponentProps) {
  return (
    <Alert variant="destructive">
      <AlertTriangleIcon />
      <AlertTitle>Unable to load models</AlertTitle>
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
