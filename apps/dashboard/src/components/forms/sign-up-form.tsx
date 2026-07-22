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
import {
  Link,
  useNavigate,
  useRouteContext,
  useRouter,
} from "@tanstack/react-router";
import { z } from "zod";
import { authClient } from "@/lib/auth-client";

const signUpSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(100),
    email: z.email("Enter a valid email"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128, "Password must be at most 128 characters"),
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine(({ password, confirmPassword }) => password === confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

type SignUpValues = z.infer<typeof signUpSchema>;

const DEFAULT_SIGN_UP_VALUE: SignUpValues = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
};

export const SignUpForm = () => {
  const navigate = useNavigate();
  const router = useRouter();
  const { auth } = useRouteContext({ from: "__root__" });

  const form = useForm({
    defaultValues: DEFAULT_SIGN_UP_VALUE,
    validators: {
      onBlur: signUpSchema,
      onSubmit: signUpSchema,
    },
    onSubmit: async ({ value }) => {
      const { confirmPassword: _, ...credentials } = value;

      await authClient.signUp.email(credentials, {
        onSuccess: async () => {
          // Refetch auth state, update client side session
          await auth.refetch();
          // Invalidate the beforeLoad data, as it is out of date
          // _auth.beforeLoad will find out current client side session exists
          await router.invalidate();
          // Redirect to the dashboard home page
          navigate({ to: "/", replace: true });
        },
        onError: (ctx) => {
          if (ctx.error.code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL") {
            toast.error("An account with this email already exists.");
            return;
          }

          toast.error("Unable to create account. Please try again.");
        },
      });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create an account</CardTitle>
        <CardDescription>
          Enter your information below to create your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          id="sign-up-form"
          onSubmit={(e) => {
            e.preventDefault();
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
                          <FieldLabel htmlFor={field.name}>Name</FieldLabel>
                          <Input
                            aria-invalid={isInvalid}
                            autoComplete="name"
                            id={field.name}
                            name={field.name}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            placeholder="John Doe"
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
                  <form.Field name="email">
                    {(field) => {
                      const isInvalid =
                        field.state.meta.isTouched && !field.state.meta.isValid;
                      return (
                        <Field data-invalid={isInvalid}>
                          <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                          <Input
                            aria-invalid={isInvalid}
                            autoComplete="email"
                            id={field.name}
                            name={field.name}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            placeholder="you@example.com"
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
                  <form.Field name="password">
                    {(field) => {
                      const isInvalid =
                        field.state.meta.isTouched && !field.state.meta.isValid;
                      return (
                        <Field data-invalid={isInvalid}>
                          <FieldLabel htmlFor={field.name}>Password</FieldLabel>
                          <Input
                            aria-invalid={isInvalid}
                            autoComplete="new-password"
                            id={field.name}
                            name={field.name}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            required
                            type="password"
                            value={field.state.value}
                          />
                          {isInvalid && (
                            <FieldError errors={field.state.meta.errors} />
                          )}
                        </Field>
                      );
                    }}
                  </form.Field>
                  <form.Field name="confirmPassword">
                    {(field) => {
                      const isInvalid =
                        field.state.meta.isTouched && !field.state.meta.isValid;

                      return (
                        <Field data-invalid={isInvalid}>
                          <FieldLabel htmlFor={field.name}>
                            Confirm password
                          </FieldLabel>
                          <Input
                            aria-invalid={isInvalid}
                            autoComplete="confirm-password"
                            id={field.name}
                            name={field.name}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            required
                            type="password"
                            value={field.state.value}
                          />
                          {isInvalid && (
                            <FieldError errors={field.state.meta.errors} />
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
                form="sign-up-form"
                type="submit"
              >
                {isSubmitting && <Spinner data-icon="inline-start" />}
                {isSubmitting ? "Creating account..." : "Create Account"}
              </Button>
            )}
          </form.Subscribe>
          <FieldDescription className="px-6 text-center">
            Already have an account? <Link to="/sign-in">Sign in</Link>
          </FieldDescription>
        </Field>
      </CardFooter>
    </Card>
  );
};
