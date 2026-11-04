"use client";
import { playInterfaceSound } from "@/lib/interface-sounds";
import Image from "next/image";
import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import { ThumbsUp } from "lucide-react";
import type { Reaction } from "@/lib/types";
import { reactionOptions } from "@/lib/social-assets";

export function ReactionIcon({ value, size = 28 }: { value: Reaction; size?: number }) {
  const option = reactionOptions.find((entry) => entry.value === value) || reactionOptions[0]!;
  return <Image className="tellme-reaction-image" src={option.image} width={size} height={size} sizes={`${size}px`} alt="" aria-hidden="true" draggable={false} />;
}

/** Native popover keeps reactions above both feed images and timeline dialogs. */
export function ReactionControl({ selected, onChange, disabled = false, compact = false, flightTarget, sound = "reaction", className = "" }: {
  selected?: Reaction | null;
  onChange: (value: Reaction | null) => void;
  disabled?: boolean;
  compact?: boolean;
  flightTarget?: RefObject<HTMLElement | null>;
  className?: string;
  sound?: "reaction" | "pop";
}) {
  const id = useId();
  const trigger = useRef<HTMLDivElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const main = useRef<HTMLButtonElement>(null);
  const burstLayer = useRef<HTMLDivElement>(null);
  const burstSequence = useRef(0);
  const [burst, setBurst] = useState<{ value: Reaction; x: number; y: number; key: number; flight?: { dx: number; dy: number; arc: number; size: number } } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const gesture = useRef<{ id: number; x: number; y: number; opened: boolean; value: Reaction | null; timer?: ReturnType<typeof setTimeout> } | null>(null);
  const gestureListeners = useRef<AbortController | null>(null);
  const suppressClick = useRef(false);
  const suppressClickTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const chooseRef = useRef<(value: Reaction | null, source: HTMLButtonElement) => void>(() => {});
  const closeRef = useRef<() => void>(() => {});
  const [open, setOpen] = useState(false);
  const [dragReaction, setDragReaction] = useState<Reaction | null>(null);
  const choice = reactionOptions.find((option) => option.value === selected);
  const cancelClose = () => clearTimeout(timer.current);
  const close = () => popup.current?.hidePopover();
  const choose = (value: Reaction | null, source: HTMLButtonElement) => {
    // Measure the chosen tray icon before closing the popover. The count target
    // is local to this post, so other posts and responsive layouts cannot steal it.
    const sourceRect = source.querySelector("img")?.getBoundingClientRect();
    const targetRect = flightTarget?.current?.getBoundingClientRect();
    const restoreFocus = popup.current?.contains(document.activeElement);
    close();
    if (restoreFocus) main.current?.focus({ preventScroll: true });
    if (value && !document.documentElement.classList.contains("reduce-motion") && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const rect = sourceRect || main.current?.querySelector("img")?.getBoundingClientRect();
      if (rect) {
        const x = rect.left + rect.width / 2, y = rect.top + rect.height / 2;
        const dx = targetRect ? targetRect.left + targetRect.width / 2 - x : 0;
        const dy = targetRect ? targetRect.top + targetRect.height / 2 - y : 0;
        setBurst({ value, x, y, key: ++burstSequence.current,
          ...(targetRect ? { flight: { dx, dy, arc: Math.min(36, Math.max(16, Math.hypot(dx, dy) * .18)), size: rect.width } } : {}),
        });
      }
    }
    if (value) playInterfaceSound(sound);
    onChange(value);
  };
  chooseRef.current = choose;
  closeRef.current = close;
  useLayoutEffect(() => {
    if (!burst) return;
    // The top layer also clears clipped post images and the story timeline dialog.
    const layer = burstLayer.current;
    layer?.showPopover();
    const cleanup = setTimeout(() => setBurst(null), 720);
    return () => { clearTimeout(cleanup); layer?.hidePopover(); };
  }, [burst]);
  const scheduleClose = () => { cancelClose(); timer.current = setTimeout(close, 180); };
  const show = (focus = false) => {
    cancelClose();
    if (disabled || !popup.current || !trigger.current) return;
    document.querySelectorAll<HTMLElement>(".tellme-reaction-picker:popover-open").forEach((other) => {
      if (other !== popup.current) other.hidePopover();
    });
    const rect = trigger.current.getBoundingClientRect();
    popup.current.showPopover();
    const { width, height } = popup.current.getBoundingClientRect();
    const viewport = window.visualViewport;
    const left = viewport?.offsetLeft || 0, top = viewport?.offsetTop || 0;
    const right = left + (viewport?.width || window.innerWidth);
    const bottom = top + (viewport?.height || window.innerHeight);
    Object.assign(popup.current.style, {
      right: "auto", bottom: "auto",
      left: `${Math.max(left + 12, Math.min(rect.left, right - width - 12))}px`,
      top: `${Math.max(top + 12, Math.min(rect.top >= top + height + 20 ? rect.top - height - 8 : rect.bottom + 8, bottom - height - 12))}px`,
    });
    if (focus) requestAnimationFrame(() => popup.current?.querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true }));
  };
  useEffect(() => () => { clearTimeout(timer.current); clearTimeout(suppressClickTimer.current); }, []);
  const stopGesture = () => {
    if (gesture.current?.timer) clearTimeout(gesture.current.timer);
    gesture.current = null;
    gestureListeners.current?.abort();
    gestureListeners.current = null;
  };
  useEffect(() => () => stopGesture(), []);
  const trackGesture = () => {
    const listeners = new AbortController();
    gestureListeners.current = listeners;
    const move = (event: PointerEvent) => {
      const current = gesture.current;
      if (!current || current.id !== event.pointerId) return;
      if (!current.opened) {
        if (Math.hypot(event.clientX - current.x, event.clientY - current.y) > 12) {
          stopGesture();
        }
        return;
      }
      const node = document.elementFromPoint(event.clientX, event.clientY);
      const button = node?.closest<HTMLButtonElement>(".tellme-reaction-picker > button[data-reaction]");
      if (button && button.parentElement !== popup.current) return;
      const value = button?.dataset.reaction as Reaction | undefined;
      const next = value && reactionOptions.some((option) => option.value === value) ? value : null;
      current.value = next;
      setDragReaction(next);
    };
    const finish = (event: PointerEvent) => {
      const current = gesture.current;
      if (!current || current.id !== event.pointerId) return;
      stopGesture();
      if (!current.opened) return;
      if (event.type !== "pointerup") {
        setDragReaction(null);
        closeRef.current();
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      suppressClick.current = true;
      clearTimeout(suppressClickTimer.current);
      suppressClickTimer.current = setTimeout(() => { suppressClick.current = false; }, 0);
      setDragReaction(null);
      if (current.value) {
        const source = popup.current?.querySelector<HTMLButtonElement>(`button[data-reaction="${current.value}"]`);
        if (source) chooseRef.current(current.value, source);
        else closeRef.current();
      } else closeRef.current();
    };
    const options = { capture: true, signal: listeners.signal };
    document.addEventListener("pointermove", move, { ...options, passive: true });
    document.addEventListener("pointerup", finish, options);
    document.addEventListener("pointercancel", finish, options);
  };
  useEffect(() => {
    if (!open) return;
    const dismiss = () => popup.current?.hidePopover();
    const outside = (event: PointerEvent) => {
      if (!popup.current?.contains(event.target as Node) && !trigger.current?.contains(event.target as Node)) dismiss();
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      const restoreFocus = popup.current?.contains(document.activeElement);
      dismiss();
      if (restoreFocus) main.current?.focus({ preventScroll: true });
    };
    // Manual light-dismiss avoids the browser closing a newly opened tray on
    // the pointerup of the very same long press that opened it.
    document.addEventListener("pointerdown", outside, true);
    document.addEventListener("keydown", escape);
    window.addEventListener("scroll", dismiss, true);
    window.addEventListener("resize", dismiss);
    window.addEventListener("blur", dismiss);
    window.visualViewport?.addEventListener("resize", dismiss);
    window.visualViewport?.addEventListener("scroll", dismiss);
    return () => {
      document.removeEventListener("pointerdown", outside, true);
      document.removeEventListener("keydown", escape);
      window.removeEventListener("scroll", dismiss, true); window.removeEventListener("resize", dismiss); window.removeEventListener("blur", dismiss);
      window.visualViewport?.removeEventListener("resize", dismiss);
      window.visualViewport?.removeEventListener("scroll", dismiss);
    };
  }, [open]);
  return <>
    <div ref={trigger} className={`tellme-reaction-control ${compact ? "compact" : ""} ${selected ? "selected" : ""} ${className}`} onPointerLeave={(event) => { if (event.pointerType === "mouse") scheduleClose(); }}>
      <button ref={main} type="button" className="tellme-reaction-main" aria-label={choice?.label || "Thích"} onPointerDown={(event) => {
        if (disabled || event.button !== 0 || event.isPrimary === false) return;
        stopGesture();
        const current: NonNullable<typeof gesture.current> = { id: event.pointerId, x: event.clientX, y: event.clientY, opened: false, value: null };
        current.timer = setTimeout(() => {
          if (gesture.current !== current) return;
          current.opened = true;
          show();
        }, 320);
        gesture.current = current;
        trackGesture();
      }} onKeyDown={(event) => {
        if (event.key !== "ArrowDown" && !(event.shiftKey && event.key === "F10")) return;
        event.preventDefault();
        show(true);
      }} onPointerEnter={(event) => { if (event.pointerType === "mouse") show(); }} onContextMenu={(event) => event.preventDefault()} disabled={disabled} aria-pressed={!!selected} aria-haspopup="true" aria-keyshortcuts="ArrowDown Shift+F10" aria-controls={id} aria-expanded={open} onClick={(event) => {
        if (suppressClick.current) { suppressClick.current = false; event.preventDefault(); return; }
        choose(selected ? null : "like", event.currentTarget);
      }}>
        {selected ? <ReactionIcon value={selected} /> : <ThumbsUp size={22} strokeWidth={2} aria-hidden="true" />}<span>{choice?.label || "Thích"}</span>
      </button>
    </div>
    <div id={id} ref={popup} popover="manual" className="tellme-reaction-picker" aria-label="Chọn cảm xúc" onToggle={(event) => setOpen(event.newState === "open")} onPointerEnter={cancelClose} onPointerLeave={(event) => { if (event.pointerType === "mouse") scheduleClose(); }} onKeyDown={(event) => {
      const entries = Array.from(popup.current?.querySelectorAll<HTMLButtonElement>("button") || []);
      const index = entries.indexOf(document.activeElement as HTMLButtonElement);
      if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) { event.preventDefault(); entries[event.key === "Home" ? 0 : event.key === "End" ? entries.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + entries.length) % entries.length]?.focus({ preventScroll: true }); }
    }}>
      {reactionOptions.map((option) => <button key={option.value} type="button" data-reaction={option.value} className={dragReaction === option.value ? "is-drag-target" : undefined} aria-pressed={selected === option.value} aria-label={option.label} onClick={(event) => {
        if (suppressClick.current) { suppressClick.current = false; event.preventDefault(); return; }
        choose(selected === option.value ? null : option.value, event.currentTarget);
      }}><ReactionIcon value={option.value} size={40} /></button>)}
    </div>
    {burst && <div ref={burstLayer} popover="manual" className="tellme-reaction-burst" aria-hidden="true" style={{ left: burst.x, top: burst.y, "--burst-rise": `${Math.max(20, Math.min(76, burst.y - 24))}px`, ...(burst.flight ? { "--flight-dx": `${burst.flight.dx}px`, "--flight-dy": `${burst.flight.dy}px`, "--flight-arc": `${burst.flight.arc}px`, "--flight-size": `${burst.flight.size}px` } : {}) } as CSSProperties}>
      {burst.flight ? <span key={burst.key} className="reaction-flight-icon"><ReactionIcon value={burst.value} size={48} /></span> : <div key={burst.key} className="reaction-burst-scene" data-reaction={burst.value}>
        <span className="reaction-burst-ring" />
        {Array.from({ length: 7 }, (_, index) => <i key={index} className="reaction-burst-spark" style={{ "--spark-angle": `${index * (360 / 7)}deg` } as CSSProperties} />)}
        <span className="reaction-burst-icon"><ReactionIcon value={burst.value} size={48} /></span>
      </div>}
    </div>}
  </>;
}
