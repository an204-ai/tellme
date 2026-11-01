/** Mouse dragging supplements native touch/trackpad scrolling without hijacking it. */
export function enableDragScroll(element: HTMLElement) {
  let gesture: { id: number; x: number; y: number; scroll: number; moved: boolean } | undefined;
  let suppressClick = false;
  let resetClick: ReturnType<typeof setTimeout> | undefined;
  const finish = () => {
    const current = gesture;
    gesture = undefined;
    delete element.dataset.dragging;
    if (current && element.hasPointerCapture(current.id)) element.releasePointerCapture(current.id);
    if (current?.moved) {
      suppressClick = true;
      clearTimeout(resetClick);
      resetClick = setTimeout(() => { suppressClick = false; }, 0);
    }
  };
  const down = (event: PointerEvent) => {
    if (event.pointerType !== "mouse" || event.button !== 0 || gesture) return;
    clearTimeout(resetClick);
    suppressClick = false;
    gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, scroll: element.scrollLeft, moved: false };
  };
  const move = (event: PointerEvent) => {
    if (!gesture || event.pointerId !== gesture.id) return;
    if (!(event.buttons & 1)) { finish(); return; }
    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;
    if (!gesture.moved) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 6) return;
      if (Math.abs(dy) > Math.abs(dx)) { finish(); return; }
      gesture.moved = true;
      element.dataset.dragging = "true";
      element.setPointerCapture(gesture.id);
    }
    event.preventDefault();
    element.scrollLeft = gesture.scroll - dx;
  };
  const up = (event: PointerEvent) => { if (gesture?.id === event.pointerId) finish(); };
  const lost = (event: PointerEvent) => { if (gesture?.id === event.pointerId) finish(); };
  const click = (event: MouseEvent) => {
    if (suppressClick) { event.preventDefault(); event.stopImmediatePropagation(); }
  };
  const drag = (event: DragEvent) => event.preventDefault();
  element.addEventListener("pointerdown", down);
  element.addEventListener("lostpointercapture", lost);
  element.addEventListener("click", click, true);
  element.addEventListener("dragstart", drag);
  window.addEventListener("pointermove", move, { passive: false });
  window.addEventListener("pointerup", up);
  window.addEventListener("pointercancel", up);
  window.addEventListener("blur", finish);
  return () => {
    finish();
    clearTimeout(resetClick);
    element.removeEventListener("pointerdown", down);
    element.removeEventListener("lostpointercapture", lost);
    element.removeEventListener("click", click, true);
    element.removeEventListener("dragstart", drag);
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
    window.removeEventListener("pointercancel", up);
    window.removeEventListener("blur", finish);
  };
}
