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
import { CreateLlmProviderDialog } from "@/components/dialogs/create-llm-provider-dialog";
import { useOrganizationPermission } from "@/hooks/use-organization-permission";
import {
  type LlmProvider,
  llmProvidersQueryOptions,
} from "@/queries/llm-provider";
import { organizationPermissionQueryOptions } from "@/queries/organization-permission";
import type { DashboardBreadcrumbContext } from "@/routes/__root";

export const Route = createFileRoute("/_app/_workspace/providers")({
  context: ({ context }): DashboardBreadcrumbContext => ({
    breadcrumbs: [
      ...context.breadcrumbs,
      {
        id: "providers",
        label: "Providers",
        linkOptions: linkOptions({
          to: "/providers",
        }),
      },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(
        llmProvidersQueryOptions(context.organization.id)
      ),
      context.queryClient.ensureQueryData(
        organizationPermissionQueryOptions(
          context.organization.id,
          "createLlmProvider"
        )
      ),
    ]),
  pendingComponent: ProvidersPending,
  errorComponent: ProvidersError,
  component: ProvidersPage,
});

function ProvidersPage() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const { organization } = Route.useRouteContext();
  const {
    data: { providers },
  } = useSuspenseQuery(llmProvidersQueryOptions(organization.id));

  const canCreateProvider = useOrganizationPermission("createLlmProvider");

  return (
    <>
      <div className="mb-4 flex items-start justify-between gap-4">
        <p className="text-muted-foreground text-sm">
          Configure model providers used by your chatbots.
        </p>
        {canCreateProvider && (
          <Button onClick={() => setCreateDialogOpen(true)}>
            <PlusIcon data-icon="inline-start" />
            Add provider
          </Button>
        )}
      </div>

      {providers.length === 0 ? (
        <ProvidersEmptyAlert canCreate={canCreateProvider} />
      ) : (
        <ProviderList providers={providers} />
      )}

      {canCreateProvider && (
        <CreateLlmProviderDialog
          onOpenChange={setCreateDialogOpen}
          open={createDialogOpen}
          organizationId={organization.id}
        />
      )}
    </>
  );
}

function ProvidersEmptyAlert({ canCreate }: { canCreate: boolean }) {
  return (
    <Alert>
      <AlertTriangleIcon />
      <AlertTitle>No LLM providers configured</AlertTitle>
      <AlertDescription>
        {canCreate
          ? "Configure a model provider."
          : "You do not have permission to configure model providers."}
      </AlertDescription>
    </Alert>
  );
}

function ProviderList({ providers }: { providers: LlmProvider[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {providers.map((provider) => (
        <ProviderCard key={provider.id} provider={provider} />
      ))}
    </div>
  );
}

function ProviderCard({ provider }: { provider: LlmProvider }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{provider.name}</CardTitle>
        <CardDescription>{provider.provider}</CardDescription>
      </CardHeader>

      <CardContent>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
          <dt className="text-muted-foreground">Capability</dt>
          <dd className="text-right">
            {provider.capability === "chat" ? "Chat" : "Embedding"}
          </dd>

          <dt className="text-muted-foreground">Model</dt>
          <dd className="truncate text-right" title={provider.model}>
            {provider.model}
          </dd>

          <dt className="text-muted-foreground">Base URL</dt>
          <dd
            className="truncate text-right"
            title={provider.baseUrl ?? "Provider default"}
          >
            {provider.baseUrl ?? "Provider default"}
          </dd>

          <dt className="text-muted-foreground">Credential</dt>
          <dd className="text-right">Saved</dd>
        </dl>
      </CardContent>
    </Card>
  );
}

function ProvidersPending() {
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

function ProvidersError({ error, reset }: ErrorComponentProps) {
  return (
    <Alert variant="destructive">
      <AlertTriangleIcon />
      <AlertTitle>Unable to load providers</AlertTitle>
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
