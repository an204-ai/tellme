"use client";
import { useCallback, useLayoutEffect, useRef, type ReactNode } from "react";

/** A shared indicator follows real links, including an interrupted route change. */
export function LiquidNavigation({ pathname, className, children }: { pathname: string; className: string; children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const indicator = useRef<HTMLSpanElement>(null);
  const animation = useRef<Animation | null>(null);
  const previous = useRef("");
  const select = useCallback((link: HTMLAnchorElement | null, animate: boolean) => {
    const node = root.current, pill = indicator.current;
    if (!node || !pill) return;
    node.querySelectorAll<HTMLAnchorElement>("a").forEach((item) => { item.dataset.selected = String(item === link); });
    if (!link || !node.offsetWidth) { pill.style.visibility = "hidden"; previous.current = ""; return; }
    const bounds = node.getBoundingClientRect(), target = link.getBoundingClientRect();
    const x = target.left - bounds.left, y = target.top - bounds.top;
    const signature = `${link.href}:${x}:${y}:${target.width}:${target.height}`;
    if (signature === previous.current) return;
    const current = pill.getBoundingClientRect();
    const canAnimate = animate && !!previous.current && !document.documentElement.classList.contains("reduce-motion") && !matchMedia("(prefers-reduced-motion: reduce)").matches;
    animation.current?.cancel();
    Object.assign(pill.style, { visibility: "visible", width: `${target.width}px`, height: `${target.height}px`, transform: `translate3d(${x}px, ${y}px, 0)` });
    previous.current = signature;
    if (canAnimate) {
      const startX = current.left - bounds.left, startY = current.top - bounds.top;
      const horizontal = Math.abs(x - startX) > Math.abs(y - startY);
      animation.current = pill.animate([
        { transform: `translate3d(${startX}px, ${startY}px, 0) scale(${current.width / target.width}, ${current.height / target.height})` },
        { transform: `translate3d(${startX + (x - startX) * .7}px, ${startY + (y - startY) * .7}px, 0) scale(${horizontal ? 1.09 : .98}, ${horizontal ? .97 : 1.07})`, offset: .5 },
        { transform: `translate3d(${x}px, ${y}px, 0) scale(1, 1)` },
      ], { duration: 340, easing: "cubic-bezier(.2, .8, .2, 1)" });
    }
  }, []);
  useLayoutEffect(() => {
    select(root.current?.querySelector<HTMLAnchorElement>("a.active") ?? null, true);
  }, [pathname, children, select]);
  useLayoutEffect(() => {
    const node = root.current;
    if (!node) return;
    const observer = new ResizeObserver(() => select(node.querySelector<HTMLAnchorElement>("a.active"), false));
    observer.observe(node);
    return () => { observer.disconnect(); animation.current?.cancel(); };
  }, [select]);
  return <div ref={root} className={`liquid-navigation ${className}`} onClickCapture={(event) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = (event.target as Element).closest<HTMLAnchorElement>("a[href]");
    if (link && event.currentTarget.contains(link)) select(link, true);
  }}>
    <span ref={indicator} className="nav-liquid-glider" aria-hidden="true" />
    {children}
  </div>;
}
