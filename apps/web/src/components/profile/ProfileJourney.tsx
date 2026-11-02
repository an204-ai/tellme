"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useQuery } from "@tanstack/react-query";
import { Camera, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { apiRepository } from "@/lib/api-repository";
import { localDay } from "@/lib/validation";
import { enableMonthSwipe } from "@/lib/month-swipe";
import { useAppStore } from "@/stores/app.store";

function shiftMonth(month: string, offset: number) {
  const date = new Date(`${month}-15T12:00:00+07:00`);
  date.setUTCMonth(date.getUTCMonth() + offset);
  return date.toISOString().slice(0, 7);
}

function monthLabel(month: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    month: "long", year: "numeric", timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(`${month}-15T12:00:00+07:00`));
}

function monthRoute(month: string, width: number, height: number) {
  const count = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate();
  const weights = [1, .96, 1.08, .94, 1.02];
  const unit = Math.max(1, width - 44) / weights.reduce((sum, weight) => sum + weight, 0);
  const lanes = [22];
  for (const weight of weights) lanes.push(lanes[lanes.length - 1]! + unit * weight);
  let current = { x: lanes[0]!, y: height * .86 };
  const samples = [{ ...current, distance: 0 }];
  let path = `M ${current.x} ${current.y}`;
  const append = (controlStart: { x: number; y: number }, controlEnd: { x: number; y: number }, end: { x: number; y: number }) => {
    const start = current;
    path += ` C ${controlStart.x} ${controlStart.y}, ${controlEnd.x} ${controlEnd.y}, ${end.x} ${end.y}`;
    for (let step = 1; step <= 40; step++) {
      const progress = step / 40;
      const inverse = 1 - progress;
      const x = inverse ** 3 * start.x + 3 * inverse ** 2 * progress * controlStart.x + 3 * inverse * progress ** 2 * controlEnd.x + progress ** 3 * end.x;
      const y = inverse ** 3 * start.y + 3 * inverse ** 2 * progress * controlStart.y + 3 * inverse * progress ** 2 * controlEnd.y + progress ** 3 * end.y;
      const previous = samples[samples.length - 1]!;
      samples.push({ x, y, distance: previous.distance + Math.hypot(x - previous.x, y - previous.y) });
    }
    current = end;
  };
  for (let lane = 0; lane < weights.length; lane++) {
    const left = lanes[lane]!;
    const right = lanes[lane + 1]!;
    const radius = (right - left) / 2;
    const rise = Math.min(radius, height * .24);
    const direction = lane % 2 ? 1 : -1;
    const edge = direction < 0 ? height * .12 + lane * 2 : height * .88 - lane * 2;
    const centerY = edge - direction * rise;
    const middle = (left + right) / 2;
    append({ x: left, y: current.y + (centerY - current.y) / 3 }, { x: left, y: centerY - (centerY - current.y) / 3 }, { x: left, y: centerY });
    append({ x: left, y: centerY + direction * rise * .55228475 }, { x: middle - radius * .55228475, y: edge }, { x: middle, y: edge });
    append({ x: middle + radius * .55228475, y: edge }, { x: right, y: centerY + direction * rise * .55228475 }, { x: right, y: centerY });
  }
  const finishY = height * .86;
  append({ x: current.x, y: current.y + (finishY - current.y) / 3 }, { x: current.x, y: finishY - (finishY - current.y) / 3 }, { x: current.x, y: finishY });
  const length = samples[samples.length - 1]!.distance;
  const arrange = (phase: number) => {
    let cursor = 1;
    const points = Array.from({ length: count }, (_, index) => {
      const distance = length * (index + phase) / count;
      while (cursor < samples.length - 1 && samples[cursor]!.distance < distance) cursor++;
      const start = samples[cursor - 1]!;
      const end = samples[cursor]!;
      const fraction = (distance - start.distance) / Math.max(.001, end.distance - start.distance);
      return {
        day: `${month}-${String(index + 1).padStart(2, "0")}`,
        x: start.x + (end.x - start.x) * fraction,
        y: start.y + (end.y - start.y) * fraction,
      };
    });
    let size = Math.min(40, width / 10);
    for (let index = 0; index < points.length; index++) {
      for (let other = index + 1; other < points.length; other++) {
        size = Math.min(size, Math.max(
          Math.abs(points[index]!.x - points[other]!.x) - 9,
          Math.abs(points[index]!.y - points[other]!.y) - 17,
        ));
      }
    }
    return { points, size };
  };
  let best = arrange(.5);
  for (let phase = 1; phase <= 19; phase++) {
    const candidate = arrange(phase / 20);
    if (candidate.size > best.size) best = candidate;
  }
  return { points: best.points, path, size: Math.max(14, Math.floor(best.size)), width, height };
}

function MonthMap({ month, personId, isMe, onBounds }: {
  month: string; personId: string; isMe: boolean; onBounds: (firstDay: string) => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const map = useRef<HTMLDivElement>(null);
  const [bounds, setBounds] = useState({ width: 300, height: 300 });
  const [nearby, setNearby] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const viewStory = useAppStore((state) => state.viewStory);
  const open = useAppStore((state) => state.open);
  const query = useQuery({
    queryKey: ["tellme", "stories", "journey", personId, month],
    queryFn: () => apiRepository.getJourneyMonth(personId, month),
    enabled: nearby,
    staleTime: 30000,
    gcTime: 120000,
  });
  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => setNearby(!!entry?.isIntersecting), { rootMargin: "180px 0px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (query.data?.accountCreatedAt) onBounds(localDay(new Date(query.data.accountCreatedAt)).slice(0, 7));
  }, [query.data?.accountCreatedAt, onBounds]);
  useEffect(() => {
    const element = map.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setBounds({ width: Math.max(1, entry.contentRect.width), height: Math.max(1, entry.contentRect.height) });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const days = query.data?.days || [];
  const savedDays = new Map(days.map((day) => [day.day, day]));
  const route = useMemo(() => monthRoute(month, bounds.width, bounds.height), [month, bounds.width, bounds.height]);
  return <div ref={root} className="journey-month" role="group" aria-label={monthLabel(month)}>
    <div className="journey-month-meta">
      {query.isError ? <span className="journey-status" role="alert">Chưa tải được ảnh.<button type="button" onClick={() => void query.refetch()}>Thử lại</button></span>
        : !query.data ? <span role="status">Đang mở hành trình…</span>
        : days.length ? <span>{days.length} ngày lưu lại · Còn nhiều điều ở phía trước</span>
        : <span>{month < localDay().slice(0, 7) ? "Một tháng đã đi qua, vẫn là một phần hành trình." : "Tháng này đang chờ những khoảnh khắc của bạn."}</span>}
      {isMe && query.data && !days.length && month === localDay().slice(0, 7) && <button className="journey-add" type="button" onClick={() => open("moment")}><Camera size={15} />Chụp ảnh</button>}
    </div>
    <div ref={map} className="journey-map" style={{ "--journey-stop-size": `${route.size}px` } as CSSProperties} aria-busy={query.isFetching}>
        <svg className="journey-road" viewBox={`0 0 ${route.width} ${route.height}`} preserveAspectRatio="none" aria-hidden="true">
          <path d={route.path} fill="none" stroke="currentColor" strokeWidth="5" strokeDasharray="3 15" vectorEffect="non-scaling-stroke" strokeLinecap="round" />
        </svg>
        {route.points.map((point) => {
          const story = savedDays.get(point.day);
          const latest = !!story && point.day === query.data?.latestDay;
          const label = `${Number(point.day.slice(-2))}/${Number(month.slice(-2))}`;
          const style = {
            left: point.x, top: point.y,
            "--stop-tone": ["#e5eaf8", "#e6eddf", "#f4e6d2", "#ebe4f2"][Number(point.day.slice(-2)) % 4],
            "--stop-tilt": `${Math.sin(Number(point.day.slice(-2)) * 1.2) * 5}deg`,
          } as CSSProperties;
          const contents = <>
            <span className="journey-stop-bubble">
              <span className="journey-stop-image"><span className="journey-stop-photo">{story && <img src={story.image} alt="" loading="lazy" draggable={false} />}</span></span>
              {latest && <span className="journey-stop-sparkle" aria-hidden="true"><Sparkles size={16} /></span>}
            </span>
            <time dateTime={point.day}>{label}</time>
          </>;
          return story ? <button type="button" key={point.day} className={`journey-stop${latest ? " is-latest" : ""}${selected === point.day ? " is-selected" : ""}`} style={style} aria-label={`${label}, ${story.count} khoảnh khắc${latest ? ", ngày gần nhất" : ""}`} aria-haspopup="dialog" onClick={() => { setSelected(point.day); viewStory(story.storyId); }}>{contents}</button>
            : <div key={point.day} className="journey-stop is-empty" style={style} role="img" aria-label={`${label}, chưa có khoảnh khắc`}>{contents}</div>;
        })}
    </div>
  </div>;
}

export function ProfileJourney({ personId, isMe }: { personId: string; isMe: boolean }) {
  const thisMonth = localDay().slice(0, 7);
  const [month, setMonth] = useState(thisMonth);
  const [firstMonth, setFirstMonth] = useState<string | null>(null);
  const frame = useRef<HTMLElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const swipe = useRef<ReturnType<typeof enableMonthSwipe> | null>(null);
  const swipeActions = useRef<{ canNavigate: (direction: number) => boolean; onNavigate: (direction: number) => void }>({ canNavigate: () => false, onNavigate: () => {} });
  useEffect(() => {
    const element = frame.current;
    if (!element || !viewport.current || !track.current) return;
    const controller = enableMonthSwipe(element, viewport.current, track.current, {
      canNavigate: (direction) => swipeActions.current.canNavigate(direction),
      onNavigate: (direction) => swipeActions.current.onNavigate(direction),
    });
    swipe.current = controller;
    return () => { controller.destroy(); swipe.current = null; };
  }, []);
  useLayoutEffect(() => { swipe.current?.reset(); }, [month]);
  const nextAllowed = month < shiftMonth(thisMonth, 1);
  const previousAllowed = firstMonth ? month > firstMonth : false;
  swipeActions.current = {
    canNavigate: (direction) => direction < 0 ? previousAllowed : nextAllowed,
    onNavigate: (direction) => setMonth((current) => shiftMonth(current, direction)),
  };
  const navigate = (direction: number) => swipe.current?.navigate(direction);
  return <section ref={frame} className="profile-journey" aria-label="Hành trình Tell me now">
    <header className="journey-heading">
      <span className="journey-brand" aria-hidden="true"><img src="/brand/logos/tellme-symbol-on-light.png" alt="" width="44" height="44" /></span>
      <div><h2>{isMe ? "Hành trình của tôi" : "Hành trình Tell me now"}</h2><p>Mỗi ngày là một dấu chân nhỏ.</p></div>
    </header>
    <div className="journey-navigation">
      <button type="button" disabled={!previousAllowed} aria-label="Xem tháng trước" onClick={() => navigate(-1)}><ChevronLeft size={19} /></button>
      <span aria-live="polite">{monthLabel(month)}</span>
      <button type="button" disabled={!nextAllowed} aria-label="Xem tháng tiếp theo" onClick={() => navigate(1)}><ChevronRight size={19} /></button>
    </div>
    <div ref={viewport} className="journey-month-stage" role="region" tabIndex={0} aria-label="Hành trình theo tháng. Vuốt trái để sang tháng sau, vuốt phải để xem tháng trước." onKeyDown={(event) => {
      if (event.target !== event.currentTarget) return;
      if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
        event.preventDefault();
        navigate(event.key === "ArrowRight" ? 1 : -1);
      }
    }}>
      <div ref={track} className="journey-month-track">
        {[-1, 0, 1].map((offset) => {
          if (offset < 0 && !previousAllowed || offset > 0 && !nextAllowed) return null;
          const pageMonth = shiftMonth(month, offset);
          return <div key={pageMonth} className="journey-month-page" data-month={pageMonth} aria-hidden={offset !== 0} inert={offset !== 0} style={{ left: `${offset * 100}%` }}>
            {pageMonth > thisMonth ? <div className="journey-future">
              <img src="/brand/stickers/tellme-wait.png" alt="" aria-hidden="true" width="112" height="112" draggable={false} />
              <h3>Tháng mới, mình lại có chuyện để kể.</h3>
              <p>Những khoảnh khắc tiếp theo sẽ ở đây.<br />Cứ sống ngày của bạn, rồi kể Tellme nghe nhé.</p>
            </div> : <MonthMap month={pageMonth} personId={personId} isMe={isMe} onBounds={setFirstMonth} />}
          </div>;
        })}
      </div>
    </div>
    <div className="journey-corner journey-corner-left" aria-hidden="true">
      <svg viewBox="0 0 180 80" preserveAspectRatio="none"><path d="M0 80V28C14 8 40 8 52 32C67 18 92 22 101 42C121 25 152 31 163 51C170 47 176 48 180 52V80Z" /></svg>
      <img src="/brand/stickers/tellme-hello.png" alt="" width="56" height="56" loading="lazy" draggable={false} />
    </div>
    <div className="journey-corner journey-corner-right" aria-hidden="true">
      <svg viewBox="0 0 180 80" preserveAspectRatio="none"><path d="M0 80V28C14 8 40 8 52 32C67 18 92 22 101 42C121 25 152 31 163 51C170 47 176 48 180 52V80Z" /></svg>
      <img src="/brand/stickers/tellme-love.png" alt="" width="56" height="56" loading="lazy" draggable={false} />
    </div>
  </section>;
}
