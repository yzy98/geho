import { Alert, AlertDescription, AlertTitle } from "@heho/ui/components/alert";
import { Badge } from "@heho/ui/components/badge";
import { Button } from "@heho/ui/components/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@heho/ui/components/field";
import { toast } from "@heho/ui/components/sonner";
import { Spinner } from "@heho/ui/components/spinner";
import { Textarea } from "@heho/ui/components/textarea";
import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { AlertTriangleIcon, BotMessageSquareIcon } from "lucide-react";
import type { ComponentProps } from "react";
import z from "zod";
import {
  type AskChatbotPreviewCitation,
  askChatbotPreviewMutationOptions,
} from "@/queries/chatbot-ask-preview";

const askPreviewFormSchema = z.object({
  question: z
    .string()
    .trim()
    .min(1, "Question is required")
    .max(2000, "Question is too long"),
});

type AskPreviewFormValues = z.infer<typeof askPreviewFormSchema>;

type ChatbotAskPreviewFormProps = Omit<ComponentProps<"form">, "onSubmit"> & {
  chatbotId: string;
};

export const ChatbotAskPreviewForm = ({
  chatbotId,
  ...formProps
}: ChatbotAskPreviewFormProps) => {
  const formId = `chatbot-ask-preview-form-${chatbotId}`;

  const mutation = useMutation({
    ...askChatbotPreviewMutationOptions(chatbotId),
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const form = useForm({
    defaultValues: {
      question: "",
    } satisfies AskPreviewFormValues,
    validators: {
      onBlur: askPreviewFormSchema,
      onSubmit: askPreviewFormSchema,
    },
    onSubmit: async ({ value }) => {
      const input = askPreviewFormSchema.parse(value);

      mutation.reset();
      await mutation.mutateAsync(input);

      toast.success("Answer generated.");
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <form
        {...formProps}
        id={formId}
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
      >
        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(isSubmitting) => (
            <FieldSet disabled={isSubmitting}>
              <FieldGroup>
                <form.Field name="question">
                  {(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && !field.state.meta.isValid;

                    return (
                      <Field
                        className="max-h-48 overflow-y-auto"
                        data-invalid={isInvalid}
                      >
                        <FieldLabel htmlFor={field.name}>Question</FieldLabel>
                        <Textarea
                          aria-invalid={isInvalid}
                          id={field.name}
                          name={field.name}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          placeholder="Ask a question to test this chatbot..."
                          required
                          rows={4}
                          value={field.state.value}
                        />
                        {isInvalid ? (
                          <FieldError errors={field.state.meta.errors} />
                        ) : null}
                      </Field>
                    );
                  }}
                </form.Field>

                <form.Subscribe
                  selector={(state) => [state.canSubmit, state.isSubmitting]}
                >
                  {([canSubmit, submitting]) => (
                    <Button
                      disabled={!canSubmit || submitting}
                      form={formId}
                      type="submit"
                    >
                      {submitting && <Spinner data-icon="inline-start" />}
                      {submitting ? "Generating..." : "Ask"}
                    </Button>
                  )}
                </form.Subscribe>
              </FieldGroup>
            </FieldSet>
          )}
        </form.Subscribe>
      </form>

      {mutation.isError ? (
        <Alert variant="destructive">
          <AlertTriangleIcon />
          <AlertTitle>Unable to test chatbot</AlertTitle>
          <AlertDescription>{mutation.error.message}</AlertDescription>
        </Alert>
      ) : null}

      {mutation.data ? (
        <AskPreviewResult
          answer={mutation.data.answer}
          citations={mutation.data.citations}
          traceId={mutation.data.traceId}
        />
      ) : null}
    </div>
  );
};

function AskPreviewResult({
  answer,
  citations,
  traceId,
}: {
  answer: string;
  citations: AskChatbotPreviewCitation[];
  traceId: string;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-md border p-4">
      <div className="flex items-center gap-2">
        <BotMessageSquareIcon className="size-4" />
        <h3 className="font-medium text-sm">Answer</h3>
      </div>

      <p className="whitespace-pre-wrap text-sm">{answer}</p>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <h4 className="font-medium text-sm">Citations</h4>
          <Badge variant="outline">{citations.length} cited</Badge>
        </div>

        {citations.length > 0 ? (
          <div className="flex flex-col gap-2">
            {citations.map((citation) => (
              <CitationItem citation={citation} key={citation.chunkId} />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            No retrieved chunks were cited.
          </p>
        )}
      </div>

      <p className="break-all text-muted-foreground text-xs">
        Trace ID: {traceId}
      </p>
    </div>
  );
}

function CitationItem({ citation }: { citation: AskChatbotPreviewCitation }) {
  return (
    <div className="rounded-md border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium text-sm">{citation.sourceTitle}</span>
        <Badge variant="outline">Chunk {citation.chunkIndex + 1}</Badge>
        <Badge variant="secondary">
          {Math.round(citation.similarity * 100)}%
        </Badge>
      </div>
      <p className="mt-1 break-all text-muted-foreground text-xs">
        {citation.chunkId}
      </p>
    </div>
  );
}
