"use client";

import { useEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import { createPortal } from "react-dom";
import { ReactionIcon } from "@/components/ui/ReactionControl";
import type { Reaction } from "@/lib/types";

type Burst = { key: number; reaction: Reaction; x: number; y: number; host: HTMLElement };

/** One bounded, compositor-driven burst; never changes photo layout or blocks input. */
export function useReactionBubbles(container?: RefObject<HTMLElement | null>) {
  const [burst, setBurst] = useState<Burst | null>(null);
  const sequence = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const celebrate = (reaction: Reaction, source: DOMRect) => {
    if (document.documentElement.classList.contains("reduce-motion") || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    clearTimeout(timer.current);
    setBurst({ key: ++sequence.current, reaction, x: source.left + source.width / 2, y: source.top + source.height / 2, host: container?.current?.closest("dialog") || document.body });
    timer.current = setTimeout(() => setBurst(null), 1900);
  };
  const celebration = burst && createPortal(<div key={burst.key} className="reaction-bubbles" aria-hidden="true">
    {Array.from({ length: 12 }, (_, index) => {
      const spread = Math.sin(index * 2.4) * (45 + index * 7);
      const drift = Math.max(24 - burst.x, Math.min(window.innerWidth - 24 - burst.x, spread));
      const style = {
        left: burst.x, top: burst.y,
        "--bubble-drift": `${drift}px`,
        "--bubble-rise": `${Math.min(burst.y - 35, 145 + index % 5 * 34)}px`,
        "--bubble-delay": `${index * 34}ms`,
        "--bubble-duration": `${1050 + index % 4 * 110}ms`,
        "--bubble-turn": `${(index % 2 ? 1 : -1) * (8 + index * 2)}deg`,
      } as CSSProperties;
      return <span key={index} className="reaction-bubble" style={style}>
        <span className="reaction-bubble-face"><ReactionIcon value={burst.reaction} size={28 + index % 3 * 4} /></span>
        <span className="reaction-bubble-pop" />
      </span>;
    })}
  </div>, burst.host);
  return { celebrate, celebration };
}
