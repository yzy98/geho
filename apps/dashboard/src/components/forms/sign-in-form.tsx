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
import z from "zod";
import { authClient } from "@/lib/auth-client";

const signInSchema = z.object({
  email: z.email("Enter a valid email"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be at most 128 characters"),
});

type SignInValues = z.infer<typeof signInSchema>;

const DEFAULT_SIGN_IN_VALUE: SignInValues = {
  email: "",
  password: "",
};

export const SignInForm = () => {
  const navigate = useNavigate();
  const router = useRouter();
  const { auth } = useRouteContext({ from: "__root__" });

  const form = useForm({
    defaultValues: DEFAULT_SIGN_IN_VALUE,
    validators: {
      onBlur: signInSchema,
      onSubmit: signInSchema,
    },
    onSubmit: async ({ value }) => {
      const { ...credentials } = value;

      await authClient.signIn.email(credentials, {
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
          if (ctx.error.status === 401) {
            toast.error("Invalid email or password");
            return;
          }

          toast.error("Unable to sign in. Please try again.");
        },
      });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Login to your account</CardTitle>
        <CardDescription>
          Enter your email below to login to your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          id="sign-in-form"
          onSubmit={(e) => {
            e.preventDefault();
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
                            autoComplete="current-password"
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
                form="sign-in-form"
                type="submit"
              >
                {isSubmitting && <Spinner data-icon="inline-start" />}
                {isSubmitting ? "Signing in..." : "Login"}
              </Button>
            )}
          </form.Subscribe>
          <FieldDescription className="px-6 text-center">
            Don&apos;t have an account? <Link to="/sign-up">Sign up</Link>
          </FieldDescription>
        </Field>
      </CardFooter>
    </Card>
  );
};
