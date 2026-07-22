import { ResponsiveDialog } from "@geho/ui/components/responsive-dialog";
import { useIsMobile } from "@geho/ui/hooks/use-mobile";
import { CreateModelProviderForm } from "@/components/forms/create-model-provider-form";

type CreateModelProviderDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
};

export const CreateModelProviderDialog = ({
  open,
  onOpenChange,
  organizationId,
}: CreateModelProviderDialogProps) => {
  const isMobile = useIsMobile();

  return (
    <ResponsiveDialog
      description="Add credentials for one model capability."
      onOpenChange={onOpenChange}
      open={open}
      title="Add model"
    >
      <CreateModelProviderForm
        className={isMobile ? "px-4" : undefined}
        onSuccess={() => onOpenChange(false)}
        organizationId={organizationId}
      />
    </ResponsiveDialog>
  );
};
