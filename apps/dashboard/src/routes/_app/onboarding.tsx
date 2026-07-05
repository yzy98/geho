import { createFileRoute, linkOptions, redirect } from "@tanstack/react-router";
import { CreateOrganizationForm } from "@/components/forms/create-organization-form";
import { organizationQueryOptions } from "@/queries/organization";
import type { DashboardBreadcrumbContext } from "@/routes/__root";

export const Route = createFileRoute("/_app/onboarding")({
  context: ({ context }): DashboardBreadcrumbContext => ({
    breadcrumbs: [
      ...context.breadcrumbs,
      {
        id: "onboarding",
        label: "Onboarding",
        linkOptions: linkOptions({
          to: "/onboarding",
        }),
      },
    ],
  }),
  beforeLoad: async ({ context }) => {
    // Check current organization
    const organizationResult = await context.queryClient.ensureQueryData(
      organizationQueryOptions()
    );

    // Have organization, redirect back to dashboard home page
    if (organizationResult.status === "ok") {
      throw redirect({
        to: "/",
      });
    }

    if (organizationResult.status === "error") {
      throw organizationResult.error;
    }

    return {
      organizationStatus: organizationResult.status,
    };
  },
  component: OnboardingPage,
});

function OnboardingPage() {
  const { organizationStatus } = Route.useRouteContext();

  if (organizationStatus === "membership_required") {
    return (
      <div className="flex flex-col gap-6">
        <h2>Need invitation</h2>
        <p>
          You are not the member of current organization. Please contract the
          owner for invitation.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-lg">
      <CreateOrganizationForm />
    </div>
  );
}
