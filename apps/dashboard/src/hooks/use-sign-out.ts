import { toast } from "@geho/ui/components/sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  useNavigate,
  useRouteContext,
  useRouter,
} from "@tanstack/react-router";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export const useSignOut = () => {
  const [isSigningOut, setIsSigningOut] = useState(false);

  const { auth } = useRouteContext({ from: "__root__" });
  const navigate = useNavigate();
  const router = useRouter();
  const queryClient = useQueryClient();

  const signOut = async () => {
    setIsSigningOut(true);

    try {
      await authClient.signOut({
        fetchOptions: {
          onSuccess: async () => {
            // Refetch auth state, clear client side session
            await auth.refetch();
            // _app.beforeLoad will find out current client side session null
            await router.invalidate();
            // Redirect to sign-in
            await navigate({ to: "/sign-in", replace: true });
            // Clear query cache(e.g. organizationQuery)
            queryClient.clear();
          },
          onError: () => {
            toast.error("Unable to sign out. Please try again.");
          },
        },
      });
    } finally {
      setIsSigningOut(false);
    }
  };

  return {
    isSigningOut,
    signOut,
  };
};
