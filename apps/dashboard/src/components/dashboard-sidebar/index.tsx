import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@geho/ui/components/sidebar";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation, useRouteContext } from "@tanstack/react-router";
import { organizationQueryOptions } from "@/queries/organization";
import {
  MembershipRequiredNav,
  OnboardingNav,
  PendingNav,
  WorkspaceNav,
} from "./nav";
import { UserNav } from "./user-nav";

export const DashboardSidebar = () => {
  const location = useLocation();
  const { session } = useRouteContext({ from: "/_app" });
  const { data: organizationResult } = useQuery(organizationQueryOptions());

  const organizationName =
    organizationResult?.status === "ok"
      ? organizationResult.organization.name
      : "Geho";

  return (
    <Sidebar variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton render={<Link to="/" />}>
              <span className="font-semibold text-base">
                {organizationName}
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <DashboardSidebarNav
          organizationStatus={organizationResult?.status}
          pathname={location.pathname}
        />
      </SidebarContent>
      <SidebarFooter>
        <UserNav user={session.user} />
      </SidebarFooter>
    </Sidebar>
  );
};

function DashboardSidebarNav({
  organizationStatus,
  pathname,
}: {
  organizationStatus:
    | "error"
    | "membership_required"
    | "ok"
    | "onboarding_required"
    | undefined;
  pathname: string;
}) {
  if (organizationStatus === "ok") {
    return <WorkspaceNav pathname={pathname} />;
  }

  if (organizationStatus === "onboarding_required") {
    return <OnboardingNav pathname={pathname} />;
  }

  if (organizationStatus === "membership_required") {
    return <MembershipRequiredNav />;
  }

  return <PendingNav />;
}
