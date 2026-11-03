"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Intent = { href: string; label: string; from: string; deadline: number };
const navigationTimeout = 10000;

export function usePageNavigation(pathname: string) {
  const router = useRouter();
  const [intent, setIntent] = useState<Intent | null>(null);
  const [failed, setFailed] = useState<Intent | null>(null);
  const latest = useRef<Intent | null>(null);
  const navigate = useCallback((href: string, label: string) => {
    const destination = new URL(href, window.location.href);
    const from = window.location.pathname + window.location.search;
    if (!latest.current && destination.pathname + destination.search === from) return;
    const next = { href, label, from, deadline: Date.now() + navigationTimeout };
    latest.current = next;
    setFailed(null);
    setIntent(next);
    router.push(href);
  }, [router]);

  useEffect(() => {
    if (!intent) return;
    const check = () => {
      if (latest.current !== intent) return;
      const committed = window.location.pathname + window.location.search !== intent.from;
      if (!committed && Date.now() < intent.deadline) return;
      latest.current = null;
      setIntent(null);
      if (!committed) {
        if (navigator.onLine) window.location.assign(intent.href);
        else setFailed(intent);
      }
    };
    const timer = window.setTimeout(check, Math.max(0, intent.deadline - Date.now()));
    document.addEventListener("visibilitychange", check);
    window.addEventListener("pageshow", check);
    check();
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("pageshow", check);
    };
  }, [intent, pathname]);

  useEffect(() => {
    const cancel = () => { latest.current = null; setIntent(null); setFailed(null); };
    window.addEventListener("popstate", cancel);
    return () => window.removeEventListener("popstate", cancel);
  }, []);
  useEffect(() => { setFailed(null); }, [pathname]);

  return { navigate, pendingHref: intent?.href, failed };
}
