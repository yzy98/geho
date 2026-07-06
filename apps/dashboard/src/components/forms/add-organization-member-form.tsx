import { Button } from "@heho/ui/components/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@heho/ui/components/field";
import { Input } from "@heho/ui/components/input";
import { toast } from "@heho/ui/components/sonner";
import { Spinner } from "@heho/ui/components/spinner";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ComponentProps } from "react";
import z from "zod";
import { addOrganizationMemberMutationOptions } from "@/queries/organization-member";

const addOrganizationMemberSchema = z.object({
  email: z.email("Enter a valid email address").trim().toLowerCase(),
});

type addOrganizationMemberFormValues = z.infer<
  typeof addOrganizationMemberSchema
>;

type AddOrganizationMemberFormProps = Omit<
  ComponentProps<"form">,
  "onSubmit"
> & {
  organizationId: string;
  onSuccess?: () => void;
};

export const AddOrganizationMemberForm = ({
  organizationId,
  onSuccess,
  ...formProps
}: AddOrganizationMemberFormProps) => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    ...addOrganizationMemberMutationOptions(queryClient, organizationId),
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const form = useForm({
    defaultValues: { email: "" } satisfies addOrganizationMemberFormValues,
    validators: {
      onBlur: addOrganizationMemberSchema,
      onSubmit: addOrganizationMemberSchema,
    },
    onSubmit: async ({ value }) => {
      const parsed = addOrganizationMemberSchema.parse(value);

      await mutation.mutateAsync({
        ...parsed,
      });

      form.reset();
      toast.success("Organization member added.");
      onSuccess?.();
    },
  });

  return (
    <form
      {...formProps}
      id="add-member-form"
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
              <form.Field name="email">
                {(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid;

                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>User email</FieldLabel>
                      <Input
                        aria-invalid={isInvalid}
                        autoComplete="email"
                        id={field.name}
                        name={field.name}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="member@example.com"
                        required
                        type="email"
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
                    form="add-member-form"
                    type="submit"
                  >
                    {submitting && <Spinner data-icon="inline-start" />}
                    {submitting ? "Adding member..." : "Add member"}
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
