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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@heho/ui/components/select";
import { toast } from "@heho/ui/components/sonner";
import { Spinner } from "@heho/ui/components/spinner";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ComponentProps } from "react";
import z from "zod";
import { createKnowledgeBaseMutationOptions } from "@/queries/knowledge-base";
import type { LlmProvider } from "@/queries/llm-provider";

const createKnowledgeBaseFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Knowledge base name is required")
      .max(100, "Knowledge base name is too long"),
    embeddingProviderId: z.uuid("Select an embedding LLM provider"),
  })
  .strict();

type CreateKnowledgeBaseFormValues = z.infer<
  typeof createKnowledgeBaseFormSchema
>;

type CreateKnowledgeBaseFormProps = Omit<ComponentProps<"form">, "onSubmit"> & {
  organizationId: string;
  providers: LlmProvider[];
  onSuccess?: () => void;
};

export const CreateKnowledgeBaseForm = ({
  organizationId,
  providers,
  onSuccess,
  ...formProps
}: CreateKnowledgeBaseFormProps) => {
  const queryClient = useQueryClient();

  const embeddingProviders = providers.filter(
    (provider) => provider.capability === "embedding"
  );

  const hasEmbeddingProviders = embeddingProviders.length > 0;

  const mutation = useMutation({
    ...createKnowledgeBaseMutationOptions(queryClient, organizationId),
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const form = useForm({
    defaultValues: {
      name: "",
      embeddingProviderId: embeddingProviders[0]?.id ?? "",
    } satisfies CreateKnowledgeBaseFormValues,
    validators: {
      onBlur: createKnowledgeBaseFormSchema,
      onSubmit: createKnowledgeBaseFormSchema,
    },
    onSubmit: async ({ value }) => {
      const input = createKnowledgeBaseFormSchema.parse(value);
      await mutation.mutateAsync(input);

      form.reset();
      toast.success("Knowledge base created.");
      onSuccess?.();
    },
  });

  return (
    <form
      {...formProps}
      id="create-knowledge-base-form"
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
    >
      <form.Subscribe selector={(state) => state.isSubmitting}>
        {(isSubmitting) => (
          <FieldSet disabled={isSubmitting || !hasEmbeddingProviders}>
            <FieldGroup>
              <form.Field name="name">
                {(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid;

                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>Name</FieldLabel>
                      <Input
                        aria-invalid={isInvalid}
                        autoComplete="off"
                        id={field.name}
                        name={field.name}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="Customer Support Knowledge"
                        required
                        type="text"
                        value={field.state.value}
                      />
                      {isInvalid ? (
                        <FieldError errors={field.state.meta.errors} />
                      ) : (
                        <FieldDescription>
                          Use a name that describes the knowledge shared by its
                          chatbots.
                        </FieldDescription>
                      )}
                    </Field>
                  );
                }}
              </form.Field>

              <form.Field name="embeddingProviderId">
                {(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid;

                  const items = embeddingProviders.map((provider) => ({
                    label: `${provider.name} · ${provider.provider} · ${provider.model}`,
                    value: provider.id,
                  }));

                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>
                        Embedding provider
                      </FieldLabel>
                      <Select
                        items={items}
                        onValueChange={(value) =>
                          field.handleChange(value ?? "")
                        }
                        value={field.state.value}
                      >
                        <SelectTrigger
                          aria-invalid={isInvalid}
                          className="w-full"
                          id={field.name}
                          onBlur={field.handleBlur}
                        >
                          <SelectValue placeholder="Select an embedding provider" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {items.map((item) => (
                              <SelectItem key={item.value} value={item.value}>
                                {item.label}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      {isInvalid ? (
                        <FieldError errors={field.state.meta.errors} />
                      ) : (
                        <FieldDescription>
                          All sources and user queries in this knowledge base
                          use this embedding model.
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
                    disabled={
                      !(hasEmbeddingProviders && canSubmit) || submitting
                    }
                    form="create-knowledge-base-form"
                    type="submit"
                  >
                    {submitting && <Spinner data-icon="inline-start" />}
                    {submitting
                      ? "Creating knowledge base..."
                      : "Create knowledge base"}
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
