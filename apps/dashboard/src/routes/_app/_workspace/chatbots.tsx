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
} from "@tanstack/react-router";
import { AlertTriangleIcon, KeyRoundIcon, PlusIcon } from "lucide-react";
import { useState } from "react";
import { CreateChatDialog } from "@/components/dialogs/create-chatbot-dialog";
import { ManageChatbotEmbedKeysDialog } from "@/components/dialogs/manage-chatbot-embed-keys-dialog";
import { hasOwnerRole } from "@/lib/utils";
import { type Chatbot, chatbotsQueryOptions } from "@/queries/chatbot";
import {
  type KnowledgeBase,
  knowledgeBasesQueryOptions,
} from "@/queries/knowledge-base";
import {
  type LlmProvider,
  llmProvidersQueryOptions,
} from "@/queries/llm-provider";

export const Route = createFileRoute("/_app/_workspace/chatbots")({
  staticData: {
    breadcrumb: "Chatbots",
  },
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(
        chatbotsQueryOptions(context.organization.id)
      ),
      context.queryClient.ensureQueryData(
        llmProvidersQueryOptions(context.organization.id)
      ),
      context.queryClient.ensureQueryData(
        knowledgeBasesQueryOptions(context.organization.id)
      ),
    ]),
  pendingComponent: ChatbotsPending,
  errorComponent: ChatbotsError,
  component: ChatbotsPage,
});

function ChatbotsPage() {
  const [createChatbotDialogOpen, setCreateChatbotDialogOpen] = useState(false);
  const [managedChatbot, setManagedChatbot] = useState<Chatbot | null>(null);

  const { organization } = Route.useRouteContext();
  const {
    data: { chatbots },
  } = useSuspenseQuery(chatbotsQueryOptions(organization.id));
  const {
    data: { providers },
  } = useSuspenseQuery(llmProvidersQueryOptions(organization.id));
  const {
    data: { knowledgeBases },
  } = useSuspenseQuery(knowledgeBasesQueryOptions(organization.id));

  const canCreate = hasOwnerRole(organization.role);

  return (
    <>
      <div className="mb-4 flex items-start justify-between gap-4">
        <p className="text-muted-foreground text-sm">
          Configure your chatbots.
        </p>
        {canCreate && (
          <Button onClick={() => setCreateChatbotDialogOpen(true)}>
            <PlusIcon data-icon="inline-start" />
            Add chatbot
          </Button>
        )}
      </div>

      {chatbots.length === 0 ? (
        <ChatbotsEmptyAlert canCreate={canCreate} />
      ) : (
        <ChatbotList
          chatbots={chatbots}
          knowledgeBases={knowledgeBases}
          onManageEmbedKeys={setManagedChatbot}
          providers={providers}
        />
      )}

      {canCreate && (
        <CreateChatDialog
          knowledgeBases={knowledgeBases}
          onOpenChange={setCreateChatbotDialogOpen}
          open={createChatbotDialogOpen}
          organizationId={organization.id}
          providers={providers}
        />
      )}

      {managedChatbot && (
        <ManageChatbotEmbedKeysDialog
          canCreate={canCreate}
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
          : "The organization owner must create the first chatbot."}
      </AlertDescription>
    </Alert>
  );
}

type ChatbotListProps = {
  chatbots: Chatbot[];
  providers: LlmProvider[];
  knowledgeBases: KnowledgeBase[];
  onManageEmbedKeys: (chatbot: Chatbot) => void;
};

function ChatbotList({
  chatbots,
  providers,
  knowledgeBases,
  onManageEmbedKeys,
}: ChatbotListProps) {
  const providersById = new Map(
    providers.map((provider) => [provider.id, provider])
  );
  const knowledgeBasesById = new Map(
    knowledgeBases.map((knowledgeBase) => [knowledgeBase.id, knowledgeBase])
  );

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {chatbots.map((chatbot) => (
        <ChatbotCard
          chatbot={chatbot}
          chatProvider={providersById.get(chatbot.chatProviderId)}
          key={chatbot.id}
          knowledgeBase={knowledgeBasesById.get(chatbot.knowledgeBaseId)}
          onManageEmbedKeys={onManageEmbedKeys}
        />
      ))}
    </div>
  );
}

type ChatbotCardProps = {
  chatbot: Chatbot;
  chatProvider: LlmProvider | undefined;
  knowledgeBase: KnowledgeBase | undefined;
  onManageEmbedKeys: (chatbot: Chatbot) => void;
};

function ChatbotCard({
  chatbot,
  chatProvider,
  knowledgeBase,
  onManageEmbedKeys,
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
          <dt className="text-muted-foreground">Chat provider</dt>
          <dd className="truncate text-right">
            {formatProvider(chatProvider)}
          </dd>
          <dt className="text-muted-foreground">Knowledge base</dt>
          <dd
            className="truncate text-right"
            title={knowledgeBase?.name ?? "Knowledge base missing"}
          >
            {knowledgeBase?.name ?? "Knowledge base missing"}
          </dd>
        </dl>
      </CardContent>

      <CardFooter>
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

function formatProvider(provider?: LlmProvider) {
  if (!provider) {
    return "Provider missing";
  }

  return `${provider.name} · ${provider.provider} · ${provider.model}`;
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
