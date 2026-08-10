import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { organizationQueryOptions } from "@/queries/organization";

export const Route = createFileRoute("/_app/_workspace")({
  beforeLoad: async ({ context }) => {
    // Check current organization
    const organizationResult = await context.queryClient.ensureQueryData(
      organizationQueryOptions()
    );

    // No organization for now, redirect to onboarding page
    if (
      organizationResult.status === "membership_required" ||
      organizationResult.status === "onboarding_required"
    ) {
      throw redirect({
        to: "/onboarding",
      });
    }

    if (organizationResult.status === "error") {
      throw organizationResult.error;
    }

    return {
      organization: organizationResult.organization,
    };
  },
  component: WorkspaceLayout,
});

function WorkspaceLayout() {
  return (
    <div className="mx-auto w-full max-w-7xl">
      <Outlet />
    </div>
  );
}
