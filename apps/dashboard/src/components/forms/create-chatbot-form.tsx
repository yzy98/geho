import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@heho/ui/components/alert";
import { Button, buttonVariants } from "@heho/ui/components/button";
import {
  Field,
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
import { Textarea } from "@heho/ui/components/textarea";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { AlertTriangleIcon } from "lucide-react";
import type { ComponentProps } from "react";
import z from "zod";
import { createChatbotMutationOptions } from "@/queries/chatbot";
import type { KnowledgeBase } from "@/queries/knowledge-base";
import type { LlmProvider } from "@/queries/llm-provider";

const createChatbotFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Chatbot name is required")
      .max(100, "Chatbot name is too long"),
    systemInstructions: z
      .string()
      .trim()
      .min(1, "System instructions are required")
      .max(10_000, "System instructions are too long"),
    chatProviderId: z.uuid("Select a chat LLM provider"),
    knowledgeBaseId: z.uuid("Select a knowledge base"),
  })
  .strict();

type CreateChatbotFormValues = z.infer<typeof createChatbotFormSchema>;

type CreateChatbotFormProps = Omit<ComponentProps<"form">, "onSubmit"> & {
  organizationId: string;
  providers: LlmProvider[];
  knowledgeBases: KnowledgeBase[];
  onSuccess?: () => void;
};

export const CreateChatbotForm = ({
  organizationId,
  providers,
  knowledgeBases,
  onSuccess,
  ...formProps
}: CreateChatbotFormProps) => {
  const queryClient = useQueryClient();

  const chatProviders = providers.filter(
    (provider) => provider.capability === "chat"
  );

  const hasChatProviders = chatProviders.length > 0;
  const hasKnowledgeBases = knowledgeBases.length > 0;
  const hasRequiredDependencies = hasChatProviders && hasKnowledgeBases;

  const mutation = useMutation({
    ...createChatbotMutationOptions(queryClient, organizationId),
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const form = useForm({
    defaultValues: {
      name: "",
      systemInstructions: "",
      chatProviderId: chatProviders[0]?.id ?? "",
      knowledgeBaseId: knowledgeBases[0]?.id ?? "",
    } satisfies CreateChatbotFormValues,
    validators: {
      onBlur: createChatbotFormSchema,
      onSubmit: createChatbotFormSchema,
    },
    onSubmit: async ({ value }) => {
      const input = createChatbotFormSchema.parse(value);
      await mutation.mutateAsync(input);

      form.reset();
      toast.success("Chatbot created.");
      onSuccess?.();
    },
  });

  return (
    <form
      {...formProps}
      id="create-chatbot-form"
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
    >
      <form.Subscribe selector={(state) => state.isSubmitting}>
        {(isSubmitting) => (
          <FieldSet disabled={isSubmitting || !hasRequiredDependencies}>
            <FieldGroup>
              {!hasChatProviders && (
                <Alert variant="destructive">
                  <AlertTriangleIcon />
                  <AlertTitle>Chat provider required</AlertTitle>
                  <AlertDescription>
                    Configure a chat provider before creating a chatbot.
                  </AlertDescription>
                  <AlertAction>
                    <Link
                      className={buttonVariants({
                        size: "xs",
                        variant: "secondary",
                      })}
                      to="/providers"
                    >
                      Configure
                    </Link>
                  </AlertAction>
                </Alert>
              )}

              {!hasKnowledgeBases && (
                <Alert variant="destructive">
                  <AlertTriangleIcon />
                  <AlertTitle>Knowledge base required</AlertTitle>
                  <AlertDescription>
                    Configure a knowledge base before creating a chatbot.
                  </AlertDescription>
                  <AlertAction>
                    <Link
                      className={buttonVariants({
                        size: "xs",
                        variant: "secondary",
                      })}
                      to="/knowledge-bases"
                    >
                      Create
                    </Link>
                  </AlertAction>
                </Alert>
              )}

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
                        placeholder="Customer Support"
                        required
                        type="text"
                        value={field.state.value}
                      />
                      {isInvalid && (
                        <FieldError errors={field.state.meta.errors} />
                      )}
                    </Field>
                  );
                }}
              </form.Field>

              <form.Field name="systemInstructions">
                {(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid;

                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>
                        System instructions
                      </FieldLabel>
                      <Textarea
                        aria-invalid={isInvalid}
                        autoComplete="off"
                        id={field.name}
                        name={field.name}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="You are a helpful customer support assistant."
                        required
                        rows={6}
                        value={field.state.value}
                      />
                      {isInvalid && (
                        <FieldError errors={field.state.meta.errors} />
                      )}
                    </Field>
                  );
                }}
              </form.Field>

              <form.Field name="chatProviderId">
                {(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid;

                  const items = chatProviders.map((provider) => ({
                    label: `${provider.name} · ${provider.provider} · ${provider.model}`,
                    value: provider.id,
                  }));

                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>
                        Chat LLM provider
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
                          <SelectValue placeholder="Select a chat provider" />
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
                      {isInvalid && (
                        <FieldError errors={field.state.meta.errors} />
                      )}
                    </Field>
                  );
                }}
              </form.Field>

              <form.Field name="knowledgeBaseId">
                {(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid;

                  const items = knowledgeBases.map((knowledgeBase) => ({
                    label: knowledgeBase.name,
                    value: knowledgeBase.id,
                  }));

                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>
                        Knowledge base
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
                          <SelectValue placeholder="Select a knowledge base" />
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

                      {isInvalid && (
                        <FieldError errors={field.state.meta.errors} />
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
                      !(hasRequiredDependencies && canSubmit) || submitting
                    }
                    form="create-chatbot-form"
                    type="submit"
                  >
                    {submitting && <Spinner data-icon="inline-start" />}
                    {submitting ? "Creating chatbot..." : "Create chatbot"}
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
