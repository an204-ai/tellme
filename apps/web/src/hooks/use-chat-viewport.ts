"use client";

import { useEffect, type RefObject } from "react";

/** Keep chat inside the visible area when iOS pans/resizes for its keyboard. */
export function useChatViewport(frame: RefObject<HTMLDivElement | null>, enabled: boolean) {
  useEffect(() => {
    const element = frame.current;
    if (!enabled || !element) return;
    const viewport = window.visualViewport;
    const html = document.documentElement;
    const previousOverflow = html.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    html.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    let paint = 0;
    let focusTimer: ReturnType<typeof setTimeout> | undefined;
    let fullHeight = window.innerHeight;
    const measure = () => {
      cancelAnimationFrame(paint);
      paint = requestAnimationFrame(() => {
        const editable = document.activeElement instanceof HTMLElement &&
          document.activeElement.matches('input, textarea, [contenteditable="true"]');
        const height = viewport?.height ?? window.innerHeight;
        // Browser chrome and pinch zoom are not a keyboard. Keep native zoom available.
        const unzoomed = !viewport || Math.abs(viewport.scale - 1) < .05;
        if (!editable && height > fullHeight) fullHeight = height;
        const keyboard = window.innerWidth <= 640 && unzoomed && editable &&
          Math.max(fullHeight, window.innerHeight) - height > 120;
        element.dataset.keyboardOpen = String(keyboard);
        element.style.setProperty("--messages-height", `${height}px`);
        // Ignore iOS's occasionally stale offset after the keyboard is dismissed.
        element.style.setProperty("--messages-offset", `${keyboard ? viewport?.offsetTop || 0 : 0}px`);
      });
    };
    const focus = () => {
      measure();
      clearTimeout(focusTimer);
      focusTimer = setTimeout(measure, 350);
    };
    measure();
    window.addEventListener("resize", measure);
    viewport?.addEventListener("resize", measure);
    viewport?.addEventListener("scroll", measure);
    document.addEventListener("focusin", focus);
    document.addEventListener("focusout", focus);
    return () => {
      cancelAnimationFrame(paint);
      clearTimeout(focusTimer);
      window.removeEventListener("resize", measure);
      viewport?.removeEventListener("resize", measure);
      viewport?.removeEventListener("scroll", measure);
      document.removeEventListener("focusin", focus);
      document.removeEventListener("focusout", focus);
      html.style.overflow = previousOverflow;
      document.body.style.overflow = previousBodyOverflow;
      delete element.dataset.keyboardOpen;
      element.style.removeProperty("--messages-height");
      element.style.removeProperty("--messages-offset");
    };
  }, [enabled, frame]);
}
