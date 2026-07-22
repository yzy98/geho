import { ResponsiveDialog } from "@geho/ui/components/responsive-dialog";
import { useIsMobile } from "@geho/ui/hooks/use-mobile";
import { CreateChatbotForm } from "@/components/forms/create-chatbot-form";
import type { KnowledgeBase } from "@/queries/knowledge-base";
import type { ModelProvider } from "@/queries/model-provider";

type CreateChatDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  models: ModelProvider[];
  knowledgeBases: KnowledgeBase[];
};

export const CreateChatDialog = ({
  open,
  onOpenChange,
  organizationId,
  models,
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
        models={models}
        onSuccess={() => onOpenChange(false)}
        organizationId={organizationId}
      />
    </ResponsiveDialog>
  );
};
