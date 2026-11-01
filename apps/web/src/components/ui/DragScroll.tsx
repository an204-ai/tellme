"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { enableDragScroll } from "@/lib/drag-scroll";

export function DragScroll({ children, className = "", label }: { children: ReactNode; className?: string; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => ref.current ? enableDragScroll(ref.current) : undefined, []);
  return <div ref={ref} className={`drag-scroll ${className}`} tabIndex={0} role="region" aria-label={label} onKeyDown={(event) => {
    if (event.target !== event.currentTarget) return;
    const strip = event.currentTarget;
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      strip.scrollLeft += strip.clientWidth * .7 * (event.key === "ArrowRight" ? 1 : -1);
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      strip.scrollLeft = event.key === "Home" ? 0 : strip.scrollWidth;
    }
  }}>{children}</div>;
}
