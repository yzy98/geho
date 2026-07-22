import { Button } from "@geho/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@geho/ui/components/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@geho/ui/components/field";
import { Input } from "@geho/ui/components/input";
import { toast } from "@geho/ui/components/sonner";
import { Spinner } from "@geho/ui/components/spinner";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { z } from "zod";
import { apiClient } from "@/lib/api-client";
import {
  type CurrentOrganization,
  organizationQueryOptions,
} from "@/queries/organization";

const createOrganizationFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Organization name is required")
    .max(100, "Organization name is too long"),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Workspace slug is required")
    .max(255, "Workspace slug is too long")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Use lowercase letters, numbers, and hyphens"
    ),
});

type CreateOrganizationFormValues = z.infer<
  typeof createOrganizationFormSchema
>;

interface CreateOrganizationSuccess {
  organization: CurrentOrganization;
}

const DEFAULT_CREATE_ORGANIZATION_VALUES: CreateOrganizationFormValues = {
  name: "",
  slug: "",
};

class CreateOrganizationError extends Error {
  readonly data: unknown;
  readonly status: number;

  constructor(status: number, data: unknown) {
    super("Unable to create organization.");
    this.status = status;
    this.data = data;
  }
}

function isApiErrorWithCode(
  data: unknown,
  code: string
): data is { code: string; organization?: CurrentOrganization } {
  return (
    typeof data === "object" &&
    data !== null &&
    "code" in data &&
    (data as { code: unknown }).code === code
  );
}

function isCreateOrganizationSuccess(
  data: unknown
): data is CreateOrganizationSuccess {
  return (
    typeof data === "object" &&
    data !== null &&
    "organization" in data &&
    typeof (data as { organization: unknown }).organization === "object" &&
    (data as { organization: unknown }).organization !== null
  );
}

export const CreateOrganizationForm = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const router = useRouter();
  const organizationQuery = organizationQueryOptions();

  const createOrganizationMutation = useMutation<
    CreateOrganizationSuccess,
    CreateOrganizationError,
    CreateOrganizationFormValues
  >({
    mutationFn: async (value) => {
      const payload = createOrganizationFormSchema.parse(value);
      const response = await apiClient.organizations.$post({ json: payload });
      const data = await response.json();

      if (!response.ok) {
        throw new CreateOrganizationError(response.status, data);
      }

      if (!isCreateOrganizationSuccess(data)) {
        throw new CreateOrganizationError(response.status, data);
      }

      return data;
    },
    onSuccess: ({ organization }) => {
      queryClient.setQueryData(organizationQuery.queryKey, {
        status: "ok",
        organization,
      });
      navigate({ to: "/", replace: true });
    },
    onError: async (error) => {
      if (
        error.status === 409 &&
        isApiErrorWithCode(error.data, "USER_ALREADY_HAS_ORGANIZATION") &&
        error.data.organization
      ) {
        queryClient.setQueryData(organizationQuery.queryKey, {
          status: "ok",
          organization: error.data.organization,
        });
        navigate({ to: "/", replace: true });
        return;
      }

      if (
        error.status === 403 &&
        isApiErrorWithCode(error.data, "ORGANIZATION_MEMBERSHIP_REQUIRED")
      ) {
        queryClient.setQueryData(organizationQuery.queryKey, {
          status: "membership_required",
        });
        await router.invalidate();
        return;
      }

      toast.error("Unable to create organization. Please try again.");
    },
  });

  const form = useForm({
    defaultValues: DEFAULT_CREATE_ORGANIZATION_VALUES,
    validators: {
      onBlur: createOrganizationFormSchema,
      onSubmit: createOrganizationFormSchema,
    },
    onSubmit: async ({ value }) => {
      await createOrganizationMutation.mutateAsync(value);
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create organization</CardTitle>
        <CardDescription>
          Set up the first workspace for your team.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          id="create-organization-form"
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
                  <form.Field name="name">
                    {(field) => {
                      const isInvalid =
                        field.state.meta.isTouched && !field.state.meta.isValid;

                      return (
                        <Field data-invalid={isInvalid}>
                          <FieldLabel htmlFor={field.name}>
                            Organization name
                          </FieldLabel>
                          <Input
                            aria-invalid={isInvalid}
                            autoComplete="organization"
                            id={field.name}
                            name={field.name}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            placeholder="Acme"
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
                  <form.Field name="slug">
                    {(field) => {
                      const isInvalid =
                        field.state.meta.isTouched && !field.state.meta.isValid;

                      return (
                        <Field data-invalid={isInvalid}>
                          <FieldLabel htmlFor={field.name}>
                            Workspace slug
                          </FieldLabel>
                          <Input
                            aria-invalid={isInvalid}
                            autoComplete="off"
                            id={field.name}
                            name={field.name}
                            onBlur={field.handleBlur}
                            onChange={(e) =>
                              field.handleChange(e.target.value.toLowerCase())
                            }
                            placeholder="acme"
                            required
                            type="text"
                            value={field.state.value}
                          />
                          {isInvalid ? (
                            <FieldError errors={field.state.meta.errors} />
                          ) : (
                            <FieldDescription>
                              Use lowercase letters, numbers, and hyphens.
                            </FieldDescription>
                          )}
                        </Field>
                      );
                    }}
                  </form.Field>
                </FieldGroup>
              </FieldSet>
            )}
          </form.Subscribe>
        </form>
      </CardContent>
      <CardFooter>
        <Field>
          <form.Subscribe
            selector={(state) => [state.canSubmit, state.isSubmitting]}
          >
            {([canSubmit, isSubmitting]) => (
              <Button
                disabled={!canSubmit || isSubmitting}
                form="create-organization-form"
                type="submit"
              >
                {isSubmitting && <Spinner data-icon="inline-start" />}
                {isSubmitting
                  ? "Creating organization..."
                  : "Create organization"}
              </Button>
            )}
          </form.Subscribe>
        </Field>
      </CardFooter>
    </Card>
  );
};
