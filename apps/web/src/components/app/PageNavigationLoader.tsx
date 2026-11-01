"use client";
import { useLayoutEffect, useState, type RefObject } from "react";
import { Loader } from "@/components/ui/Primitives";

export function PageNavigationLoader({ content, label, active }: { content: RefObject<HTMLDivElement | null>; label: string; active: boolean }) {
  const [bounds, setBounds] = useState({ left: 0, top: 0, width: 0, height: 0 });
  useLayoutEffect(() => {
    const parent = content.current?.parentElement;
    if (!parent) return;
    const measure = () => {
      const rect = parent.getBoundingClientRect();
      const viewport = window.visualViewport;
      const header = document.querySelector(".global-header")?.getBoundingClientRect().bottom || 0;
      const nav = document.querySelector(".mobile-nav")?.getBoundingClientRect();
      const top = Math.max(viewport?.offsetTop || 0, header, rect.top);
      const bottom = Math.min((viewport?.offsetTop || 0) + (viewport?.height || innerHeight), nav && nav.height > 0 ? nav.top : Infinity);
      const left = Math.max(0, rect.left);
      setBounds({ left, top, width: Math.max(0, Math.min(innerWidth, rect.right) - left), height: Math.max(80, bottom - top) });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(parent);
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    window.visualViewport?.addEventListener("resize", measure);
    return () => { observer.disconnect(); window.removeEventListener("scroll", measure); window.removeEventListener("resize", measure); window.visualViewport?.removeEventListener("resize", measure); };
  }, [content, active]);
  return <div className="page-navigation-loader" data-active={active} aria-hidden={!active} style={{ ...bounds, visibility: bounds.width ? "visible" : "hidden" }}>{active && <Loader small label={`Đang mở ${label}…`} />}</div>;
}
