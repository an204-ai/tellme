/** 120px of deliberate travel produces 54px of resisted motion. */
export const replyDragDistance = (travel: number) => Math.min(72, Math.max(0, travel) * .45);
export const replyDragReady = (travel: number) => replyDragDistance(travel) >= 54;

export function enableReplyDrag(element: HTMLElement, reply: () => void, own = false) {
  let pointer: { id: number; x: number; y: number; armed: boolean; locked: boolean; travel: number } | undefined;
  let hold: ReturnType<typeof setTimeout> | undefined;
  let suppressUntil = 0;
  const direction = own ? -1 : 1;
  const reset = () => {
    clearTimeout(hold);
    const id = pointer?.id; pointer = undefined;
    if (id !== undefined && element.hasPointerCapture(id)) element.releasePointerCapture(id);
    element.classList.remove('is-dragging', 'is-reply-ready', 'is-reply-holding');
    element.style.removeProperty('--reply-drag-x');
  };
  const down = (event: PointerEvent) => {
    if (event.button !== 0 || !event.isPrimary || (event.target as Element).closest('button, a, input, textarea')) return;
    reset();
    if (event.pointerType === 'mouse') event.preventDefault();
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, armed: event.pointerType === 'mouse', locked: false, travel: 0 };
    if (!pointer.armed) hold = setTimeout(() => {
      if (!pointer) return;
      pointer.armed = true; element.classList.add('is-reply-holding');
    }, 280);
  };
  const move = (event: PointerEvent) => {
    const state = pointer;
    if (!state || state.id !== event.pointerId) return;
    const dx = (event.clientX - state.x) * direction, dy = Math.abs(event.clientY - state.y);
    if (!state.armed) { if (Math.hypot(dx, dy) > 10) reset(); return; }
    if (!state.locked) {
      if (dy > 12 && dy > Math.abs(dx)) { reset(); return; }
      if (dx < 10 || dx < dy * 1.4) return;
      state.locked = true; element.setPointerCapture(event.pointerId);
    }
    event.preventDefault();
    state.travel = Math.max(0, dx);
    element.classList.add('is-dragging');
    element.classList.toggle('is-reply-ready', replyDragReady(state.travel));
    element.style.setProperty('--reply-drag-x', `${replyDragDistance(state.travel) * direction}px`);
  };
  const finish = (event: PointerEvent) => {
    if (!pointer || pointer.id !== event.pointerId) return;
    const ready = event.type === 'pointerup' && pointer.locked && replyDragReady(pointer.travel);
    if (pointer.locked) { event.preventDefault(); suppressUntil = Date.now() + 400; }
    reset(); if (ready) reply();
  };
  const click = (event: MouseEvent) => {
    if (Date.now() < suppressUntil) { event.preventDefault(); event.stopImmediatePropagation(); }
  };
  const menu = (event: Event) => { if (pointer?.armed) event.preventDefault(); };
  const drag = (event: DragEvent) => { if (pointer) event.preventDefault(); };
  element.addEventListener('pointerdown', down);
  element.addEventListener('contextmenu', menu);
  element.addEventListener('dragstart', drag);
  element.addEventListener('click', click, true);
  window.addEventListener('pointermove', move, { passive: false });
  window.addEventListener('pointerup', finish);
  window.addEventListener('pointercancel', finish);
  window.addEventListener('blur', reset);
  return () => {
    reset(); element.removeEventListener('pointerdown', down); element.removeEventListener('contextmenu', menu);
    element.removeEventListener('dragstart', drag); element.removeEventListener('click', click, true);
    window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', finish);
    window.removeEventListener('pointercancel', finish); window.removeEventListener('blur', reset);
  };
}
