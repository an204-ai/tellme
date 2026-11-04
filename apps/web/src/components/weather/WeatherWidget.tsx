"use client";
import { playInterfaceSound } from "@/lib/interface-sounds";
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import { useWeather } from "@/providers/WeatherProvider";
import { weatherBubbleMessage, weatherMood } from "@/lib/weather";
import { dockPoint, initialWeatherDock, nearestWeatherDock, validWeatherDock, weatherCloudPoint, type DockBounds, type WeatherDock } from "@/lib/weather-dock";
import { WeatherSymbol } from "./WeatherSymbol";

const positionKey = "tellme-weather-dock";
function viewportBounds(): DockBounds {
  const viewport = window.visualViewport;
  const left = (viewport?.offsetLeft || 0) + 10, top = viewport?.offsetTop || 0;
  const header = document.querySelector(".global-header")?.getBoundingClientRect().bottom || 0;
  const nav = document.querySelector(".mobile-nav")?.getBoundingClientRect();
  const bottom = top + (viewport?.height || window.innerHeight) - 10;
  return { left, top: Math.max(header, top) + 10, right: left + (viewport?.width || window.innerWidth) - 20, bottom: nav && nav.height > 0 ? Math.min(bottom, nav.top - 10) : bottom };
}

export function WeatherWidget() {
  const weather = useWeather();
  const id = useId();
  const [mounted, setMounted] = useState(false), [hovered, setHovered] = useState(false), [focused, setFocused] = useState(false), [automatic, setAutomatic] = useState(false);
  const [dock, setDock] = useState<WeatherDock>(initialWeatherDock), [dragging, setDragging] = useState(false);
  const [heldOpen, setHeldOpen] = useState(false);
  const ref = useRef<HTMLElement>(null);
  const drag = useRef<{ id: number; startX: number; startY: number; dx: number; dy: number; x: number; y: number; width: number; height: number; moved: boolean } | null>(null);
  const frame = useRef(0), suppressClick = useRef(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const held = useRef(false);
  const expanded = (hovered || focused || heldOpen) && !dragging;
  const showHint = (expanded || automatic) && !dragging;
  const message = weather.state === "locating" ? "Đang tìm vị trí của bạn…" : weather.error || (weather.report?.stale ? "Thời tiết đang gián đoạn một chút, đây là nhiệt độ đã lưu nha." : weather.fresh ? automatic && weather.announcement ? weather.announcement.message : weatherBubbleMessage(weather.fresh) : weather.configured === false ? "Thời tiết đang nghỉ một chút. Bạn ghé lại sau nha." : "Bấm vào nhiệt độ để xem thời tiết quanh bạn nhé.");
  const remember = useCallback((next: WeatherDock) => {
    setDock(next);
    try { localStorage.setItem(positionKey, JSON.stringify(next)); } catch { /* Optional placement preference. */ }
  }, []);
  const place = useCallback(() => {
    const node = ref.current;
    if (!node || drag.current?.moved) return;
    const bounds = viewportBounds(), { x, y } = dockPoint(dock, node.offsetWidth, node.offsetHeight, bounds);
    node.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    node.style.visibility = "visible";
    const bubble = node.querySelector<HTMLElement>(".weather-hint");
    if (bubble) {
      bubble.style.maxWidth = `${Math.max(1, bounds.right - bounds.left)}px`;
      bubble.style.maxHeight = `${Math.max(1, bounds.bottom - bounds.top)}px`;
      bubble.style.setProperty("--cloud-room", `${Math.max(1, bounds.bottom - bounds.top)}px`);
      const width = bubble.offsetWidth, height = bubble.offsetHeight;
      const point = weatherCloudPoint(dock, x, y, node.offsetWidth, node.offsetHeight, width, height, bounds);
      bubble.dataset.tail = point.tailSide;
      bubble.style.left = `${point.x - x}px`; bubble.style.top = `${point.y - y}px`;
      bubble.style.setProperty("--tail-x", `${Math.max(28, Math.min(width - 28, x + node.offsetWidth / 2 - point.x))}px`);
      bubble.style.setProperty("--tail-y", `${Math.max(28, Math.min(height - 28, y + node.offsetHeight / 2 - point.y))}px`);
    }
  }, [dock]);
  useEffect(() => {
    const expiresAt = weather.announcement?.expiresAt || 0;
    if (expiresAt <= Date.now()) { setAutomatic(false); return; }
    setAutomatic(true);
    playInterfaceSound("weather");
    const timer = setTimeout(() => setAutomatic(false), expiresAt - Date.now());
    return () => clearTimeout(timer);
  }, [weather.announcement]);
  useEffect(() => {
    try { setDock(validWeatherDock(JSON.parse(localStorage.getItem(positionKey) || "null"))); } catch { /* Keep default placement. */ }
    setMounted(true);
  }, []);
  useLayoutEffect(() => {
    if (!mounted) return;
    place();
    const observer = new ResizeObserver(place);
    if (ref.current) observer.observe(ref.current);
    const bubble = ref.current?.querySelector(".weather-hint");
    if (bubble) observer.observe(bubble);
    window.addEventListener("resize", place); window.visualViewport?.addEventListener("resize", place); window.visualViewport?.addEventListener("scroll", place);
    return () => { observer.disconnect(); window.removeEventListener("resize", place); window.visualViewport?.removeEventListener("resize", place); window.visualViewport?.removeEventListener("scroll", place); };
  }, [place, mounted, showHint, message]);
  useEffect(() => {
    if (!heldOpen) return;
    const dismiss = (event: PointerEvent) => { if (!ref.current?.contains(event.target as Node)) setHeldOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setHeldOpen(false); };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", dismiss); document.removeEventListener("keydown", escape); };
  }, [heldOpen]);
  useEffect(() => {
    const cancel = () => {
      const current = drag.current; drag.current = null; cancelAnimationFrame(frame.current);
      clearTimeout(holdTimer.current); held.current = false;
      setHeldOpen(false); setDragging(false); setHovered(false); setFocused(false); setAutomatic(false);
      if (current?.moved) remember(nearestWeatherDock(current.x, current.y, current.width, current.height, viewportBounds()));
    };
    window.addEventListener("blur", cancel);
    return () => { window.removeEventListener("blur", cancel); cancelAnimationFrame(frame.current); clearTimeout(closeTimer.current); clearTimeout(holdTimer.current); };
  }, [remember]);
  if (!mounted) return null;
  const finish = (event: ReactPointerEvent<HTMLButtonElement>) => {
    clearTimeout(holdTimer.current);
    if (event.type === "pointercancel") setHeldOpen(false);
    const current = drag.current;
    if (!current || current.id !== event.pointerId) return;
    cancelAnimationFrame(frame.current); drag.current = null; setDragging(false);
    if (current.moved) {
      suppressClick.current = true; setHovered(false);
      remember(nearestWeatherDock(current.x, current.y, current.width, current.height, viewportBounds()));
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const cancelClose = () => clearTimeout(closeTimer.current);
  return createPortal(<aside ref={ref} aria-label="Thời tiết quanh bạn" className={`weather-widget ${expanded ? "is-expanded" : ""} ${dragging ? "is-dragging" : ""}`} data-edge={dock.edge} data-weather={weather.report?.stale ? "stale" : weather.fresh ? weatherMood(weather.fresh) : "unavailable"}
    onPointerEnter={(event) => { if (event.pointerType === "mouse") cancelClose(); }}
    onPointerLeave={(event) => { if (event.pointerType === "mouse") { cancelClose(); closeTimer.current = setTimeout(() => setHovered(false), 160); } }}>
    <button type="button" className="weather-temperature" aria-label={`${weather.report ? `${weather.report.temperature} độ C. ` : ""}Bấm để dùng vị trí. Ấn giữ để xem lời nhắn thời tiết. Kéo để đổi vị trí widget.`} aria-describedby={showHint ? id : undefined} aria-expanded={expanded}
      onPointerEnter={(event) => { if (event.pointerType === "mouse" && !drag.current) { cancelClose(); setHovered(true); } }}
      onFocus={(event) => { if (event.currentTarget.matches(":focus-visible")) setFocused(true); }} onBlur={() => setFocused(false)}
      onKeyDown={(event) => {
        if (event.key === "Escape") { setHeldOpen(false); setHovered(false); setFocused(false); setAutomatic(false); }
        const edges = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "top", ArrowDown: "bottom" } as const;
        if (event.key in edges) { event.preventDefault(); remember({ edge: edges[event.key as keyof typeof edges], ratio: .5 }); }
      }}
      onPointerDown={(event) => {
        if (!event.isPrimary || event.button !== 0 || !ref.current) return;
        const rect = ref.current.getBoundingClientRect(); suppressClick.current = false;
        clearTimeout(holdTimer.current); held.current = false;
        if (event.pointerType !== "mouse") {
          holdTimer.current = setTimeout(() => {
            if (!drag.current || drag.current.moved) return;
            held.current = true; suppressClick.current = true; setHeldOpen(true);
          }, 420);
        }
        drag.current = { id: event.pointerId, startX: event.clientX, startY: event.clientY, dx: event.clientX - rect.left, dy: event.clientY - rect.top, x: rect.left, y: rect.top, width: rect.width, height: rect.height, moved: false };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        const current = drag.current, node = ref.current;
        if (!current || current.id !== event.pointerId || !node) return;
        // Once a hold opens the cloud, this gesture stays a hold until release.
        if (held.current) return;
        if (!current.moved && Math.hypot(event.clientX - current.startX, event.clientY - current.startY) < 6) return;
        clearTimeout(holdTimer.current);
        if (!current.moved) { current.moved = true; setHeldOpen(false); setDragging(true); setHovered(false); setFocused(false); setAutomatic(false); }
        const bounds = viewportBounds();
        current.x = Math.max(bounds.left, Math.min(event.clientX - current.dx, bounds.right - current.width));
        current.y = Math.max(bounds.top, Math.min(event.clientY - current.dy, bounds.bottom - current.height));
        cancelAnimationFrame(frame.current);
        frame.current = requestAnimationFrame(() => { node.style.transform = `translate3d(${current.x}px, ${current.y}px, 0)`; });
      }} onPointerUp={finish} onPointerCancel={finish} onLostPointerCapture={finish}
      onContextMenu={(event) => { if (held.current || drag.current) event.preventDefault(); }}
      onClick={(event) => {
        if (suppressClick.current && event.detail !== 0) { suppressClick.current = false; event.preventDefault(); return; }
        if (weather.state === "locating") return;
        weather.locate();
        if (weather.configured !== true) weather.retry();
      }}>
      <span className="weather-day" aria-hidden={!expanded}>Hôm nay</span>
      <span className="weather-overview">
        <WeatherSymbol conditionId={weather.report?.conditionId} night={weather.report?.icon.endsWith("n")} />
        <span className="weather-reading"><span>{weather.report?.temperature ?? "—"}</span><span className="weather-unit">°C</span></span>
      </span>
      <span className="weather-meta" aria-hidden={!expanded}>
        <span>{weather.report?.description || "Chưa có thời tiết"}</span>
        <span>{weather.report ? `${weather.report.humidity}% độ ẩm` : "Bấm để dùng vị trí"}</span>
      </span>
    </button>
    {showHint && <div id={id} className="weather-hint" role="tooltip">
      <svg className="weather-thought-cloud" viewBox="-8 -6 304 172" preserveAspectRatio="none" aria-hidden="true">
        <defs><linearGradient id={`${id}-cloud-white`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#fff" /><stop offset=".65" stopColor="#fff" /><stop offset="1" stopColor="#e9eef6" /></linearGradient></defs>
        <path className="weather-cloud-depth" transform="translate(0 5)" d="M23 44C9 29 29 9 52 17C63-1 99-2 112 12C134-5 167-1 178 13C205-2 231 9 232 24C264 17 283 39 270 57C291 74 279 99 261 101C269 122 247 140 224 132C209 151 179 150 164 139C140 155 112 149 103 137C79 153 51 141 48 128C16 138-2 116 12 97C-7 80 0 52 23 44Z" />
        <path fill={`url(#${id}-cloud-white)`} stroke="#fff" strokeWidth="1" d="M23 44C9 29 29 9 52 17C63-1 99-2 112 12C134-5 167-1 178 13C205-2 231 9 232 24C264 17 283 39 270 57C291 74 279 99 261 101C269 122 247 140 224 132C209 151 179 150 164 139C140 155 112 149 103 137C79 153 51 141 48 128C16 138-2 116 12 97C-7 80 0 52 23 44Z" />
      </svg>
      <p>{message}</p>
    </div>}
    <span className="sr-only" role="status">{automatic ? message : weather.state === "locating" ? "Đang tìm vị trí của bạn" : weather.error}</span>
  </aside>, document.body);
}
