import { playInterfaceSound } from "./interface-sounds";

type MonthSwipeOptions = {
  canNavigate: (direction: number) => boolean;
  onNavigate: (direction: number) => void;
};

export function enableMonthSwipe(element: HTMLElement, viewport: HTMLElement, track: HTMLElement, options: MonthSwipeOptions) {
  let gesture: { kind: "pointer" | "touch"; id: number; x: number; y: number; moved: boolean } | null = null;
  let wheelGesture: { x: number; y: number; axis: "x" | "y" | null } | null = null;
  let offset = 0;
  let settling = false;
  let destination = 0;
  let velocity = 0;
  let lastSample: { distance: number; at: number } | null = null;
  let motionSamples: { distance: number; at: number }[] = [];
  let suppressClick = false;
  let clickTimer: ReturnType<typeof setTimeout> | undefined;
  let wheelTimer: ReturnType<typeof setTimeout> | undefined;
  let settleTimer: ReturnType<typeof setTimeout> | undefined;
  const width = () => Math.max(1, viewport.clientWidth);
  const blockClick = () => {
    suppressClick = true;
    clearTimeout(clickTimer);
    clickTimer = setTimeout(() => { suppressClick = false; }, 500);
  };
  const paint = (distance: number) => {
    offset = distance;
    track.style.setProperty("--journey-offset", `${distance}px`);
  };
  const reset = () => {
    clearTimeout(settleTimer);
    clearTimeout(wheelTimer);
    gesture = null;
    wheelGesture = null;
    settling = false;
    destination = 0;
    velocity = 0;
    lastSample = null;
    motionSamples = [];
    delete element.dataset.swiping;
    delete element.dataset.settling;
    track.style.removeProperty("--journey-duration");
    paint(0);
  };
  const complete = () => {
    if (!settling) return;
    clearTimeout(settleTimer);
    const direction = destination;
    destination = 0;
    if (direction && options.canNavigate(direction)) options.onNavigate(direction);
    else reset();
    // React resets after moving the month pages, in a layout effect before paint.
  };
  const settle = (direction: number) => {
    clearTimeout(wheelTimer);
    wheelGesture = null;
    if (settling) return;
    destination = direction && options.canNavigate(direction) ? direction : 0;
    if (destination) playInterfaceSound("slide");
    settling = true;
    delete element.dataset.swiping;
    element.dataset.settling = "true";
    const target = -destination * width();
    const remaining = Math.abs(target - offset);
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const duration = reduced || remaining < .5 ? 0 : Math.round(240 + Math.min(1, remaining / width()) * 140);
    track.style.setProperty("--journey-duration", `${duration}ms`);
    void track.offsetWidth;
    paint(target);
    if (!duration) complete();
    else settleTimer = setTimeout(complete, duration + 80);
  };
  const dragTo = (distance: number) => {
    const at = performance.now();
    if (lastSample && at > lastSample.at && distance !== lastSample.distance) {
      const delta = distance - lastSample.distance;
      if (Math.abs(delta) > 8 && velocity && Math.sign(delta) !== Math.sign(velocity)) motionSamples = [lastSample];
      motionSamples.push({ distance, at });
      while (motionSamples.length > 2 && at - motionSamples[0]!.at > 100) motionSamples.shift();
      const start = motionSamples[0]!;
      velocity = (distance - start.distance) / Math.max(8, at - start.at);
    }
    lastSample = { distance, at };
    const direction = distance < 0 ? 1 : -1;
    element.dataset.swiping = "true";
    paint(options.canNavigate(direction)
      ? Math.max(-width(), Math.min(width(), distance * .82))
      : distance / (1 + Math.abs(distance) / 32));
  };
  const release = (commit: boolean) => {
    const direction = offset < 0 ? 1 : -1;
    const recent = lastSample && performance.now() - lastSample.at < 100;
    const flick = recent && Math.abs(velocity) >= .85 && Math.sign(velocity) === Math.sign(offset)
      && Math.abs(offset) >= Math.min(90, width() * .22);
    settle(commit && (Math.abs(offset) > width() / 2 || flick) ? direction : 0);
  };
  const begin = (kind: "pointer" | "touch", id: number, x: number, y: number) => {
    if (settling || wheelGesture || gesture) return;
    clearTimeout(clickTimer);
    suppressClick = false;
    velocity = 0;
    lastSample = { distance: 0, at: performance.now() };
    motionSamples = [lastSample];
    gesture = { kind, id, x, y, moved: false };
  };
  const update = (x: number, y: number, event?: Event) => {
    if (!gesture) return;
    const horizontal = x - gesture.x;
    const vertical = y - gesture.y;
    if (!gesture.moved) {
      if (Math.max(Math.abs(horizontal), Math.abs(vertical)) < 10) return;
      if (Math.abs(vertical) > Math.abs(horizontal)) { gesture = null; return; }
      gesture.moved = true;
      suppressClick = true;
    }
    if (event?.cancelable) event.preventDefault();
    dragTo(horizontal);
  };
  const finish = (x: number, y: number) => {
    const current = gesture;
    if (!current) return;
    if (current.moved && lastSample?.distance !== x - current.x) update(x, y);
    gesture = null;
    if (!current.moved) return;
    blockClick();
    release(true);
  };
  const cancel = () => {
    const moved = gesture?.moved || wheelGesture?.axis === "x";
    gesture = null;
    wheelGesture = null;
    clearTimeout(wheelTimer);
    if (moved && !settling) { blockClick(); release(false); }
  };
  const down = (event: PointerEvent) => {
    if (event.pointerType === "touch" || event.isPrimary === false || event.button !== 0) return;
    begin("pointer", event.pointerId, event.clientX, event.clientY);
  };
  const move = (event: PointerEvent) => {
    if (gesture?.kind === "pointer" && gesture.id === event.pointerId) update(event.clientX, event.clientY, event);
  };
  const up = (event: PointerEvent) => {
    if (gesture?.kind === "pointer" && gesture.id === event.pointerId) finish(event.clientX, event.clientY);
  };
  const pointerCancel = (event: PointerEvent) => {
    if (gesture?.kind === "pointer" && gesture.id === event.pointerId) cancel();
  };
  const touchStart = (event: TouchEvent) => {
    if (event.touches.length !== 1) { cancel(); return; }
    const touch = event.touches[0]!;
    begin("touch", touch.identifier, touch.clientX, touch.clientY);
  };
  const touchMove = (event: TouchEvent) => {
    if (event.touches.length !== 1) { cancel(); return; }
    if (gesture?.kind !== "touch") return;
    const touch = Array.from(event.touches).find((entry) => entry.identifier === gesture?.id);
    if (touch) update(touch.clientX, touch.clientY, event);
  };
  const touchEnd = (event: TouchEvent) => {
    if (gesture?.kind !== "touch") return;
    const touch = Array.from(event.changedTouches).find((entry) => entry.identifier === gesture?.id);
    if (touch) finish(touch.clientX, touch.clientY);
  };
  const wheel = (event: WheelEvent) => {
    if (event.ctrlKey || gesture) return;
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? width() : 1;
    const x = (event.shiftKey && !event.deltaX ? event.deltaY : event.deltaX) * unit;
    const y = (event.shiftKey && !event.deltaX ? 0 : event.deltaY) * unit;
    if (!x && !y) return;
    if (settling) {
      if (Math.abs(x) > Math.abs(y) * 1.2 && event.cancelable) event.preventDefault();
      return;
    }
    if (!wheelGesture) { velocity = 0; lastSample = { distance: 0, at: performance.now() }; motionSamples = [lastSample]; }
    wheelGesture ??= { x: 0, y: 0, axis: null };
    const current = wheelGesture;
    clearTimeout(wheelTimer);
    current.x += x;
    current.y += y;
    if (!current.axis && Math.max(Math.abs(current.x), Math.abs(current.y)) >= 8) {
      current.axis = Math.abs(current.x) > Math.abs(current.y) * 1.2 ? "x" : "y";
    }
    if (current.axis === "x" || !current.axis && Math.abs(x) > Math.abs(y) * 1.2) {
      if (event.cancelable) event.preventDefault();
    }
    if (current.axis === "x") dragTo(-current.x);
    // Trackpads have no release event; settle only after the input stream stops.
    wheelTimer = setTimeout(() => {
      wheelGesture = null;
      // Sampled release speed is retained only for a deliberate trackpad flick.
      const recentVelocity = lastSample && performance.now() - lastSample.at < 260 ? velocity : 0;
      if (lastSample) lastSample.at = performance.now();
      velocity = recentVelocity;
      if (current.axis === "x") release(true);
    }, 180);
  };
  const click = (event: MouseEvent) => {
    if (suppressClick || settling) { event.preventDefault(); event.stopImmediatePropagation(); }
  };
  const drag = (event: DragEvent) => event.preventDefault();
  const transitionEnd = (event: TransitionEvent) => {
    if (event.target === track && event.propertyName === "transform") complete();
  };
  const resize = () => { if (gesture?.moved) blockClick(); reset(); };
  const abort = new AbortController();
  const passive = { capture: true, passive: true, signal: abort.signal };
  const active = { capture: true, passive: false, signal: abort.signal };
  element.addEventListener("pointerdown", down, passive);
  element.addEventListener("touchstart", touchStart, passive);
  element.addEventListener("touchmove", touchMove, active);
  element.addEventListener("touchend", touchEnd, passive);
  element.addEventListener("touchcancel", cancel, passive);
  element.addEventListener("wheel", wheel, active);
  element.addEventListener("click", click, active);
  element.addEventListener("dragstart", drag, active);
  track.addEventListener("transitionend", transitionEnd, { signal: abort.signal });
  window.addEventListener("pointermove", move, active);
  window.addEventListener("pointerup", up, passive);
  window.addEventListener("pointercancel", pointerCancel, passive);
  window.addEventListener("blur", cancel, { signal: abort.signal });
  window.addEventListener("resize", resize, { signal: abort.signal });
  return {
    reset,
    navigate(direction: number) {
      if (settling || !options.canNavigate(direction)) return;
      gesture = null;
      settle(direction);
    },
    destroy() { abort.abort(); reset(); clearTimeout(clickTimer); },
  };
}
