"use client";

import { createContext, useEffect, useState, type ReactNode } from "react";

type InstallOutcome = "accepted" | "dismissed";
type InstallPrompt = Event & { prompt(): Promise<{ outcome: InstallOutcome }> };

export const InstallContext = createContext({
  standalone: false,
  canPrompt: false,
  install: async (): Promise<InstallOutcome | null> => null,
});

export function InstallProvider({ children }: { children: ReactNode }) {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [standalone, setStandalone] = useState(false);

  useEffect(() => {
    const displayMode = window.matchMedia("(display-mode: standalone)");
    const syncDisplayMode = () => {
      const ios = navigator as Navigator & { standalone?: boolean };
      setStandalone(displayMode.matches || ios.standalone === true);
    };
    const capturePrompt = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPrompt);
    };
    const clearPrompt = () => setPrompt(null);

    syncDisplayMode();
    displayMode.addEventListener("change", syncDisplayMode);
    window.addEventListener("beforeinstallprompt", capturePrompt);
    window.addEventListener("appinstalled", clearPrompt);
    return () => {
      displayMode.removeEventListener("change", syncDisplayMode);
      window.removeEventListener("beforeinstallprompt", capturePrompt);
      window.removeEventListener("appinstalled", clearPrompt);
    };
  }, []);

  async function install() {
    if (!prompt) return null;
    setPrompt(null);
    try {
      const { outcome } = await prompt.prompt();
      return outcome;
    } catch {
      return null;
    }
  }

  return (
    <InstallContext.Provider value={{ standalone, canPrompt: !!prompt, install }}>
      {children}
    </InstallContext.Provider>
  );
}
