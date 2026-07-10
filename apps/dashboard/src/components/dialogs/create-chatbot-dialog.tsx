import { ResponsiveDialog } from "@heho/ui/components/responsive-dialog";
import { useIsMobile } from "@heho/ui/hooks/use-mobile";
import { CreateChatbotForm } from "@/components/forms/create-chatbot-form";
import type { KnowledgeBase } from "@/queries/knowledge-base";
import type { LlmProvider } from "@/queries/llm-provider";

type CreateChatDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  providers: LlmProvider[];
  knowledgeBases: KnowledgeBase[];
};

export const CreateChatDialog = ({
  open,
  onOpenChange,
  organizationId,
  providers,
  knowledgeBases,
}: CreateChatDialogProps) => {
  const isMobile = useIsMobile();

  return (
    <ResponsiveDialog
      description="Configure a chatbot for your organization."
      onOpenChange={onOpenChange}
      open={open}
      title="Add chatbot"
    >
      <CreateChatbotForm
        className={isMobile ? "px-4" : undefined}
        knowledgeBases={knowledgeBases}
        onSuccess={() => onOpenChange(false)}
        organizationId={organizationId}
        providers={providers}
      />
    </ResponsiveDialog>
  );
};
