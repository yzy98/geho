import { Toaster } from "@heho/ui/components/sonner";
import type { QueryClient } from "@tanstack/react-query";
import {
  type CreateLinkProps,
  createRootRouteWithContext,
  Outlet,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import type { authClient } from "@/lib/auth-client";

export type DashboardBreadcrumb = {
  id: string;
  label: string;
  linkOptions: Omit<CreateLinkProps, "children">;
};

export type DashboardBreadcrumbContext = {
  breadcrumbs: DashboardBreadcrumb[];
};

type RouterContext = DashboardBreadcrumbContext & {
  auth: ReturnType<typeof authClient.useSession>;
  queryClient: QueryClient;
};

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
});

function RootLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Toaster />
      <Outlet />
      {import.meta.env.DEV ? (
        <TanStackRouterDevtools position="bottom-right" />
      ) : null}
    </div>
  );
}
