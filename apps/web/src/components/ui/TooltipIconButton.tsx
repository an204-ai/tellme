"use client";
import { useEffect, useId, useRef, useState, type ButtonHTMLAttributes } from "react";
import { IconButton } from "./Primitives";

/** Top-layer tooltip stays visible even inside clipped, independently scrolling panes. */
export function TooltipIconButton({ label, children, onClick, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  const id = useId();
  const tip = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const hide = () => tip.current?.hidePopover();
  const show = (button: HTMLButtonElement) => {
    if (!tip.current || button.disabled) return;
    const rect = button.getBoundingClientRect();
    tip.current.style.maxWidth = `${window.innerWidth - 24}px`;
    tip.current.showPopover();
    const size = tip.current.getBoundingClientRect();
    Object.assign(tip.current.style, {
      left: `${Math.max(12, Math.min(rect.left + rect.width / 2 - size.width / 2, window.innerWidth - size.width - 12))}px`,
      top: `${rect.bottom + size.height + 12 <= window.innerHeight ? rect.bottom + 8 : Math.max(12, rect.top - size.height - 8)}px`,
    });
  };
  useEffect(() => {
    if (!open) return;
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    return () => { window.removeEventListener("scroll", hide, true); window.removeEventListener("resize", hide); };
  }, [open]);
  return <>
    <IconButton {...props} label={label} tooltip={false} aria-describedby={open ? id : undefined}
      onPointerEnter={(event) => { if (event.pointerType === "mouse") show(event.currentTarget); }} onPointerLeave={hide}
      onFocus={(event) => { if (event.currentTarget.matches(":focus-visible")) show(event.currentTarget); }} onBlur={hide}
      onKeyDown={(event) => { if (event.key === "Escape") { hide(); event.stopPropagation(); } }}
      onClick={(event) => { hide(); onClick?.(event); }}>
      {children}
    </IconButton>
    <div ref={tip} id={id} role="tooltip" popover="manual" className="top-layer-tooltip" onToggle={(event) => setOpen(event.newState === "open")}>{label}</div>
  </>;
}
