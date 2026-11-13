"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { enableInterfaceSoundGestures } from "@/lib/interface-sounds";
import { WeatherProvider } from "./WeatherProvider";
import { InstallProvider } from "./InstallProvider";
import { ThemeProvider, type Theme } from "./ThemeProvider";
export function AppProviders({ children, initialTheme }: { children: React.ReactNode; initialTheme: Theme }) {
  useEffect(enableInterfaceSoundGestures, []);
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
  return (
    <QueryClientProvider client={client}>
      <ThemeProvider initialTheme={initialTheme}><InstallProvider><WeatherProvider>{children}</WeatherProvider></InstallProvider></ThemeProvider>
    </QueryClientProvider>
  );
}
