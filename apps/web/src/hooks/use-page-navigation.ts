"use client";
import { useCallback, useEffect, useRef, useState, useTransition, type RefObject } from "react";
import { useRouter } from "next/navigation";

type Intent = { id: number; href: string; label: string; from: string };

/** Wait for the route AND its first data, never for pagination/background refresh. */
export function usePageNavigation(pathname: string, content: RefObject<HTMLDivElement | null>) {
  const router = useRouter();
  const [routing, startTransition] = useTransition();
  const [intent, setIntent] = useState<Intent | null>(null);
  const latest = useRef<Intent | null>(null);
  const observedRouting = useRef<number | null>(null);
  const sequence = useRef(0);
  const navigate = useCallback((href: string, label: string) => {
    const destination = new URL(href, window.location.href);
    if (!latest.current && destination.pathname + destination.search === window.location.pathname + window.location.search) return;
    const next = { id: ++sequence.current, href, label, from: pathname };
    latest.current = next;
    setIntent(next);
    startTransition(() => {
      try { router.push(href); }
      catch { if (latest.current?.id === next.id) { latest.current = null; setIntent(null); } }
    });
  }, [pathname, router]);
  useEffect(() => {
    if (!intent || !content.current) return;
    if (routing) observedRouting.current = intent.id;
    const destination = new URL(intent.href, window.location.href);
    if (!routing && observedRouting.current === intent.id && pathname === intent.from && pathname !== destination.pathname) {
      latest.current = null;
      setIntent(null);
      return;
    }
    let frame = 0;
    const node = content.current;
    const check = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (latest.current?.id !== intent.id) return;
        const target = new URL(intent.href, window.location.href);
        // A redirect is also a committed navigation; a superseded attempt is not.
        if (pathname !== target.pathname && pathname === intent.from) return;
        if (node.querySelector('[data-route-loading="true"]')) return;
        // Only this route's loading boundary owns its veil. A weather request or
        // another pane's first query must never hold the destination inert.
        latest.current = null;
        setIntent(null);
      });
    };
    // Query observers attach during commit. Check on the next frame, not a timer.
    const observer = new MutationObserver(check);
    observer.observe(node, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-route-loading"] });
    check();
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, [intent, pathname, routing, content]);
  useEffect(() => {
    const cancel = () => { latest.current = null; setIntent(null); };
    window.addEventListener("popstate", cancel);
    return () => window.removeEventListener("popstate", cancel);
  }, []);
  return { navigate, pendingHref: intent?.href, pendingLabel: intent?.label };
}
