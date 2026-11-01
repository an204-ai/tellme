"use client";
import { Children, isValidElement, useId, useEffect, useRef, useState, type ReactNode, type SelectHTMLAttributes, type ReactElement, type OptionHTMLAttributes } from "react";
import { Check, ChevronDown } from "lucide-react";

/** Shared styled select. The popover enters the top layer, including inside dialogs. */
export function Select({ children, value, onValueChange, className = "", disabled, id, trigger, menuWidth, ...props }: Omit<SelectHTMLAttributes<HTMLSelectElement>, "onChange"> & { onValueChange?: (value: string) => void; trigger?: ReactNode; menuWidth?: number }) {
  const listId = useId();
  const button = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const options = Children.toArray(children).flatMap((child): ReactElement<OptionHTMLAttributes<HTMLOptionElement>>[] => {
    return isValidElement<OptionHTMLAttributes<HTMLOptionElement>>(child) && child.type === "option" ? [child] : [];
  });
  const selected = options.find((option) => String(option.props.value ?? "") === String(value ?? ""));
  const choose = (next: string) => {
    onValueChange?.(next);
    list.current?.hidePopover();
    button.current?.focus({ preventScroll: true });
  };
  const show = () => {
    const rect = button.current?.getBoundingClientRect();
    if (!rect || !list.current) return;
    const below = window.innerHeight - rect.bottom - 18;
    const above = rect.top - 18;
    const upwards = below < 180 && above > below;
    const width = Math.min(menuWidth || rect.width, window.innerWidth - 24);
    const left = Math.max(12, Math.min(rect.left, window.innerWidth - width - 12));
    Object.assign(list.current.style, { left: `${left}px`, top: upwards ? "auto" : `${rect.bottom + 6}px`, bottom: upwards ? `${window.innerHeight - rect.top + 6}px` : "auto", width: `${width}px`, maxHeight: `${Math.max(80, Math.min(300, upwards ? above : below))}px` });
    list.current.showPopover();
    requestAnimationFrame(() => (list.current?.querySelector<HTMLElement>('[aria-selected="true"]:not(:disabled)') || list.current?.querySelector<HTMLElement>("button:not(:disabled)"))?.focus({ preventScroll: true }));
  };
  useEffect(() => {
    if (!expanded) return;
    const close = (event: Event) => {
      if (event.target instanceof Node && list.current?.contains(event.target)) return;
      list.current?.hidePopover();
    };
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);
    return () => { window.removeEventListener("resize", close); window.removeEventListener("scroll", close, true); };
  }, [expanded]);
  return <span className="select-root">
    <button ref={button} id={id} type="button" className={`${trigger ? "select-icon-trigger" : "select-control"} ${className}`} disabled={disabled} role="combobox" aria-controls={listId} aria-expanded={expanded} aria-haspopup="listbox" aria-label={props["aria-label"]} aria-labelledby={props["aria-labelledby"]} onClick={() => expanded ? list.current?.hidePopover() : show()} onKeyDown={(event) => { if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) { event.preventDefault(); show(); } }}>
      {trigger || <><span>{selected?.props.children || props.title || "Chọn…"}</span><ChevronDown size={17} aria-hidden="true" /></>}
    </button>
    {props.name && <input type="hidden" name={props.name} value={String(value ?? "")} />}
    <div ref={list} id={listId} popover="auto" className="select-options" role="listbox" aria-label={props["aria-label"] || "Lựa chọn"} onToggle={(event) => setExpanded(event.newState === "open")} onKeyDown={(event) => {
      const entries = Array.from(list.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") || []);
      const index = entries.indexOf(document.activeElement as HTMLButtonElement);
      if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
        event.preventDefault();
        entries[event.key === "Home" ? 0 : event.key === "End" ? entries.length - 1 : (index + (event.key === "ArrowDown" ? 1 : -1) + entries.length) % entries.length]?.focus();
      }
      if (event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
        const next = entries.slice(index + 1).concat(entries.slice(0, index + 1)).find((entry) => entry.textContent?.trim().toLocaleLowerCase("vi-VN").startsWith(event.key.toLocaleLowerCase("vi-VN")));
        if (next) { event.preventDefault(); next.focus(); }
      }
      if (event.key === "Tab") list.current?.hidePopover();
      if (event.key === "Escape") { event.stopPropagation(); list.current?.hidePopover(); button.current?.focus({ preventScroll: true }); }
    }}>
      {options.map((option) => <button key={String(option.props.value)} type="button" role="option" aria-selected={String(option.props.value) === String(value)} disabled={option.props.disabled} onClick={() => choose(String(option.props.value ?? ""))}><span>{option.props.children}</span>{String(option.props.value) === String(value) && <Check size={16} />}</button>)}
    </div>
  </span>;
}
