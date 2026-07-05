import { createFileRoute, linkOptions } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/_workspace/")({
  context: ({ context }) => ({
    breadcrumbs: [
      ...context.breadcrumbs,
      {
        id: "overview",
        label: "Overview",
        linkOptions: linkOptions({
          to: "/",
        }),
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { session, organization } = Route.useRouteContext();

  return (
    <div className="space-y-6">
      <div>
        <p>{session.user.name}</p>
        <p>{session.user.email}</p>
      </div>

      <div className="space-y-3">
        <pre className="rounded-md bg-muted p-4 text-sm">
          {JSON.stringify(organization, null, 2)}
        </pre>
      </div>
    </div>
  );
}
