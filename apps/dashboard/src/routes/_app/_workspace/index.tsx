import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@geho/ui/components/alert";
import { Badge } from "@geho/ui/components/badge";
import { Button } from "@geho/ui/components/button";
import {
  Card,
  CardAction,
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
  Link,
  linkOptions,
} from "@tanstack/react-router";
import {
  AlertTriangleIcon,
  ArrowRightIcon,
  BotIcon,
  BrainCircuitIcon,
  CheckIcon,
  CircleDashedIcon,
  FileTextIcon,
  KeyRoundIcon,
  PlusIcon,
  UsersIcon,
} from "lucide-react";
import { workspaceOverviewQueryOptions } from "@/queries/workspace-overview";
import type { DashboardBreadcrumbContext } from "@/routes/__root";

type SetupStepStatus = "complete" | "in_progress" | "up_next";

const ingestionStatusPresentation = {
  empty: {
    label: "No sources",
    variant: "outline",
  },
  processing: {
    label: "Processing",
    variant: "outline",
  },
  ready: {
    label: "Ready",
    variant: "default",
  },
  needs_attention: {
    label: "Needs attention",
    variant: "destructive",
  },
} as const;

const getSetupStepStatus = ({
  complete,
  started,
}: {
  complete: boolean;
  started: boolean;
}): SetupStepStatus => {
  if (complete) {
    return "complete";
  }

  return started ? "in_progress" : "up_next";
};

const getSourceDescription = ({
  failed,
  processing,
}: {
  failed: number;
  processing: number;
}) => {
  if (failed > 0) {
    return `${failed} need attention`;
  }

  if (processing > 0) {
    return `${processing} processing`;
  }

  return "Across all knowledge bases";
};

export const Route = createFileRoute("/_app/_workspace/")({
  context: ({ context }): DashboardBreadcrumbContext => ({
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
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(
      workspaceOverviewQueryOptions(context.organization.id)
    ),
  pendingComponent: OverviewPending,
  errorComponent: OverviewError,
  component: HomePage,
});

function HomePage() {
  const { organization, session } = Route.useRouteContext();
  const {
    data: { overview },
  } = useSuspenseQuery(workspaceOverviewQueryOptions(organization.id));

  const stats = [
    {
      label: "Knowledge bases",
      value: overview.stats.knowledgeBaseCount,
      description: "Collections ready for retrieval",
      icon: BrainCircuitIcon,
    },
    {
      label: "Ready sources",
      value: overview.stats.sources.ready,
      description: getSourceDescription(overview.stats.sources),
      icon: FileTextIcon,
    },
    {
      label: "Chatbots",
      value: overview.stats.chatbotCount,
      description: "Published and ready to share",
      icon: BotIcon,
    },
    {
      label: "Team members",
      value: overview.stats.memberCount,
      description: "Members in this workspace",
      icon: UsersIcon,
    },
  ];

  const setupSteps = [
    {
      title: "Connect a model",
      description: "Add chat and embedding models for your workspace.",
      status: getSetupStepStatus({
        complete:
          overview.setup.hasChatModel && overview.setup.hasEmbeddingModel,
        started:
          overview.setup.hasChatModel || overview.setup.hasEmbeddingModel,
      }),
      to: "/models" as const,
    },
    {
      title: "Add knowledge",
      description: "Create a knowledge base and add your source material.",
      status: getSetupStepStatus({
        complete: overview.setup.hasReadySource,
        started: overview.setup.hasKnowledgeBase,
      }),
      to: "/knowledge-bases" as const,
    },
    {
      title: "Create a chatbot",
      description: "Configure and publish an assistant for your website.",
      status: getSetupStepStatus({
        complete: overview.setup.hasChatbot,
        started: false,
      }),
      to: "/chatbots" as const,
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="flex flex-col gap-1">
          <p className="text-muted-foreground text-sm">
            {overview.workspaceName}
          </p>
          <h1 className="font-heading font-medium text-2xl tracking-tight">
            Welcome back, {session.user.name}
          </h1>
          <p className="text-muted-foreground text-sm">
            Here is what is happening across your workspace.
          </p>
        </div>

        <Button nativeButton={false} render={<Link to="/chatbots" />} size="lg">
          <PlusIcon data-icon="inline-start" />
          Create chatbot
        </Button>
      </section>

      <section className="grid gap-px bg-border sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <Card className="bg-background" key={stat.label}>
              <CardHeader>
                <CardDescription className="flex items-center gap-2">
                  <Icon />
                  {stat.label}
                </CardDescription>
                <CardTitle className="font-heading text-3xl tracking-tight">
                  {stat.value}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-xs">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Continue setting up</CardTitle>
            <CardDescription>
              Complete these steps to launch your first chatbot.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            {setupSteps.map((step) => (
              <Link
                className="group flex items-center gap-3 px-2 py-3 transition-colors hover:bg-muted"
                key={step.title}
                to={step.to}
              >
                <SetupStepIcon status={step.status} />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-sm">
                    {step.title}
                  </span>
                  <span className="block text-muted-foreground text-xs">
                    {step.description}
                  </span>
                </span>
                <ArrowRightIcon className="text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick actions</CardTitle>
            <CardDescription>
              Build out your workspace with the essentials.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button
              className="justify-start"
              nativeButton={false}
              render={<Link to="/knowledge-bases" />}
              variant="outline"
            >
              <FileTextIcon data-icon="inline-start" />
              Add knowledge source
            </Button>
            <Button
              className="justify-start"
              nativeButton={false}
              render={<Link to="/models" />}
              variant="outline"
            >
              <KeyRoundIcon data-icon="inline-start" />
              Manage models
            </Button>
            <Button
              className="justify-start"
              nativeButton={false}
              render={<Link to="/members" />}
              variant="outline"
            >
              <UsersIcon data-icon="inline-start" />
              Invite teammate
            </Button>
          </CardContent>
        </Card>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between gap-4">
          <div>
            <h2 className="font-heading font-medium text-base">
              Recent knowledge bases
            </h2>
            <p className="text-muted-foreground text-sm">
              Your most recently created knowledge collections.
            </p>
          </div>
          <Button
            nativeButton={false}
            render={<Link to="/knowledge-bases" />}
            variant="ghost"
          >
            View all
            <ArrowRightIcon data-icon="inline-end" />
          </Button>
        </div>

        <div className="grid gap-px bg-border md:grid-cols-2">
          {overview.recentKnowledgeBases.map((knowledgeBase) => {
            const status =
              ingestionStatusPresentation[knowledgeBase.ingestionStatus];

            return (
              <Card className="bg-background" key={knowledgeBase.id}>
                <CardHeader>
                  <CardTitle>{knowledgeBase.name}</CardTitle>
                  <CardAction>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </CardAction>
                  <CardDescription>
                    {knowledgeBase.sourceCount} sources
                  </CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function SetupStepIcon({ status }: { status: SetupStepStatus }) {
  if (status === "complete") {
    return (
      <span className="flex size-7 shrink-0 items-center justify-center bg-primary text-primary-foreground">
        <CheckIcon />
      </span>
    );
  }

  if (status === "in_progress") {
    return (
      <span className="flex size-7 shrink-0 items-center justify-center border border-primary text-primary">
        <CircleDashedIcon />
      </span>
    );
  }

  return (
    <span className="flex size-7 shrink-0 items-center justify-center border border-border text-muted-foreground">
      <BotIcon />
    </span>
  );
}

function OverviewPending() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Skeleton className="h-36" />
        <Skeleton className="h-36" />
        <Skeleton className="h-36" />
        <Skeleton className="h-36" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
    </div>
  );
}

function OverviewError({ error, reset }: ErrorComponentProps) {
  return (
    <Alert variant="destructive">
      <AlertTriangleIcon />
      <AlertTitle>Unable to load workspace overview</AlertTitle>
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
