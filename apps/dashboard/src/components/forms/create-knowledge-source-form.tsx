import { Button } from "@heho/ui/components/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@heho/ui/components/field";
import { Input } from "@heho/ui/components/input";
import { toast } from "@heho/ui/components/sonner";
import { Spinner } from "@heho/ui/components/spinner";
import { Textarea } from "@heho/ui/components/textarea";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ComponentProps } from "react";
import z from "zod";
import { createKnowledgeSourceMutationOptions } from "@/queries/knowledge-source";

const createKnowledgeSourceFormSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Source title is required")
      .max(100, "Source title is too long"),
    content: z
      .string()
      .max(100_000, "Source content is too long")
      .refine((value) => value.trim().length > 0, {
        message: "Source content is required",
      }),
  })
  .strict();

type CreateKnowledgeSourceFormValues = z.infer<
  typeof createKnowledgeSourceFormSchema
>;

type CreateKnowledgeSourceFormProps = Omit<
  ComponentProps<"form">,
  "onSubmit"
> & {
  organizationId: string;
  knowledgeBaseId: string;
  onSuccess?: () => void;
};

export const CreateKnowledgeSourceForm = ({
  organizationId,
  knowledgeBaseId,
  onSuccess,
  ...formProps
}: CreateKnowledgeSourceFormProps) => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    ...createKnowledgeSourceMutationOptions(
      queryClient,
      organizationId,
      knowledgeBaseId
    ),
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const form = useForm({
    defaultValues: {
      title: "",
      content: "",
    } satisfies CreateKnowledgeSourceFormValues,
    validators: {
      onBlur: createKnowledgeSourceFormSchema,
      onSubmit: createKnowledgeSourceFormSchema,
    },
    onSubmit: async ({ value }) => {
      const input = createKnowledgeSourceFormSchema.parse(value);
      await mutation.mutateAsync(input);

      form.reset();
      toast.success("Knowledge source created. Processing has started.");
      onSuccess?.();
    },
  });

  return (
    <form
      {...formProps}
      id="create-knowledge-source-form"
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
              <form.Field name="title">
                {(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid;

                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>Title</FieldLabel>
                      <Input
                        aria-invalid={isInvalid}
                        autoComplete="off"
                        id={field.name}
                        name={field.name}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="Refund policy"
                        required
                        type="text"
                        value={field.state.value}
                      />
                      {isInvalid ? (
                        <FieldError errors={field.state.meta.errors} />
                      ) : (
                        <FieldDescription>
                          Use a short title for this source.
                        </FieldDescription>
                      )}
                    </Field>
                  );
                }}
              </form.Field>

              <form.Field name="content">
                {(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid;

                  return (
                    <Field
                      className="max-h-48 overflow-y-auto"
                      data-invalid={isInvalid}
                    >
                      <FieldLabel htmlFor={field.name}>Content</FieldLabel>
                      <Textarea
                        aria-invalid={isInvalid}
                        id={field.name}
                        name={field.name}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="Paste the source text here..."
                        required
                        rows={12}
                        value={field.state.value}
                      />
                      {isInvalid ? (
                        <FieldError errors={field.state.meta.errors} />
                      ) : (
                        <FieldDescription>
                          Text is processed in the background after creation.
                        </FieldDescription>
                      )}
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
                    form="create-knowledge-source-form"
                    type="submit"
                  >
                    {submitting && <Spinner data-icon="inline-start" />}
                    {submitting ? "Adding source..." : "Add source"}
                  </Button>
                )}
              </form.Subscribe>
            </FieldGroup>
          </FieldSet>
        )}
      </form.Subscribe>
    </form>
  );
};
