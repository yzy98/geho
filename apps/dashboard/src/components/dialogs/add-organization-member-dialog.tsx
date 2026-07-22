import { ResponsiveDialog } from "@geho/ui/components/responsive-dialog";
import { useIsMobile } from "@geho/ui/hooks/use-mobile";
import { AddOrganizationMemberForm } from "@/components/forms/add-organization-member-form";

type AddOrganizationMemberDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
};

export const AddOrganizationMemberDialog = ({
  open,
  onOpenChange,
  organizationId,
}: AddOrganizationMemberDialogProps) => {
  const isMobile = useIsMobile();

  return (
    <ResponsiveDialog
      description="Add a member to your organization."
      onOpenChange={onOpenChange}
      open={open}
      title="Add member"
    >
      <AddOrganizationMemberForm
        className={isMobile ? "px-4" : undefined}
        onSuccess={() => onOpenChange(false)}
        organizationId={organizationId}
      />
    </ResponsiveDialog>
  );
};
