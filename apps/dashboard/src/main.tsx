import { Spinner } from "@geho/ui/components/spinner";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { authClient } from "@/lib/auth-client";
import { queryClient } from "@/lib/query-client";
import { router } from "@/router";

import "./index.css";

function RouteApp() {
  const auth = authClient.useSession();

  if (auth.isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Spinner data-icon="inline-start" />
          <span>Checking session...</span>
        </div>
      </div>
    );
  }

  return <RouterProvider context={{ auth }} router={router} />;
}

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouteApp />
    </QueryClientProvider>
  </StrictMode>
);
