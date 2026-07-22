import { Button } from "@geho/ui/components/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@geho/ui/components/field";
import { toast } from "@geho/ui/components/sonner";
import { Spinner } from "@geho/ui/components/spinner";
import { Textarea } from "@geho/ui/components/textarea";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ComponentProps } from "react";
import z from "zod";
import {
  type CreateEmbedKeyResult,
  createChatbotEmbedKeyMutationOptions,
} from "@/queries/embed-key";

const parseAllowedDomains = (value: string) =>
  value
    .split(/\r?\n/)
    .map((domain) => domain.trim())
    .filter(Boolean);

const allowedDomainSchema = z
  .url("Enter a valid URL")
  .refine(
    (value) => {
      const url = new URL(value);
      return url.protocol === "http:" || url.protocol === "https:";
    },
    {
      message: "Domain must use HTTP or HTTPS",
    }
  )
  .refine(
    (value) => {
      const url = new URL(value);

      return (
        !(url.username || url.password) &&
        url.pathname === "/" &&
        !url.search &&
        !url.hash
      );
    },
    {
      message:
        "Domain must be an origin without credentials, path, query, or hash",
    }
  );

const createEmbedKeyFormSchema = z.object({
  allowedDomains: z.string().superRefine((value, context) => {
    const domains = parseAllowedDomains(value);

    if (domains.length > 20) {
      context.addIssue({
        code: "custom",
        message: "A maximum of 20 allowed domains is supported",
      });
    }

    domains.forEach((domain, index) => {
      const result = allowedDomainSchema.safeParse(domain);

      if (!result.success) {
        context.addIssue({
          code: "custom",
          message: `Line ${index + 1}: ${
            result.error.issues[0]?.message ?? "Invalid domain"
          }`,
        });
      }
    });
  }),
});

type CreateEmbedKeyFormValues = z.infer<typeof createEmbedKeyFormSchema>;

type CreateEmbedKeyFormProps = Omit<ComponentProps<"form">, "onSubmit"> & {
  organizationId: string;
  chatbotId: string;
  onCreated: (result: CreateEmbedKeyResult) => void;
};

export const CreateEmbedKeyForm = ({
  organizationId,
  chatbotId,
  onCreated,
  ...formProps
}: CreateEmbedKeyFormProps) => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    ...createChatbotEmbedKeyMutationOptions({
      queryClient,
      organizationId,
      chatbotId,
    }),
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const form = useForm({
    defaultValues: {
      allowedDomains: "",
    } satisfies CreateEmbedKeyFormValues,
    validators: {
      onBlur: createEmbedKeyFormSchema,
      onSubmit: createEmbedKeyFormSchema,
    },
    onSubmit: async ({ value }) => {
      const parsed = createEmbedKeyFormSchema.parse(value);

      const result = await mutation.mutateAsync({
        allowedDomains: parseAllowedDomains(parsed.allowedDomains),
      });

      form.reset();
      toast.success("Embed key created.");
      onCreated(result);
    },
  });

  return (
    <form
      {...formProps}
      id="create-embed-key-form"
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
              <form.Field name="allowedDomains">
                {(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid;

                  return (
                    <Field
                      className="max-h-36 overflow-y-auto"
                      data-invalid={isInvalid}
                    >
                      <FieldLabel htmlFor={field.name}>
                        Allowed domains
                      </FieldLabel>
                      <Textarea
                        aria-invalid={isInvalid}
                        id={field.name}
                        name={field.name}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder={
                          "http://example.com\nhttp://localhost:5173"
                        }
                        rows={4}
                        value={field.state.value}
                      />
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
                    disabled={!canSubmit || submitting}
                    form="create-embed-key-form"
                    type="submit"
                  >
                    {submitting && <Spinner data-icon="inline-start" />}
                    {submitting ? "Creating key..." : "Create embed key"}
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
