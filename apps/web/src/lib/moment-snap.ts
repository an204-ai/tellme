/** A deliberate drag commits one page; short gestures return to their starting photo. */
export function momentSnapDirection(distance: number, velocity: number, height: number) {
  const threshold = Math.min(112, Math.max(72, height * .14));
  if (Math.abs(distance) >= threshold || Math.abs(distance) >= 68 && distance * velocity > 0 && Math.abs(velocity) >= .65)
    return Math.sign(distance);
  return 0;
}

/** ScrollTop is painted once per frame. React only observes the settled page, never the drag. */
export function magneticMomentScroll(root: HTMLElement) {
  let destination: number | null = null;
  let frame = 0, settle = 0, wheelEnd: ReturnType<typeof setTimeout> | undefined;
  let wheelAmount = 0, wheelLocked = false, touch: { id: number; x: number; y: number; top: number; page: number; time: number; lastY: number; lastTime: number; velocity: number; vertical: boolean } | undefined;
  const reduced = () => document.documentElement.classList.contains("reduce-motion") || matchMedia("(prefers-reduced-motion: reduce)").matches;
  const pages = () => Array.from(root.querySelectorAll<HTMLElement>("[data-page]"));
  const nearest = () => pages().reduce((best, page, index, all) => Math.abs(page.offsetTop - root.scrollTop) < Math.abs(all[best]!.offsetTop - root.scrollTop) ? index : best, 0);
  const blocked = (target: EventTarget | null) => target instanceof Element && !!target.closest("dialog, input, textarea, select, [contenteditable=true], [popover], .stream-caption.is-expanded");
  const cancel = () => { cancelAnimationFrame(frame); cancelAnimationFrame(settle); frame = settle = 0; };
  const go = (index: number, immediate = false) => {
    cancel();
    const all = pages(), page = all[Math.max(0, Math.min(all.length - 1, index))];
    if (!page) return;
    const from = root.scrollTop, to = page.offsetTop;
    destination = all.indexOf(page);
    root.dataset.magnetic = "settling";
    if (immediate || reduced() || Math.abs(from - to) < 1) { root.scrollTop = to; delete root.dataset.magnetic; return; }
    const start = performance.now(), duration = Math.min(380, 280 + Math.abs(to - from) * .1);
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      root.scrollTop = from + (to - from) * (1 - Math.pow(1 - t, 4));
      if (t < 1) settle = requestAnimationFrame(tick);
      else { settle = 0; root.scrollTop = to; delete root.dataset.magnetic; }
    };
    settle = requestAnimationFrame(tick);
  };
  const onWheel = (event: WheelEvent) => {
    if (event.ctrlKey || event.metaKey || blocked(event.target) || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
    const current = pages()[nearest()];
    // Very short accessibility/keyboard viewports can still scroll inside an oversized page.
    if (current && current.offsetHeight > root.clientHeight + 3) return;
    event.preventDefault();
    clearTimeout(wheelEnd);
    wheelEnd = setTimeout(() => { wheelLocked = false; wheelAmount = 0; }, 190);
    if (wheelLocked) return;
    const delta = event.deltaY * (event.deltaMode === 1 ? 18 : event.deltaMode === 2 ? root.clientHeight : 1);
    if (Math.sign(delta) !== Math.sign(wheelAmount)) wheelAmount = 0;
    wheelAmount += delta;
    if (Math.abs(wheelAmount) >= 76) { wheelLocked = true; go((settle && destination !== null ? destination : nearest()) + Math.sign(wheelAmount)); wheelAmount = 0; }
  };
  const onStart = (event: TouchEvent) => {
    if (event.touches.length > 1) { if (touch) go(touch.page, true); touch = undefined; return; }
    if (event.touches.length !== 1 || blocked(event.target)) return;
    const current = pages()[nearest()];
    if (current && current.offsetHeight > root.clientHeight + 3) return;
    if (settle && destination !== null) go(destination, true);
    cancel(); delete root.dataset.magnetic;
    const finger = event.touches[0]!;
    touch = { id: finger.identifier, x: finger.clientX, y: finger.clientY, top: root.scrollTop, page: nearest(), time: performance.now(), lastY: finger.clientY, lastTime: performance.now(), velocity: 0, vertical: false };
  };
  const onMove = (event: TouchEvent) => {
    if (!touch) return;
    if (event.touches.length !== 1) { go(touch.page); touch = undefined; return; }
    const finger = Array.from(event.touches).find((finger) => finger.identifier === touch!.id);
    if (!finger) return;
    const dx = finger.clientX - touch.x, dy = finger.clientY - touch.y;
    if (!touch.vertical) {
      if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) { touch = undefined; return; }
      if (Math.abs(dy) < 8 || Math.abs(dy) < Math.abs(dx) * 1.15) return;
      touch.vertical = true; root.dataset.magnetic = "dragging";
    }
    if (event.cancelable) event.preventDefault();
    const now = performance.now();
    touch.velocity = (touch.lastY - finger.clientY) / Math.max(1, now - touch.lastTime);
    touch.lastY = finger.clientY; touch.lastTime = now;
    const all = pages(), previous = all[Math.max(0, touch.page - 1)]!.offsetTop, next = all[Math.min(all.length - 1, touch.page + 1)]!.offsetTop;
    const top = Math.max(previous, Math.min(next, touch.top - dy * .72));
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => { frame = 0; root.scrollTop = top; });
  };
  const finish = (cancelled = false) => {
    const gesture = touch; touch = undefined;
    if (!gesture?.vertical) return;
    const distance = (gesture.y - gesture.lastY) * .72;
    const velocity = performance.now() - gesture.lastTime < 100 ? gesture.velocity : 0;
    go(gesture.page + (cancelled ? 0 : momentSnapDirection(distance, velocity, root.clientHeight)));
  };
  const end = () => finish(), abort = () => finish(true);
  root.addEventListener("wheel", onWheel, { passive: false });
  root.addEventListener("touchstart", onStart, { passive: true });
  root.addEventListener("touchmove", onMove, { passive: false });
  root.addEventListener("touchend", end, { passive: true });
  root.addEventListener("touchcancel", abort, { passive: true });
  return { go, destroy() { cancel(); clearTimeout(wheelEnd); delete root.dataset.magnetic; root.removeEventListener("wheel", onWheel); root.removeEventListener("touchstart", onStart); root.removeEventListener("touchmove", onMove); root.removeEventListener("touchend", end); root.removeEventListener("touchcancel", abort); } };
}
