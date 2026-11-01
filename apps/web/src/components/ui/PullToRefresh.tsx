"use client";
import { createContext, useContext, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { PullRefreshGesture, PULL_MAX, type PullState } from "@/lib/pull-refresh";
import { nextPaint, waitForVisibleImages } from "@/lib/refresh-feedback";
import { paintPullFeedback, resetPullFeedback } from "@/lib/pull-refresh-view";
import { enablePullDrag } from "@/lib/pull-refresh-input";

type Phase = "idle" | "pulling" | "ready" | "refreshing" | "settling";
type Controls = { load: () => void; settle: (done?: () => void) => void };
const RefreshingContext = createContext(false);
export const useTimelineRefreshing = () => useContext(RefreshingContext);

export function PullToRefresh({ children, onRefresh }: { children: ReactNode; onRefresh: () => Promise<unknown> }) {
  const root = useRef<HTMLDivElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const indicator = useRef<HTMLDivElement>(null);
  const controls = useRef<Controls | null>(null);
  const callback = useRef(onRefresh);
  callback.current = onRefresh;
  const busy = useRef(false);
  const alive = useRef(true);
  const refreshAbort = useRef<AbortController | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState("");
  const run = async () => {
    if (busy.current || !controls.current) return;
    const abort = new AbortController();
    refreshAbort.current = abort;
    busy.current = true; setError(""); controls.current.load();
    const active = () => alive.current && !abort.signal.aborted && refreshAbort.current === abort;
    try {
      // The release handler starts CSS rotation immediately; paint it before updating the list.
      await nextPaint();
      if (!active()) return;
      await callback.current();
      await nextPaint();
      if (content.current && active()) await waitForVisibleImages(content.current, abort.signal);
      await nextPaint();
    }
    catch { if (active()) setError("Chưa làm mới được. Kiểm tra kết nối rồi thử lại nhé."); }
    finally {
      if (active()) controls.current?.settle(() => {
        if (refreshAbort.current === abort) { busy.current = false; refreshAbort.current = null; }
      });
      else if (refreshAbort.current === abort) { busy.current = false; refreshAbort.current = null; }
    }
  };
  const runRef = useRef(run);
  runRef.current = run;
  useLayoutEffect(() => {
    alive.current = true;
    const element = root.current, scroller = viewport.current;
    if (!element || !scroller) return;
    if (content.current && indicator.current) {
      resetPullFeedback(element, content.current, indicator.current);
      setPhase("idle");
    }
    scroller.scrollTop = 0;
    const gesture = new PullRefreshGesture();
    let finger: number | null = null;
    let settleTimer: ReturnType<typeof setTimeout> | undefined;
    let frame = 0;
    let currentPhase: Phase = "idle";
    let visual = { distance: 0, progress: 0 };
    let settleDone: (() => void) | undefined;
    let heldScrollTop: number | null = null;
    const atTop = () => scroller.scrollTop <= 2;
    const blocked = (target: EventTarget | null) => target instanceof Element && !!target.closest('input, textarea, select, [contenteditable="true"], dialog, [popover]');
    const overlayOpen = () => !!document.querySelector('dialog[open], [popover]:popover-open');
    const changePhase = (next: Phase) => {
      if (currentPhase === next) return;
      currentPhase = next; element.dataset.state = next; setPhase(next);
    };
    const paint = (distance: number, progress: number) => {
      visual = { distance, progress };
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (content.current && indicator.current) paintPullFeedback(content.current, indicator.current, visual.distance, visual.progress);
      });
    };
    const settled = () => {
      if (currentPhase !== "settling") return;
      clearTimeout(settleTimer); cancelAnimationFrame(frame); frame = 0;
      heldScrollTop = null;
      if (content.current) content.current.style.transform = "translate3d(0, 0, 0)";
      changePhase("idle"); delete element.dataset.spinning; delete element.dataset.loading;
      settleDone?.(); settleDone = undefined;
    };
    const settle = (done?: () => void) => {
      clearTimeout(settleTimer);
      gesture.cancel(); finger = null; settleDone = done;
      heldScrollTop = scroller.scrollTop;
      changePhase("settling"); paint(0, 0);
      // Only an animation-completion fallback, never a release detector.
      settleTimer = setTimeout(settled, 320);
    };
    controls.current = {
      load: () => {
        clearTimeout(settleTimer); gesture.cancel(); finger = null;
        heldScrollTop = 0; scroller.scrollTop = 0;
        // Resume the existing CSS spinner synchronously in pointerup / touchend.
        element.dataset.spinning = "true"; element.dataset.loading = "true";
        changePhase("refreshing"); paint(Math.min(PULL_MAX, Math.max(80, visual.distance)), 1);
      },
      settle,
    };
    const present = (next: PullState) => {
      if (!next.captured) {
        if (currentPhase === "pulling" || currentPhase === "ready") { changePhase("pulling"); paint(0, 0); }
        return;
      }
      clearTimeout(settleTimer);
      changePhase(next.ready ? "ready" : "pulling"); paint(next.distance, next.progress);
    };
    const cancel = () => {
      gesture.cancel(); finger = null;
      if (alive.current && !busy.current && (currentPhase === "pulling" || currentPhase === "ready")) settle();
    };
    const release = (ready: boolean) => {
      if (ready) void runRef.current();
      else if (currentPhase === "pulling" || currentPhase === "ready") settle();
    };
    const drag = enablePullDrag(element, {
      atTop,
      canStart: (target) => !busy.current && currentPhase !== "settling" && finger === null && !blocked(target) && !overlayOpen(),
      onProgress: present,
      onRelease: release,
      onCancel: cancel,
    });
    const touchStart = (event: TouchEvent) => {
      drag.cancel();
      if (busy.current || currentPhase === "settling") return;
      if (event.touches.length !== 1 || blocked(event.target) || overlayOpen()) { cancel(); return; }
      const touch = event.touches[0]!;
      finger = touch.identifier; gesture.begin(touch.clientX, touch.clientY, atTop());
    };
    const touchMove = (event: TouchEvent) => {
      if (busy.current || currentPhase === "settling") { if (event.cancelable && !overlayOpen()) event.preventDefault(); return; }
      if (finger === null) return;
      if (event.touches.length !== 1) { cancel(); return; }
      const touch = Array.from(event.touches).find((entry) => entry.identifier === finger);
      if (!touch) { cancel(); return; }
      const next = gesture.move(touch.clientX, touch.clientY, atTop());
      if (gesture.blocksNativeScroll() && event.cancelable) event.preventDefault();
      present(next);
    };
    const touchEnd = () => {
      if (finger === null) return;
      finger = null; release(gesture.release());
    };
    const wheel = (event: WheelEvent) => {
      // Two-finger scrolling is ordinary native scrolling, never a refresh trigger.
      if ((busy.current || currentPhase === "settling") && !overlayOpen() && !blocked(event.target) && event.cancelable) event.preventDefault();
    };
    const scroll = () => {
      if (heldScrollTop !== null && scroller.scrollTop !== heldScrollTop) scroller.scrollTop = heldScrollTop;
    };
    const cancelInput = () => { drag.cancel(); cancel(); };
    const visibility = () => { if (document.hidden) cancelInput(); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape" && !busy.current) cancelInput(); };
    const transitionEnd = (event: TransitionEvent) => { if (event.target === content.current && event.propertyName === "transform") settled(); };
    scroller.addEventListener("touchstart", touchStart, { passive: true });
    scroller.addEventListener("touchmove", touchMove, { passive: false });
    scroller.addEventListener("touchend", touchEnd, { passive: true });
    scroller.addEventListener("touchcancel", cancel, { passive: true });
    scroller.addEventListener("wheel", wheel, { passive: false });
    scroller.addEventListener("scroll", scroll, { passive: true });
    element.addEventListener("transitionend", transitionEnd);
    window.addEventListener("blur", cancelInput); document.addEventListener("visibilitychange", visibility); document.addEventListener("keydown", escape);
    return () => {
      alive.current = false; busy.current = false; controls.current = null;
      refreshAbort.current?.abort(); refreshAbort.current = null;
      clearTimeout(settleTimer); cancelAnimationFrame(frame); drag.destroy();
      scroller.removeEventListener("touchstart", touchStart); scroller.removeEventListener("touchmove", touchMove);
      scroller.removeEventListener("touchend", touchEnd); scroller.removeEventListener("touchcancel", cancel); scroller.removeEventListener("wheel", wheel);
      scroller.removeEventListener("scroll", scroll); element.removeEventListener("transitionend", transitionEnd);
      window.removeEventListener("blur", cancelInput); document.removeEventListener("visibilitychange", visibility); document.removeEventListener("keydown", escape);
    };
  }, []);
  const loading = phase === "refreshing" || phase === "settling";
  const label = phase === "refreshing" ? "Đang làm mới nội dung" : phase === "ready" ? "Thả để làm mới" : "Kéo xuống để làm mới";
  return <RefreshingContext value={loading}><div ref={root} className="pull-refresh" aria-busy={phase === "refreshing"}>
    <button className="pull-refresh-grip" data-pull-handle type="button" title="Nhấn giữ và kéo xuống để làm mới · Bấm để làm mới" aria-label="Làm mới nội dung — nhấn giữ và kéo xuống, hoặc bấm" disabled={loading} onClick={() => void run()}><span aria-hidden="true" /></button>
    <div ref={indicator} className="pull-refresh-indicator" aria-hidden="true">
      <div className="pull-refresh-spinner-container"><div className="pull-refresh-rotor"><div className="pull-refresh-spinner" /></div>
        <div className="pull-refresh-caption">
          <span className="pull-refresh-hint">{label}</span>
          <div className="pull-refresh-loader"><span>Đang làm mới</span><div className="pull-refresh-words">{["câu chuyện", "khoảnh khắc", "bảng tin", "ngày đi làm", "câu chuyện"].map((word, index) => <span className="pull-refresh-word" key={index}>{word}</span>)}</div></div>
        </div>
      </div>
    </div>
    <span className="sr-only" role="status" aria-live="polite">{phase === "idle" || phase === "settling" ? "" : label}</span>
    <div ref={viewport} className="pull-refresh-viewport" tabIndex={0} role="region" aria-label="Nội dung bảng tin và khoảnh khắc">
      <div ref={content} className="pull-refresh-content">
        {error && <div className="pull-refresh-error" role="alert">{error}<button onClick={() => void run()}>Thử lại</button></div>}
        {children}
      </div>
    </div>
  </div></RefreshingContext>;
}
