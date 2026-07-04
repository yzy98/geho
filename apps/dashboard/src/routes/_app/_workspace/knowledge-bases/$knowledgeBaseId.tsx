import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { knowledgeBaseDetailsQueryOptions } from "@/queries/knowledge-base";

export const Route = createFileRoute(
  "/_app/_workspace/knowledge-bases/$knowledgeBaseId"
)({
  staticData: {
    breadcrumb: "Knowledge Base",
  },
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(
      knowledgeBaseDetailsQueryOptions(
        context.organization.id,
        params.knowledgeBaseId
      )
    ),
  pendingComponent: KnowledgeBaseDetailsPending,
  errorComponent: KnowledgeBaseDetailsError,
  component: KnowledgeBaseDetailsPage,
});

function KnowledgeBaseDetailsPage() {
  const { knowledgeBaseId } = Route.useParams();
  const { organization } = Route.useRouteContext();

  const {
    data: { knowledgeBase },
  } = useSuspenseQuery(
    knowledgeBaseDetailsQueryOptions(organization.id, knowledgeBaseId)
  );

  return <div>{JSON.stringify(knowledgeBase)}</div>;
}

function KnowledgeBaseDetailsError() {
  return <div>ERROR</div>;
}

function KnowledgeBaseDetailsPending() {
  return <div>PENDING</div>;
}
