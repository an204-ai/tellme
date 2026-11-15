"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { magneticMomentScroll } from "@/lib/moment-snap";
import { MomentCard, type PhotoMoment } from "./MomentCard";

/** Native scrolling owns momentum and snapping. Only the visible photo and its neighbors render. */
export function MomentStream({ moments, camera, initialMomentId, startAtPhotos = false, onNearEnd, footer, cameraRequest = 0, onActiveMoment, focusMomentId }: {
  moments: PhotoMoment[];
  focusMomentId?: string;
  camera?: (active: boolean) => ReactNode;
  initialMomentId?: string;
  startAtPhotos?: boolean;
  onNearEnd?: () => void;
  footer?: ReactNode;
  cameraRequest?: number;
  onActiveMoment?: (moment: PhotoMoment | null) => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const magnet = useRef<ReturnType<typeof magneticMomentScroll> | null>(null);
  useEffect(() => {
    if (!root.current) return;
    magnet.current = magneticMomentScroll(root.current);
    return () => { magnet.current?.destroy(); magnet.current = null; };
  }, []);
  const initial = Math.max(0, moments.findIndex((moment) => moment.item.id === initialMomentId)) + (camera ? 1 : 0);
  const [active, setActive] = useState(initialMomentId || startAtPhotos ? initial : 0);
  const [activeId, setActiveId] = useState(initialMomentId || "");
  const requested = useRef(false);
  const previousCameraRequest = useRef(cameraRequest);
  const anchor = useRef({ index: initialMomentId || startAtPhotos ? initial : 0, id: initialMomentId || "" });
  const nearEnd = useRef(onNearEnd);
  nearEnd.current = onNearEnd;
  const offset = camera ? 1 : 0;
  const ids = moments.map((moment) => moment.item.id).join(",");
  useLayoutEffect(() => {
    const scroller = root.current;
    if (!scroller) return;
    const update = () => {
      // Keep page geometry stable while the software keyboard opens.
      if (scroller.contains(document.activeElement) && document.activeElement?.matches("input, textarea")) return;
      const previous = scroller.style.getPropertyValue("--stream-page-height");
      const height = `${scroller.clientHeight}px`;
      if (previous === height) return;
      scroller.style.setProperty("--stream-page-height", height);
      const page = scroller.querySelector<HTMLElement>(`[data-page="${anchor.current.index}"]`);
      if (page) scroller.scrollTop = page.offsetTop;
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(scroller);
    let frame = 0;
    const fitReply = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => {
          const focused = document.activeElement;
          if (focused instanceof HTMLElement && !focused.closest(".moment-reply-dialog") && scroller.contains(focused) && focused.matches("input, textarea")) focused.scrollIntoView({ block: "nearest", behavior: "instant" });
        });
      });
    };
    const blurred = () => { update(); };
    window.visualViewport?.addEventListener("resize", fitReply);
    scroller.addEventListener("focusout", blurred);
    return () => { observer.disconnect(); cancelAnimationFrame(frame); window.visualViewport?.removeEventListener("resize", fitReply); scroller.removeEventListener("focusout", blurred); };
  }, []);
  useLayoutEffect(() => {
    const scroller = root.current;
    if (scroller && anchor.current.id) {
      const index = moments.findIndex((moment) => moment.item.id === anchor.current.id);
      if (index >= 0 && index + offset !== anchor.current.index) {
        anchor.current.index = index + offset;
        setActive(index + offset);
        scroller.scrollTop = scroller.querySelector<HTMLElement>(`[data-page="${index + offset}"]`)?.offsetTop || 0;
      }
    }
  }, [ids, offset]);
  useLayoutEffect(() => {
    if (requested.current || !root.current) return;
    const page = initialMomentId ? Array.from(root.current.querySelectorAll<HTMLElement>("[data-moment-id]")).find((node) => node.dataset.momentId === initialMomentId)
      : startAtPhotos ? root.current.querySelector<HTMLElement>(`[data-page="${offset}"]`) : null;
    if (page) { root.current.scrollTop = page.offsetTop; requested.current = !!initialMomentId; }
  }, [initialMomentId, ids, startAtPhotos, offset]);
  useEffect(() => {
    const scroller = root.current;
    if (!scroller) return;
    let observer: IntersectionObserver | undefined;
    const observe = () => {
      observer?.disconnect();
      // A page may be taller than a landscape viewport. Observe the viewport's
      // center band rather than requiring a fraction of the whole page to fit.
      const inset = Math.max(0, Math.floor(scroller.clientHeight / 2) - 1);
      observer = new IntersectionObserver((entries) => {
        if (scroller.contains(document.activeElement) && document.activeElement?.matches("input, textarea")) return;
        for (const entry of entries) if (entry.isIntersecting) {
          const node = entry.target as HTMLElement;
          const index = Number(node.dataset.page);
          anchor.current = { index, id: node.dataset.momentId || "" };
          setActive(index); setActiveId(node.dataset.momentId || "");
          if (index >= moments.length + offset - 3) nearEnd.current?.();
        }
      }, { root: scroller, rootMargin: `-${inset}px 0px -${inset}px 0px`, threshold: 0 });
      scroller.querySelectorAll("[data-page]").forEach((node) => observer!.observe(node));
    };
    const resize = new ResizeObserver(observe);
    resize.observe(scroller);
    observe();
    return () => { resize.disconnect(); observer?.disconnect(); };
  }, [ids, offset, moments.length]);
  useEffect(() => {
    // Decoding neighbors before they enter the viewport avoids a blank flash during a flick.
    for (const index of [active - offset - 1, active - offset + 1]) {
      const moment = moments[index];
      if (!moment) continue;
      const image = new Image(); image.decoding = "async"; image.src = moment.item.image;
      void image.decode().catch(() => undefined);
    }
  }, [active, ids, offset]);
  useEffect(() => {
    if (!camera || previousCameraRequest.current === cameraRequest) return;
    previousCameraRequest.current = cameraRequest;
    magnet.current?.go(0);
  }, [cameraRequest]);
  useEffect(() => { const moment = moments[active - offset]; if (!moment?.group) onActiveMoment?.(moment || null); }, [active, moments, offset, onActiveMoment]);
  useEffect(() => () => onActiveMoment?.(null), [onActiveMoment]);
  useEffect(() => {
    if (!focusMomentId) return;
    const index = moments.findIndex((moment) => moment.item.id === focusMomentId);
    if (index >= 0) magnet.current?.go(index + offset);
  }, [focusMomentId]);
  const scrollTo = (index: number) => magnet.current?.go(index);
  return <div ref={root} className={`moment-stream ${camera ? "moment-stream-home" : "moment-stream-day"}`} role="region" aria-label={camera ? "Camera và khoảnh khắc — cuộn dọc để xem" : "Khoảnh khắc trong ngày — cuộn dọc để xem"} tabIndex={0}
    onKeyDown={(event) => {
      if (event.target !== event.currentTarget) return;
      if (["ArrowDown", "PageDown", "ArrowUp", "PageUp", "Home"].includes(event.key)) {
        event.preventDefault();
        scrollTo(event.key === "Home" ? 0 : Math.max(0, Math.min(moments.length + offset, active + (["ArrowDown", "PageDown"].includes(event.key) ? 1 : -1))));
      }
    }}>
    {camera && <section className="moment-page moment-camera-page" data-page="0" inert={active !== 0} aria-label="Chụp một chút hôm nay">
      <div className="moment-page-content">{camera(active === 0)}
        <button type="button" className="moment-history-trigger" onClick={() => scrollTo(1)}><span>Khám phá<ArrowDown size={18} /></span></button>
      </div>
    </section>}
    {moments.map((moment, index) => <section key={moment.item.id} className="moment-page" data-page={index + offset} inert={active !== index + offset} data-moment-id={moment.item.id} aria-label={moment.group ? `Chồng ảnh nhóm ${moment.group.title}` : `Khoảnh khắc của ${moment.story.userId === "me" ? "bạn" : moment.person?.name || "bạn bè"}`}>
      {Math.abs(index + offset - active) <= 1 && <div className="moment-page-content"><MomentCard moment={moment} active={activeId === moment.item.id} />
      </div>}
    </section>)}
    <section className="moment-page moment-stream-end" data-page={moments.length + offset} inert={active !== moments.length + offset} aria-label="Cuối khoảnh khắc"><div className="moment-page-content">{footer}
      {!!moments.length && <button type="button" className="moment-history-trigger" onClick={() => scrollTo(0)}><ArrowUp size={18} />Về đầu trang</button>}

    </div></section>
  </div>;
}
