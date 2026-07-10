import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@heho/ui/components/alert";
import { Button } from "@heho/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@heho/ui/components/card";
import { Skeleton } from "@heho/ui/components/skeleton";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  createFileRoute,
  type ErrorComponentProps,
  linkOptions,
} from "@tanstack/react-router";
import {
  AlertTriangleIcon,
  BotMessageSquareIcon,
  KeyRoundIcon,
  PlusIcon,
} from "lucide-react";
import { useState } from "react";
import { ChatbotAskPreviewDialog } from "@/components/dialogs/chatbot-ask-preview-dialog";
import { CreateChatDialog } from "@/components/dialogs/create-chatbot-dialog";
import { ManageChatbotEmbedKeysDialog } from "@/components/dialogs/manage-chatbot-embed-keys-dialog";
import { useOrganizationPermission } from "@/hooks/use-organization-permission";
import { type Chatbot, chatbotsQueryOptions } from "@/queries/chatbot";
import {
  type KnowledgeBase,
  knowledgeBasesQueryOptions,
} from "@/queries/knowledge-base";
import {
  type ModelProvider,
  modelProvidersQueryOptions,
} from "@/queries/model-provider";
import { organizationPermissionQueryOptions } from "@/queries/organization-permission";
import type { DashboardBreadcrumbContext } from "@/routes/__root";

export const Route = createFileRoute("/_app/_workspace/chatbots")({
  context: ({ context }): DashboardBreadcrumbContext => ({
    breadcrumbs: [
      ...context.breadcrumbs,
      {
        id: "chatbots",
        label: "Chatbots",
        linkOptions: linkOptions({
          to: "/chatbots",
        }),
      },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(
        chatbotsQueryOptions(context.organization.id)
      ),
      context.queryClient.ensureQueryData(
        modelProvidersQueryOptions(context.organization.id)
      ),
      context.queryClient.ensureQueryData(
        knowledgeBasesQueryOptions(context.organization.id)
      ),
      context.queryClient.ensureQueryData(
        organizationPermissionQueryOptions(
          context.organization.id,
          "createChatbot"
        )
      ),
      context.queryClient.ensureQueryData(
        organizationPermissionQueryOptions(
          context.organization.id,
          "createEmbedKey"
        )
      ),
    ]),
  pendingComponent: ChatbotsPending,
  errorComponent: ChatbotsError,
  component: ChatbotsPage,
});

function ChatbotsPage() {
  const [createChatbotDialogOpen, setCreateChatbotDialogOpen] = useState(false);
  const [managedChatbot, setManagedChatbot] = useState<Chatbot | null>(null);
  const [previewedChatbot, setPreviewedChatbot] = useState<Chatbot | null>(
    null
  );

  const { organization } = Route.useRouteContext();
  const {
    data: { chatbots },
  } = useSuspenseQuery(chatbotsQueryOptions(organization.id));
  const {
    data: { modelProviders: models },
  } = useSuspenseQuery(modelProvidersQueryOptions(organization.id));
  const {
    data: { knowledgeBases },
  } = useSuspenseQuery(knowledgeBasesQueryOptions(organization.id));

  const canCreateChatbot = useOrganizationPermission("createChatbot");
  const canCreateEmbedKey = useOrganizationPermission("createEmbedKey");

  return (
    <>
      <div className="mb-4 flex items-start justify-between gap-4">
        <p className="text-muted-foreground text-sm">
          Configure your chatbots.
        </p>
        {canCreateChatbot && (
          <Button onClick={() => setCreateChatbotDialogOpen(true)}>
            <PlusIcon data-icon="inline-start" />
            Add chatbot
          </Button>
        )}
      </div>

      {chatbots.length === 0 ? (
        <ChatbotsEmptyAlert canCreate={canCreateChatbot} />
      ) : (
        <ChatbotList
          chatbots={chatbots}
          knowledgeBases={knowledgeBases}
          models={models}
          onManageEmbedKeys={setManagedChatbot}
          onPreviewChatbot={setPreviewedChatbot}
        />
      )}

      {canCreateChatbot && (
        <CreateChatDialog
          knowledgeBases={knowledgeBases}
          models={models}
          onOpenChange={setCreateChatbotDialogOpen}
          open={createChatbotDialogOpen}
          organizationId={organization.id}
        />
      )}

      {managedChatbot && (
        <ManageChatbotEmbedKeysDialog
          canCreate={canCreateEmbedKey}
          chatbot={managedChatbot}
          onOpenChange={(open) => {
            if (!open) {
              setManagedChatbot(null);
            }
          }}
          open
          organizationId={organization.id}
        />
      )}

      {previewedChatbot && (
        <ChatbotAskPreviewDialog
          chatbot={previewedChatbot}
          onOpenChange={(open) => {
            if (!open) {
              setPreviewedChatbot(null);
            }
          }}
          open
        />
      )}
    </>
  );
}

function ChatbotsEmptyAlert({ canCreate }: { canCreate: boolean }) {
  return (
    <Alert>
      <AlertTriangleIcon />
      <AlertTitle>No chatbots configured</AlertTitle>
      <AlertDescription>
        {canCreate
          ? "Create your first chatbot."
          : "You do not have permission to create chatbots."}
      </AlertDescription>
    </Alert>
  );
}

type ChatbotListProps = {
  chatbots: Chatbot[];
  models: ModelProvider[];
  knowledgeBases: KnowledgeBase[];
  onManageEmbedKeys: (chatbot: Chatbot) => void;
  onPreviewChatbot: (chatbot: Chatbot) => void;
};

function ChatbotList({
  chatbots,
  models,
  knowledgeBases,
  onManageEmbedKeys,
  onPreviewChatbot,
}: ChatbotListProps) {
  const modelsById = new Map(models.map((model) => [model.id, model]));
  const knowledgeBasesById = new Map(
    knowledgeBases.map((knowledgeBase) => [knowledgeBase.id, knowledgeBase])
  );

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {chatbots.map((chatbot) => (
        <ChatbotCard
          chatbot={chatbot}
          chatModel={modelsById.get(chatbot.chatProviderId)}
          key={chatbot.id}
          knowledgeBase={knowledgeBasesById.get(chatbot.knowledgeBaseId)}
          onManageEmbedKeys={onManageEmbedKeys}
          onPreviewChatbot={onPreviewChatbot}
        />
      ))}
    </div>
  );
}

type ChatbotCardProps = {
  chatbot: Chatbot;
  chatModel: ModelProvider | undefined;
  knowledgeBase: KnowledgeBase | undefined;
  onManageEmbedKeys: (chatbot: Chatbot) => void;
  onPreviewChatbot: (chatbot: Chatbot) => void;
};

function ChatbotCard({
  chatbot,
  chatModel,
  knowledgeBase,
  onManageEmbedKeys,
  onPreviewChatbot,
}: ChatbotCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{chatbot.name}</CardTitle>
        <CardDescription className="line-clamp-2">
          {chatbot.systemInstructions}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
          <dt className="text-muted-foreground">Chat model</dt>
          <dd className="truncate text-right">{formatModel(chatModel)}</dd>
          <dt className="text-muted-foreground">Knowledge base</dt>
          <dd
            className="truncate text-right"
            title={knowledgeBase?.name ?? "Knowledge base missing"}
          >
            {knowledgeBase?.name ?? "Knowledge base missing"}
          </dd>
        </dl>
      </CardContent>

      <CardFooter className="flex flex-wrap gap-2">
        <Button
          onClick={() => onPreviewChatbot(chatbot)}
          size="sm"
          type="button"
          variant="default"
        >
          <BotMessageSquareIcon data-icon="inline-start" />
          Test
        </Button>

        <Button
          onClick={() => onManageEmbedKeys(chatbot)}
          size="sm"
          type="button"
          variant="outline"
        >
          <KeyRoundIcon data-icon="inline-start" />
          Manage embed keys
        </Button>
      </CardFooter>
    </Card>
  );
}

function formatModel(model?: ModelProvider) {
  if (!model) {
    return "Model missing";
  }

  return `${model.name} · ${model.provider} · ${model.modelId}`;
}

function ChatbotsPending() {
  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-2">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    </div>
  );
}

function ChatbotsError({ error, reset }: ErrorComponentProps) {
  return (
    <Alert variant="destructive">
      <AlertTriangleIcon />
      <AlertTitle>Unable to load chatbots</AlertTitle>
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
