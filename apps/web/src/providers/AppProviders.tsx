"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { WeatherProvider } from "./WeatherProvider";
export function AppProviders({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          // A stale browser online flag must not leave reads stuck in paused state.
          queries: { networkMode: "always", retry: 1, refetchOnWindowFocus: true },
          mutations: { retry: false },
        },
      }),
  );
  return <QueryClientProvider client={client}><WeatherProvider>{children}</WeatherProvider></QueryClientProvider>;
}
