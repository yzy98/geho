import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@geho/ui/components/alert";
import { Button } from "@geho/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@geho/ui/components/card";
import { Skeleton } from "@geho/ui/components/skeleton";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  createFileRoute,
  type ErrorComponentProps,
  linkOptions,
} from "@tanstack/react-router";
import { AlertTriangleIcon, PlusIcon } from "lucide-react";
import { useState } from "react";
import { AddOrganizationMemberDialog } from "@/components/dialogs/add-organization-member-dialog";
import { useOrganizationPermission } from "@/hooks/use-organization-permission";
import {
  type OrganizationMember,
  organizationMembersQueryOptions,
} from "@/queries/organization-member";
import { organizationPermissionQueryOptions } from "@/queries/organization-permission";
import type { DashboardBreadcrumbContext } from "@/routes/__root";

export const Route = createFileRoute("/_app/_workspace/members")({
  context: ({ context }): DashboardBreadcrumbContext => ({
    breadcrumbs: [
      ...context.breadcrumbs,
      {
        id: "members",
        label: "Members",
        linkOptions: linkOptions({
          to: "/members",
        }),
      },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(
        organizationMembersQueryOptions(context.organization.id)
      ),
      context.queryClient.ensureQueryData(
        organizationPermissionQueryOptions(
          context.organization.id,
          "addOrganizationMember"
        )
      ),
    ]),
  pendingComponent: MembersPending,
  errorComponent: MembersError,
  component: MembersPage,
});

function MembersPage() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const { organization } = Route.useRouteContext();

  const {
    data: { members },
  } = useSuspenseQuery(organizationMembersQueryOptions(organization.id));

  const canAddMember = useOrganizationPermission("addOrganizationMember");

  return (
    <>
      <div className="mb-4 flex items-start justify-between gap-4">
        <p className="text-muted-foreground text-sm">
          Manage your organization members.
        </p>
        {canAddMember && (
          <Button onClick={() => setCreateDialogOpen(true)}>
            <PlusIcon data-icon="inline-start" />
            Add member
          </Button>
        )}
      </div>

      {members.length === 0 ? (
        <MembersEmptyAlert canCreate={canAddMember} />
      ) : (
        <MemberList members={members} />
      )}

      {canAddMember && (
        <AddOrganizationMemberDialog
          onOpenChange={setCreateDialogOpen}
          open={createDialogOpen}
          organizationId={organization.id}
        />
      )}
    </>
  );
}

function MembersEmptyAlert({ canCreate }: { canCreate: boolean }) {
  return (
    <Alert>
      <AlertTriangleIcon />
      <AlertTitle>No organization members</AlertTitle>
      <AlertDescription>
        {canCreate
          ? "Add a member."
          : "You do not have permission to add members."}
      </AlertDescription>
    </Alert>
  );
}

function MemberList({ members }: { members: OrganizationMember[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization members</CardTitle>
        <CardDescription>People with access to this workspace.</CardDescription>
      </CardHeader>

      <CardContent>
        <div className="divide-y">
          {members.map((member) => (
            <div
              className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
              key={member.id}
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{member.user.name}</p>
                <p className="truncate text-muted-foreground text-sm">
                  {member.user.email}
                </p>
              </div>

              <span className="text-muted-foreground text-sm capitalize">
                {member.role}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function MembersPending() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <Skeleton className="h-72" />
      <Skeleton className="h-56" />
    </div>
  );
}

function MembersError({ error, reset }: ErrorComponentProps) {
  return (
    <Alert variant="destructive">
      <AlertTriangleIcon />
      <AlertTitle>Unable to load members</AlertTitle>
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
