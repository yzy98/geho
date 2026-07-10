import { ResponsiveDialog } from "@heho/ui/components/responsive-dialog";
import { useIsMobile } from "@heho/ui/hooks/use-mobile";
import type { LlmProvider } from "@/queries/llm-provider";
import { CreateKnowledgeBaseForm } from "../forms/create-knowledge-base-form";

type CreateKnowledgeBaseDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  providers: LlmProvider[];
};

export const CreateKnowledgeBaseDialog = ({
  open,
  onOpenChange,
  organizationId,
  providers,
}: CreateKnowledgeBaseDialogProps) => {
  const isMobile = useIsMobile();

  return (
    <ResponsiveDialog
      description="Configure a reusable collection of knowledge sources for your chatbots."
      onOpenChange={onOpenChange}
      open={open}
      title="Add knowledge base"
    >
      <CreateKnowledgeBaseForm
        className={isMobile ? "px-4" : undefined}
        onSuccess={() => onOpenChange(false)}
        organizationId={organizationId}
        providers={providers}
      />
    </ResponsiveDialog>
  );
};
