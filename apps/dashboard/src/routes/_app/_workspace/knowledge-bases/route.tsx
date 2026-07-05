import { createFileRoute, linkOptions, Outlet } from "@tanstack/react-router";
import type { DashboardBreadcrumbContext } from "@/routes/__root";

export const Route = createFileRoute("/_app/_workspace/knowledge-bases")({
  context: ({ context }): DashboardBreadcrumbContext => ({
    breadcrumbs: [
      ...context.breadcrumbs,
      {
        id: "knowledge-bases",
        label: "Knowledge Bases",
        linkOptions: linkOptions({
          to: "/knowledge-bases",
        }),
      },
    ],
  }),
  component: KnowledgeBasesLayout,
});

function KnowledgeBasesLayout() {
  return <Outlet />;
}
