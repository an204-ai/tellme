"use client";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { animateSurface, motionOrigin, retainSurfaceExit, type MotionKind } from "@/lib/ui-motion";

/** Meaningful view replacement. Layout effect starts before paint; typing does not replay it. */
export function useSurfaceArrival(ref: { current: HTMLElement | null }, change: unknown, observeContent = false, kind: MotionKind = observeContent ? "page" : "surface") {
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    let animation: Animation | undefined;
    const arrive = () => { animation?.cancel(); animation = animateSurface(node, "arrive", kind); };
    arrive();
    const observer = observeContent ? new MutationObserver((records) => {
      if (records.some((r) => Array.from(r.addedNodes).some((child) => child instanceof HTMLElement && !child.matches(".loading-state,script,style,[data-motion-ghost]")))) arrive();
    }) : undefined;
    observer?.observe(node, { childList: true });
    return () => { observer?.disconnect(); animation?.cancel(); };
  }, [ref, change, observeContent, kind]);
}

/** Keep a conditional surface for its exit; new input can reverse it immediately. */
export function SurfacePresence({ show, children, className = "", kind = "panel" }: { show: boolean; children: ReactNode; className?: string; kind?: MotionKind }) {
  const [mounted, setMounted] = useState(show);
  const ref = useRef<HTMLDivElement>(null);
  const lastContent = useRef(children), from = useRef(motionOrigin());
  if (show) lastContent.current = children;
  useLayoutEffect(() => {
    if (show && !mounted) { from.current = motionOrigin(); setMounted(true); return; }
    if (!ref.current) return;
    const animation = animateSurface(ref.current, show ? "arrive" : "leave", kind, from.current);
    if (!show) void animation.finished.then(() => setMounted(false)).catch(() => {});
    return () => animation.cancel();
  }, [show, mounted, kind]);
  useLayoutEffect(() => () => { if (ref.current) retainSurfaceExit(ref.current, kind, from.current, true); }, [kind]);
  return mounted ? <div ref={ref} className={className} inert={!show} aria-hidden={!show || undefined}>{lastContent.current}</div> : null;
}
