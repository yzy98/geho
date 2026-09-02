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
import { Link, useRouteContext } from "@tanstack/react-router";
import {
  BotIcon,
  BrainCircuitIcon,
  Building2Icon,
  KeyRoundIcon,
  LayoutDashboardIcon,
  UsersIcon,
} from "lucide-react";
import { organizationQueryOptions } from "@/queries/organization";
import { type Item, Main } from "./main";
import { User } from "./user";

export const DashboardSidebar = () => {
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
        <DashboardSidebarMain organizationStatus={organizationResult?.status} />
      </SidebarContent>
      <SidebarFooter>
        <User user={session.user} />
      </SidebarFooter>
    </Sidebar>
  );
};

function DashboardSidebarMain({
  organizationStatus,
}: {
  organizationStatus:
    | "error"
    | "membership_required"
    | "ok"
    | "onboarding_required"
    | undefined;
}) {
  let items: Item[] = [];

  if (organizationStatus === "ok") {
    items = [
      {
        title: "Overview",
        icon: LayoutDashboardIcon,
        path: "/",
      },
      {
        title: "Models",
        icon: KeyRoundIcon,
        path: "/models",
      },
      {
        title: "Knowledge Bases",
        icon: BrainCircuitIcon,
        path: "/knowledge-bases",
      },
      {
        title: "Chatbots",
        icon: BotIcon,
        path: "/chatbots",
      },
      {
        title: "Members",
        icon: UsersIcon,
        path: "/members",
      },
    ];
  } else if (organizationStatus === "onboarding_required") {
    items = [
      {
        title: "Onboarding",
        icon: Building2Icon,
        path: "/onboarding",
      },
    ];
  } else if (organizationStatus === "membership_required") {
    items = [
      {
        title: "Need invitation",
        icon: Building2Icon,
        path: "/onboarding",
      },
    ];
  }

  return <Main items={items} />;
}
