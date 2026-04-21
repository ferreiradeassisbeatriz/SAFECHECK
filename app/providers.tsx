"use client";

import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from "@shared/const";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { useEffect, useState } from "react";
import superjson from "superjson";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getLoginUrl } from "@/const";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: "/api/trpc",
          transformer: superjson,
          fetch(input, init) {
            return globalThis.fetch(input, {
              ...(init ?? {}),
              credentials: "include",
            });
          },
        }),
      ],
    }),
  );

  useEffect(() => {
    const redirectToLoginIfUnauthorized = (error: unknown) => {
      if (!(error instanceof TRPCClientError)) return;
      if (typeof window === "undefined") return;
      if (error.message !== UNAUTHED_ERR_MSG) return;
      window.location.href = getLoginUrl();
    };

    const unsubQuery = queryClient.getQueryCache().subscribe(event => {
      if (event.type === "updated" && event.action.type === "error") {
        redirectToLoginIfUnauthorized(event.query.state.error);
        console.error("[API Query Error]", event.query.state.error);
      }
    });

    const unsubMutation = queryClient.getMutationCache().subscribe(event => {
      if (event.type === "updated" && event.action.type === "error") {
        redirectToLoginIfUnauthorized(event.mutation.state.error);
        console.error("[API Mutation Error]", event.mutation.state.error);
      }
    });

    return () => {
      unsubQuery();
      unsubMutation();
    };
  }, [queryClient]);

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary>
          <ThemeProvider defaultTheme="light">
            <TooltipProvider>
              <Toaster />
              {children}
            </TooltipProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
