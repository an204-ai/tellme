"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

const BrandIntroFinishedContext = createContext(false);
export const useBrandIntroFinished = () => useContext(BrandIntroFinishedContext);

export function BrandIntro({ children }: { children: ReactNode }) {
  const overlay = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const [finished, setFinished] = useState(false);
  const finish = useCallback(() => {
    content.current?.removeAttribute("inert");
    setFinished(true);
  }, []);

  useEffect(() => {
    if (finished) return;
    const element = overlay.current;
    const page = content.current;
    if (!element || !page) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const skipMotion = () => {
      if (reduced.matches || document.documentElement.classList.contains("reduce-motion")) finish();
    };
    if (reduced.matches || document.documentElement.classList.contains("reduce-motion")) {
      finish();
      return;
    }
    const animation = element.getAnimations().find((item) => "animationName" in item && item.animationName === "tellme-intro-exit");
    const elapsed = typeof animation?.currentTime === "number" ? animation.currentTime : 0;
    const endTime = animation?.effect?.getComputedTiming().endTime;
    const remaining = typeof endTime === "number" ? endTime - elapsed : 2100;
    if (remaining <= 0 || getComputedStyle(element).visibility === "hidden") {
      finish();
      return;
    }
    // CSS also reveals the page on its own if hydration or JavaScript is unavailable.
    page.inert = true;
    const timer = window.setTimeout(finish, Math.min(2100, remaining) + 160);
    const preventScroll = (event: WheelEvent) => event.preventDefault();
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); finish(); }
    };
    const observer = new MutationObserver(skipMotion);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    reduced.addEventListener("change", skipMotion);
    element.addEventListener("wheel", preventScroll, { passive: false });
    document.addEventListener("keydown", escape);
    return () => {
      window.clearTimeout(timer);
      page.inert = false;
      observer.disconnect();
      reduced.removeEventListener("change", skipMotion);
      element.removeEventListener("wheel", preventScroll);
      document.removeEventListener("keydown", escape);
    };
  }, [finished, finish]);

  return <>
    {!finished && <div ref={overlay} className="tellme-intro" role="region" aria-label="Lời chào Tell me now" onAnimationEnd={(event) => {
      if (event.target === event.currentTarget && event.animationName === "tellme-intro-exit") finish();
    }}>
      <div className="tellme-intro-curtain" aria-hidden="true">
        <svg className="tellme-intro-edge" viewBox="0 0 1440 170" preserveAspectRatio="none"><path d="M0 0H1440V18C1200 18 1120 132 780 146C430 163 260 40 0 18Z" /></svg>
      </div>
      <div className="tellme-intro-words" aria-hidden="true">
        <span>Tell</span><span>me</span><span>now</span>
      </div>
      <button className="tellme-intro-skip" type="button" onClick={finish}>Vào Tellme <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 17 17 7M7 7h10v10" /></svg></button>
    </div>}
    <BrandIntroFinishedContext.Provider value={finished}>
      <div ref={content} className={`tellme-entry-content${finished ? "" : " is-entering"}`}>{children}</div>
    </BrandIntroFinishedContext.Provider>
  </>;
}
