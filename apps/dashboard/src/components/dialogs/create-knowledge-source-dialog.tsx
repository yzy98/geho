import { ResponsiveDialog } from "@heho/ui/components/responsive-dialog";
import { useIsMobile } from "@heho/ui/hooks/use-mobile";
import { CreateKnowledgeSourceForm } from "../forms/create-knowledge-source-form";

type CreateKnowledgeSourceDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  knowledgeBaseId: string;
};

export const CreateKnowledgeSourceDialog = ({
  open,
  onOpenChange,
  organizationId,
  knowledgeBaseId,
}: CreateKnowledgeSourceDialogProps) => {
  const isMobile = useIsMobile();

  return (
    <ResponsiveDialog
      description="Paste text content. Processing starts after the source is created."
      onOpenChange={onOpenChange}
      open={open}
      title="Add text source"
    >
      <CreateKnowledgeSourceForm
        className={isMobile ? "px-4" : undefined}
        knowledgeBaseId={knowledgeBaseId}
        onSuccess={() => onOpenChange(false)}
        organizationId={organizationId}
      />
    </ResponsiveDialog>
  );
};
