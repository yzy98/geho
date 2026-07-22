import { ResponsiveDialog } from "@geho/ui/components/responsive-dialog";
import { useIsMobile } from "@geho/ui/hooks/use-mobile";
import type { ModelProvider } from "@/queries/model-provider";
import { CreateKnowledgeBaseForm } from "../forms/create-knowledge-base-form";

type CreateKnowledgeBaseDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  embeddingModels: ModelProvider[];
};

export const CreateKnowledgeBaseDialog = ({
  open,
  onOpenChange,
  organizationId,
  embeddingModels,
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
        embeddingModels={embeddingModels}
        onSuccess={() => onOpenChange(false)}
        organizationId={organizationId}
      />
    </ResponsiveDialog>
  );
};
