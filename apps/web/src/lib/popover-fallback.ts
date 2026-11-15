/** Minimal auto-popover behavior for Safari versions predating the Popover API. */
export function installPopoverFallback() {
  if (typeof HTMLElement === "undefined" || "showPopover" in HTMLElement.prototype) return;
  const opened = () => [...document.querySelectorAll<HTMLElement>('[popover][data-fallback-open="true"]')];
  const change = (node: HTMLElement, open: boolean) => {
    const previous = node.dataset.fallbackOpen === "true";
    if (previous === open) return;
    if (open && node.getAttribute("popover") !== "manual") opened().filter((other) => other !== node && !other.contains(node)).forEach((other) => change(other, false));
    const before = new Event("beforetoggle");
    Object.defineProperties(before, { oldState: { value: previous ? "open" : "closed" }, newState: { value: open ? "open" : "closed" } });
    node.dispatchEvent(before);
    if (open) node.dataset.fallbackOpen = "true";
    else delete node.dataset.fallbackOpen;
    const event = new Event("toggle");
    Object.defineProperties(event, { oldState: { value: previous ? "open" : "closed" }, newState: { value: open ? "open" : "closed" } });
    node.dispatchEvent(event);
  };
  Object.defineProperties(HTMLElement.prototype, {
    showPopover: { configurable: true, value(this: HTMLElement) { change(this, true); } },
    hidePopover: { configurable: true, value(this: HTMLElement) { change(this, false); } },
    togglePopover: { configurable: true, value(this: HTMLElement, force?: boolean) { const open = force ?? this.dataset.fallbackOpen !== "true"; change(this, open); return open; } },
  });
  document.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const trigger = target?.closest<HTMLElement>("[popovertarget]");
    const node = trigger && document.getElementById(trigger.getAttribute("popovertarget") || "");
    if (node) {
      event.preventDefault();
      const action = trigger.getAttribute("popovertargetaction");
      change(node, action === "show" || action !== "hide" && node.dataset.fallbackOpen !== "true");
    } else opened().filter((node) => node.getAttribute("popover") !== "manual" && !node.contains(target)).forEach((node) => change(node, false));
  });
  document.addEventListener("keydown", (event) => { if (event.key === "Escape") opened().forEach((node) => change(node, false)); });
}
