import { SidebarInset, SidebarProvider } from "@geho/ui/components/sidebar";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { DashboardHeader } from "@/components/dashboard-header";
import { DashboardSidebar } from "@/components/dashboard-sidebar";

export const Route = createFileRoute("/_app")({
  beforeLoad: ({ context }) => {
    const session = context.auth.data;

    if (!session) {
      throw redirect({
        to: "/sign-in",
      });
    }

    return { session };
  },
  component: AppLayout,
});

function AppLayout() {
  return (
    <SidebarProvider>
      <DashboardSidebar />
      <SidebarInset>
        <DashboardHeader />
        <div className="flex-1 px-4 pb-4 lg:px-6 lg:pb-6">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
