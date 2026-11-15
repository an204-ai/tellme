"use client";
import { useId, useLayoutEffect, useRef } from "react";
import { X } from "lucide-react";
import { IconButton } from "./Primitives";
import { animateSurface, motionOrigin, retainSurfaceExit } from "@/lib/ui-motion";

let openDialogs = 0;
let bodyOverflowBeforeDialogs = "";
let lastExternalClose = 0;
let lastRetiredDialog: HTMLDialogElement | null = null;

export function Modal({
  title,
  children,
  onClose,
  className = "",
  subtitle,
  headerExtra,
  leading,
  fitViewport = false,
  closeDisabled = false,
  dismissOnEmptySpace = false,
  motionKind = "modal",
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  className?: string;
  subtitle?: React.ReactNode;
  headerExtra?: React.ReactNode;
  leading?: React.ReactNode;
  fitViewport?: boolean;
  closeDisabled?: boolean;
  dismissOnEmptySpace?: boolean;
  motionKind?: "modal" | "panel";
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const closeRef = useRef(onClose);
  const closing = useRef(false);
  const from = useRef(motionOrigin());
  const exited = useRef(false);
  const backdropHandoff = useRef<boolean | null>(null);
  closeRef.current = onClose;
  const dismiss = () => {
    if (closing.current || closeDisabled) return;
    const node = ref.current;
    if (!node) { closeRef.current(); return; }
    closing.current = true;
    node.dataset.modalState = "closing";
    const animation = animateSurface(node, "leave", motionKind, from.current);
    void animation.finished.catch(() => {}).then(() => { exited.current = true; closing.current = false; closeRef.current(); });
  };
  useLayoutEffect(() => {
    const dialog = ref.current;
    if (dialog) {
      dialog.dataset.modalState = "open";
      // The replacement may mount before the outgoing controller's cleanup runs.
      const replacingOpenDialog = [...document.querySelectorAll("dialog.app-dialog[open]")].some((open) => open !== dialog);
      backdropHandoff.current ??= replacingOpenDialog || (lastRetiredDialog !== dialog && Date.now() - lastExternalClose < 100);
      dialog.dataset.backdropHandoff = String(backdropHandoff.current);
      dialog.showModal();
    }
    const arrival = dialog && animateSurface(dialog, "arrive", motionKind, from.current);
    if (openDialogs++ === 0) bodyOverflowBeforeDialogs = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      if (dialog && !exited.current) { lastExternalClose = Date.now(); lastRetiredDialog = dialog; retainSurfaceExit(dialog, motionKind, from.current, true); }
      arrival?.cancel();
      dialog?.close();
      if (--openDialogs === 0) document.body.style.overflow = bodyOverflowBeforeDialogs;
    };
  }, []);
  useLayoutEffect(() => {
    const node = ref.current;
    if (!fitViewport || !node) return;
    const viewport = window.visualViewport;
    let fullHeight = window.innerHeight;
    const measure = () => {
      const unzoomed = !viewport || Math.abs(viewport.scale - 1) < .05;
      const height = unzoomed && viewport ? viewport.height : window.innerHeight;
      const top = unzoomed && viewport ? viewport.offsetTop : 0;
      if (!node.contains(document.activeElement)) fullHeight = Math.max(window.innerHeight, height);
      node.style.setProperty("--dialog-viewport-height", `${height}px`);
      node.style.setProperty("--dialog-viewport-top", `${top}px`);
      node.dataset.shortViewport = String(height < 400);
      node.dataset.keyboardViewport = String(unzoomed && fullHeight - height > 120);
    };
    measure();
    window.addEventListener("resize", measure);
    viewport?.addEventListener("resize", measure);
    viewport?.addEventListener("scroll", measure);
    return () => { window.removeEventListener("resize", measure); viewport?.removeEventListener("resize", measure); viewport?.removeEventListener("scroll", measure); };
  }, [fitViewport]);
  return (
    <dialog
      ref={ref}
      className={`app-dialog ${className}`}
      aria-labelledby={titleId}
      data-viewport-fit={fitViewport || undefined}
      onCancel={(event) => {
        // File-input cancellation bubbles too; it must never dismiss the enclosing wizard.
        if (event.target !== event.currentTarget) { event.stopPropagation(); return; }
        event.preventDefault();
        event.stopPropagation();
        dismiss();
      }}
      onClick={(event) => {
        const target = event.target instanceof Element ? event.target : (event.target as Node).parentElement;
        if (!target) return;
        const interactive = target.closest("button, a, input, textarea, select, form, summary, [popover], .menu-panel, .dialog-header, .now-identity-slot, .now-response-slot");
        if (event.target === event.currentTarget || dismissOnEmptySpace && target.closest("dialog") === event.currentTarget &&
          !(interactive && event.currentTarget.contains(interactive))) dismiss();
      }}
    >
      <section className="dialog-content">
        <header className="dialog-header">
          {leading}
          {subtitle || headerExtra ? <div className="dialog-heading"><h2 id={titleId}>{title}</h2>{subtitle && <div className="dialog-subtitle">{subtitle}</div>}{headerExtra}</div> : <h2 id={titleId}>{title}</h2>}
          <IconButton label="Đóng" tooltip={false} disabled={closeDisabled} onClick={dismiss}>
            <X size={21} />
          </IconButton>
        </header>
        {children}
      </section>
    </dialog>
  );
}
