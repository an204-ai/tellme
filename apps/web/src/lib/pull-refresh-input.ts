import { PullRefreshGesture, type PullState } from "./pull-refresh.ts";

type Options = {
  atTop: () => boolean;
  canStart: (target: EventTarget | null) => boolean;
  onProgress: (state: PullState) => void;
  onRelease: (ready: boolean) => void;
  onCancel: () => void;
};

/** A real press-and-drag path: pointerup is synchronous, never inferred from wheel silence. */
export function enablePullDrag(element: HTMLElement, options: Options) {
  const gesture = new PullRefreshGesture();
  let pointer: { id: number; moved: boolean; previousSelect: string } | undefined;
  let suppressClick = false;
  let clickTimer: ReturnType<typeof setTimeout> | undefined;
  const finish = (released: boolean) => {
    const current = pointer;
    if (!current) return;
    pointer = undefined;
    const ready = released ? gesture.release() : false;
    gesture.cancel();
    element.style.userSelect = current.previousSelect;
    delete element.dataset.pullDragging;
    if (element.hasPointerCapture(current.id)) element.releasePointerCapture(current.id);
    if (!current.moved) return;
    // Click follows pointerup in the same input sequence. Suppress only that click.
    suppressClick = true;
    clearTimeout(clickTimer);
    clickTimer = setTimeout(() => { suppressClick = false; }, 0);
    if (released) options.onRelease(ready); else options.onCancel();
  };
  const down = (event: PointerEvent) => {
    if (pointer || !["mouse", "pen"].includes(event.pointerType) || event.button !== 0 || event.isPrimary === false || event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
    const target = event.target as Element | null;
    const handle = target?.closest?.("[data-pull-handle]");
    if (!handle && target?.closest?.('a, button, input, textarea, select, label, [role="button"], [contenteditable="true"], .drag-scroll, img, video')) return;
    if (!options.atTop() || !options.canStart(event.target)) return;
    clearTimeout(clickTimer); suppressClick = false;
    gesture.begin(event.clientX, event.clientY, true);
    pointer = { id: event.pointerId, moved: false, previousSelect: element.style.userSelect };
    if (handle && event.cancelable) event.preventDefault();
  };
  const move = (event: PointerEvent) => {
    if (!pointer || event.pointerId !== pointer.id) return;
    if (!(event.buttons & 1)) { finish(true); return; }
    const state = gesture.move(event.clientX, event.clientY, options.atTop());
    if (!gesture.blocksNativeScroll()) { finish(false); return; }
    if (!state.captured && !pointer.moved) return;
    if (!pointer.moved) {
      pointer.moved = true;
      element.style.userSelect = "none";
      element.dataset.pullDragging = "true";
      element.setPointerCapture(pointer.id);
    }
    if (event.cancelable) event.preventDefault();
    options.onProgress(state);
  };
  const up = (event: PointerEvent) => { if (pointer?.id === event.pointerId) finish(true); };
  const lost = (event: PointerEvent) => { if (pointer?.id === event.pointerId) finish(false); };
  const cancel = () => finish(false);
  const click = (event: MouseEvent) => { if (suppressClick) { event.preventDefault(); event.stopImmediatePropagation(); } };
  const drag = (event: DragEvent) => { if (pointer && event.cancelable) event.preventDefault(); };
  element.addEventListener("pointerdown", down);
  element.addEventListener("lostpointercapture", lost);
  element.addEventListener("click", click, true);
  element.addEventListener("dragstart", drag);
  window.addEventListener("pointermove", move, { passive: false });
  window.addEventListener("pointerup", up);
  window.addEventListener("pointercancel", lost);
  window.addEventListener("blur", cancel);
  window.addEventListener("wheel", cancel, { passive: true, capture: true });
  return {
    cancel,
    destroy() {
      cancel(); clearTimeout(clickTimer);
      element.removeEventListener("pointerdown", down); element.removeEventListener("lostpointercapture", lost);
      element.removeEventListener("click", click, true); element.removeEventListener("dragstart", drag);
      window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", lost); window.removeEventListener("blur", cancel);
      window.removeEventListener("wheel", cancel, true);
    },
  };
}
