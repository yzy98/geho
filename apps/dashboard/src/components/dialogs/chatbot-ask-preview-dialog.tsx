import { ResponsiveDialog } from "@geho/ui/components/responsive-dialog";
import { useIsMobile } from "@geho/ui/hooks/use-mobile";
import { ChatbotAskPreviewForm } from "@/components/forms/chatbot-ask-preview-form";
import type { Chatbot } from "@/queries/chatbot";

type ChatbotAskPreviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chatbot: Chatbot;
};

export const ChatbotAskPreviewDialog = ({
  chatbot,
  open,
  onOpenChange,
}: ChatbotAskPreviewDialogProps) => {
  const isMobile = useIsMobile();

  return (
    <ResponsiveDialog
      description={`Test ${chatbot.name} with a single question.`}
      onOpenChange={onOpenChange}
      open={open}
      title="Test chatbot"
    >
      <ChatbotAskPreviewForm
        chatbotId={chatbot.id}
        className={isMobile ? "px-4" : undefined}
      />
    </ResponsiveDialog>
  );
};
