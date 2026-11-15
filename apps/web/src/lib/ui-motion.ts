/** Tellme motion: a shared spatial grammar, never a gate before an action. */
export const uiMotion = { arrive: 460, leave: 460, content: 380, feedback: 140, easing: "cubic-bezier(.16,1,.3,1)", exitEasing: "cubic-bezier(.4,0,.2,1)" } as const;
export type MotionKind = "surface" | "page" | "modal" | "panel";
export type MotionOrigin = { x: number; y: number; at: number; identity?: { key: string; node: HTMLElement; rect: DOMRect } };
let origin: MotionOrigin | undefined;
const running = new WeakMap<HTMLElement, Animation>();
export function reducedMotion() {
  return matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.classList.contains("reduce-motion");
}
export function motionOrigin() {
  if (origin && Date.now() - origin.at < 5000) return { ...origin };
  const active = document.activeElement;
  if (!(active instanceof HTMLElement) || !active.matches("button,a,summary,[role=tab]")) return;
  const rect = active.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, at: Date.now() };
}
function visualCopy(node: HTMLElement) {
  const copy = node.cloneNode(true) as HTMLElement;
  copy.removeAttribute("id");
  copy.querySelectorAll("[id]").forEach((child) => child.removeAttribute("id"));
  copy.setAttribute("aria-hidden", "true"); copy.inert = true;
  copy.dataset.motionGhost = "true";
  copy.style.pointerEvents = "none";
  return copy;
}
/** Only a visual snapshot survives an unmount. Focus, live regions and controls do not. */
export function retainSurfaceExit(node: HTMLElement, kind: MotionKind = "surface", from?: MotionOrigin, onlyAfterRemoval = false) {
  if (!node.isConnected || node.closest('[data-motion-ghost]')) return;
  const rect = node.getBoundingClientRect();
  if (rect.width < 1 || rect.height < 1) return;
  const copy = visualCopy(node);
  Object.assign(copy.style, { position: "fixed", inset: "auto", top: `${rect.top}px`, left: `${rect.left}px`, width: `${rect.width}px`, height: `${rect.height}px`, maxHeight: "none", maxWidth: "none", margin: "0", zIndex: "2147483646", transform: "none", overflow: "hidden" });
  copy.removeAttribute("popover");
  const parent = node.parentElement;
  const play = () => {
    // React StrictMode replays effects without removing DOM. Do not create a phantom exit.
    if (onlyAfterRemoval && node.isConnected) return;
    // Preserve the native backdrop when a controller removes the modal before its exit.
    // A replacement real dialog already owns the top layer; never cover it with a ghost.
    const nativeExit = copy instanceof HTMLDialogElement && !document.querySelector('dialog[open]:not([data-motion-ghost])');
    if (nativeExit) copy.removeAttribute("open");
    (parent?.isConnected ? parent : document.body).appendChild(copy);
    if (nativeExit) { copy.dataset.modalState = "closing"; copy.showModal(); }
    const animation = animateSurface(copy, "leave", kind, from);
    void animation.finished.catch(() => {}).finally(() => { if (nativeExit && copy instanceof HTMLDialogElement) copy.close(); copy.remove(); });
  };
  if (onlyAfterRemoval) queueMicrotask(play); else play();
}
function connectIdentity(root: HTMLElement, from?: MotionOrigin) {
  if (!from?.identity || reducedMotion()) return;
  const identity = from.identity;
  const matches = [...root.querySelectorAll<HTMLElement>("[data-motion-key]")].filter((e) => e.dataset.motionKey === identity.key && e.getBoundingClientRect().width > 0);
  const target = matches.find((e) => e.matches(".profile-portrait") || e.closest(".chat-header, .profile-hero, .photo-group-detail-heading")) || matches.at(-1);
  if (!target) return;
  if (origin?.identity === identity) origin.identity = undefined;
  const dest = target.getBoundingClientRect(), src = identity.rect;
  const copy = visualCopy(identity.node);
  Object.assign(copy.style, { position: "fixed", left: `${dest.left}px`, top: `${dest.top}px`, width: `${dest.width}px`, height: `${dest.height}px`, margin: "0", zIndex: "2147483647", overflow: "hidden", transformOrigin: "0 0" });
  // Stay in the native dialog's top layer when needed.
  (root.closest("dialog") || document.body).appendChild(copy);
  target.style.visibility = "hidden";
  const animation = copy.animate([{ transform: `translate(${src.left - dest.left}px,${src.top - dest.top}px) scale(${src.width / dest.width},${src.height / dest.height})`, opacity: 1 }, { transform: "none", opacity: 1 }], { duration: uiMotion.arrive, easing: uiMotion.easing });
  void animation.finished.catch(() => {}).finally(() => { target.style.visibility = ""; copy.remove(); });
}
export function animateSurface(node: HTMLElement, phase: "arrive" | "leave", kind: MotionKind = "surface", from = motionOrigin()) {
  running.get(node)?.cancel();
  const entering = phase === "arrive", reduced = reducedMotion();
  const rect = node.getBoundingClientRect();
  const baseTransform = kind === "page" ? "none" : getComputedStyle(node).transform;
  const compose = (value: string) => baseTransform === "none" ? value : `${baseTransform} ${value}`;
  const dx = from ? Math.max(-160, Math.min(160, from.x - rect.left - rect.width / 2)) : 0;
  const dy = from ? Math.max(-160, Math.min(200, from.y - rect.top - rect.height / 2)) : 20;
  const resting: Keyframe = { opacity: 1, transform: baseTransform, clipPath: "inset(0% 0% 0% 0% round 0px)" };
  // Never transform the route: its fixed controls keep their containing block and hit targets.
  const folded: Keyframe = reduced ? { opacity: entering ? .35 : 0 } : kind === "page"
    ? { opacity: entering ? .2 : 0, clipPath: `inset(0% 0% ${entering ? 4 : 2}% 0% round 12px)` }
    : { opacity: entering ? .08 : 0, transform: compose(kind === "modal" ? entering ? "translateY(20px) scale(.24)" : `translate(${dx}px,${dy}px) scale(.16)` : kind === "panel" ? `translateY(${entering ? 22 : 16}px) scale(.92)` : `translateY(${entering ? 14 : 10}px) scale(.93)`) };
  // React may remove a dismissed surface on the next frame. Keep its invisible
  // end state until removal instead of repainting the resting surface in between.
  const animation = node.animate(entering ? [folded, resting] : [resting, folded], { duration: reduced ? 100 : entering ? kind === "page" ? uiMotion.content : uiMotion.arrive : uiMotion.leave, easing: entering ? uiMotion.easing : uiMotion.exitEasing, fill: entering ? "none" : "forwards" });
  running.set(node, animation);
  if (entering && kind === "page") connectIdentity(node, from);
  if (entering && !reduced) {
    const items = node.querySelectorAll<HTMLElement>(".photo-group-form > *, .new-conversation-list > button, .settings-section, .photo-group-detail-heading, .photo-group-member-avatars");
    [...items].slice(0, 7).forEach((item, i) => item.animate([{ opacity: .25, transform: "translateY(12px)" }, { opacity: 1, transform: "none" }], { duration: uiMotion.content, delay: Math.min(i * 24, 120), easing: uiMotion.easing }));
  }
  return animation;
}

/** Captures intent once. No MutationObserver over arbitrary React rerenders/typing. */
export function installMotionSystem() {
  // Programmatic focus after a tap must not inherit the browser's keyboard heuristic.
  const pointerInput = () => { document.documentElement.dataset.inputMethod = "pointer"; };
  const keyboardInput = (event: KeyboardEvent) => {
    if (event.key === "Tab" || event.key.startsWith("Arrow")) document.documentElement.dataset.inputMethod = "keyboard";
  };
  document.documentElement.dataset.inputMethod = "pointer";
  document.addEventListener("pointerdown", pointerInput, true);
  document.addEventListener("keydown", keyboardInput, true);
  const remember = (event: MouseEvent) => {
    const trigger = event.target instanceof Element ? event.target.closest<HTMLElement>("button,a,summary,[role=tab]") : null;
    if (!trigger || trigger.closest('[data-motion-ghost]')) return;
    if (event.type === "click") document.querySelectorAll<HTMLElement>("details[open] .menu-panel").forEach((panel) => {
      const details = panel.closest("details");
      if (!details?.contains(trigger) || trigger.closest("summary,.menu-panel button,.menu-panel a")) retainSurfaceExit(panel, "panel");
    });
    if (event.type === "click" && trigger instanceof HTMLAnchorElement && trigger.origin === location.origin && trigger.pathname !== location.pathname && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && !trigger.target && !trigger.hasAttribute("download")) {
      const main = document.getElementById("main-content");
      if (main && !(location.pathname.startsWith("/community/messages") && trigger.pathname.startsWith("/community/messages"))) retainSurfaceExit(main, "page");
    }
    const r = trigger.getBoundingClientRect();
    const identity = trigger.querySelector<HTMLElement>("[data-motion-key]");
    origin = { x: r.left + r.width / 2, y: r.top + r.height / 2, at: Date.now(), ...(identity ? { identity: { key: identity.dataset.motionKey!, node: visualCopy(identity), rect: identity.getBoundingClientRect() } } : {}) };
  };
  const toggle = (event: Event) => {
    const node = event.target;
    if (!(node instanceof HTMLElement) || node.closest('[data-motion-ghost]')) return;
    if (node instanceof HTMLDetailsElement) {
      const panel = node.querySelector<HTMLElement>(".menu-panel");
      if (node.open && panel) animateSurface(panel, "arrive", "panel");
      return;
    }
    if (!node.hasAttribute("popover")) return;
    const state = (event as ToggleEvent).newState;
    if (event.type === "beforetoggle" && state === "closed") retainSurfaceExit(node, "panel");
    if (event.type === "toggle" && state === "open") animateSurface(node, "arrive", "panel");
  };
  document.addEventListener("pointerdown", remember, true);
  document.addEventListener("click", remember, true);
  document.addEventListener("toggle", toggle, true);
  document.addEventListener("beforetoggle", toggle, true);
  return () => { document.removeEventListener("pointerdown", pointerInput, true); document.removeEventListener("keydown", keyboardInput, true); delete document.documentElement.dataset.inputMethod; document.removeEventListener("pointerdown", remember, true); document.removeEventListener("click", remember, true); document.removeEventListener("toggle", toggle, true); document.removeEventListener("beforetoggle", toggle, true); document.querySelectorAll('[data-motion-ghost]').forEach((e) => e.remove()); origin = undefined; };
}
