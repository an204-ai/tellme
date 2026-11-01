/** Touch/pen long press supplements mouse hover; moving to scroll always cancels. */
export function enableLongPress(element: HTMLElement, show: () => void, delay = 420) {
  let held: { id: number; x: number; y: number } | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let suppressClick = false;
  const cancel = () => { clearTimeout(timer); held = undefined; };
  const down = (event: PointerEvent) => {
    if (event.pointerType === "mouse" || event.button !== 0 || event.isPrimary === false) return;
    cancel(); suppressClick = false;
    held = { id: event.pointerId, x: event.clientX, y: event.clientY };
    timer = setTimeout(() => { if (held) { suppressClick = true; show(); } }, delay);
  };
  const move = (event: PointerEvent) => {
    if (held?.id === event.pointerId && Math.hypot(event.clientX - held.x, event.clientY - held.y) > 10) cancel();
  };
  const up = (event: PointerEvent) => { if (held?.id === event.pointerId) cancel(); };
  const click = (event: MouseEvent) => {
    // Keyboard activation remains available after a touch long press.
    if (suppressClick && event.detail !== 0) { suppressClick = false; event.preventDefault(); event.stopImmediatePropagation(); }
  };
  const menu = (event: Event) => { if (held || suppressClick) event.preventDefault(); };
  element.addEventListener("pointerdown", down);
  element.addEventListener("click", click, true);
  element.addEventListener("contextmenu", menu);
  window.addEventListener("pointermove", move, { passive: true });
  window.addEventListener("pointerup", up);
  window.addEventListener("pointercancel", up);
  window.addEventListener("scroll", cancel, true);
  window.addEventListener("blur", cancel);
  return () => {
    cancel(); element.removeEventListener("pointerdown", down); element.removeEventListener("click", click, true); element.removeEventListener("contextmenu", menu);
    window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); window.removeEventListener("pointercancel", up);
    window.removeEventListener("scroll", cancel, true); window.removeEventListener("blur", cancel);
  };
}
