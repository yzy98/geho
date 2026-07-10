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
import {
  AlertTriangleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "lucide-react";
import { type ComponentProps, useState } from "react";
import z from "zod";
import {
  type RetrievalPreviewChunk,
  retrievalPreviewMutationOptions,
} from "@/queries/knowledge-retrieval";

const CHUNK_PREVIEW_LENGTH = 600;

const retrievalPreviewFormSchema = z.object({
  query: z
    .string()
    .trim()
    .min(1, "Query is required")
    .max(2000, "Query is too long"),
  limit: z.number().int().min(1).max(20).optional(),
  minSimilarity: z.number().min(0).max(1).optional(),
});

type RetrievalPreviewFormShemaValues = z.infer<
  typeof retrievalPreviewFormSchema
>;

type RetrievalPreviewFormProps = Omit<ComponentProps<"form">, "onSubmit"> & {
  knowledgeBaseId: string;
};

export const RetrievalPreviewForm = ({
  knowledgeBaseId,
  ...formProps
}: RetrievalPreviewFormProps) => {
  const mutation = useMutation({
    ...retrievalPreviewMutationOptions(knowledgeBaseId),
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const form = useForm({
    defaultValues: {
      query: "",
    } satisfies RetrievalPreviewFormShemaValues,
    validators: {
      onBlur: retrievalPreviewFormSchema,
      onSubmit: retrievalPreviewFormSchema,
    },
    onSubmit: async ({ value }) => {
      const input = retrievalPreviewFormSchema.parse(value);

      mutation.reset();

      await mutation.mutateAsync(input);

      toast.success("Chunks retrieved.");
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <form
        {...formProps}
        id="retrieval-preview-form"
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
                <form.Field name="query">
                  {(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && !field.state.meta.isValid;

                    return (
                      <Field
                        className="max-h-48 overflow-y-auto"
                        data-invalid={isInvalid}
                      >
                        <FieldLabel htmlFor={field.name}>Query</FieldLabel>
                        <Textarea
                          aria-invalid={isInvalid}
                          id={field.name}
                          name={field.name}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          placeholder="Ask a question to preview retrieved chunks..."
                          required
                          rows={3}
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
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-muted-foreground text-xs">
                        Returns chunks only, not an AI answer.
                      </p>
                      <Button
                        className="sm:w-fit"
                        disabled={!canSubmit || submitting}
                        form="retrieval-preview-form"
                        type="submit"
                      >
                        {submitting && <Spinner data-icon="inline-start" />}
                        {submitting ? "Searching..." : "Preview retrieval"}
                      </Button>
                    </div>
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
          <AlertTitle>Unable to preview retrieval</AlertTitle>
          <AlertDescription>{mutation.error.message}</AlertDescription>
        </Alert>
      ) : null}

      {mutation.data ? (
        <RetrievalPreviewResults chunks={mutation.data.chunks} />
      ) : null}
    </div>
  );
};

function RetrievalPreviewResults({
  chunks,
}: {
  chunks: RetrievalPreviewChunk[];
}) {
  const [expandedChunkIds, setExpandedChunkIds] = useState<Set<string>>(
    () => new Set()
  );

  const toggleChunk = (chunkId: string) => {
    setExpandedChunkIds((current) => {
      const next = new Set(current);

      if (next.has(chunkId)) {
        next.delete(chunkId);
      } else {
        next.add(chunkId);
      }

      return next;
    });
  };

  if (chunks.length === 0) {
    return (
      <Alert>
        <AlertTriangleIcon />
        <AlertTitle>No chunks matched</AlertTitle>
        <AlertDescription>
          Try another query or add ready sources with relevant content.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-medium text-sm">Retrieved chunks</h3>
        <Badge variant="outline">{chunks.length} results</Badge>
      </div>

      {chunks.map((chunk) => {
        const expanded = expandedChunkIds.has(chunk.chunkId);
        const longContent = chunk.content.length > CHUNK_PREVIEW_LENGTH;
        const content =
          expanded || !longContent
            ? chunk.content
            : `${chunk.content.slice(0, CHUNK_PREVIEW_LENGTH).trimEnd()}...`;

        return (
          <div className="border p-3" key={chunk.chunkId}>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="font-medium text-sm">{chunk.sourceTitle}</span>
              <Badge variant="outline">Chunk {chunk.chunkIndex + 1}</Badge>
              <Badge variant="secondary">
                {Math.round(chunk.similarity * 100)}%
              </Badge>
            </div>

            <div className="max-h-80 overflow-y-auto bg-muted/30 p-3">
              <p className="whitespace-pre-wrap text-sm">{content}</p>
            </div>

            {longContent ? (
              <Button
                className="mt-2"
                onClick={() => toggleChunk(chunk.chunkId)}
                size="xs"
                type="button"
                variant="ghost"
              >
                {expanded ? (
                  <ChevronUpIcon data-icon="inline-start" />
                ) : (
                  <ChevronDownIcon data-icon="inline-start" />
                )}
                {expanded ? "Collapse" : "Show full chunk"}
              </Button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
