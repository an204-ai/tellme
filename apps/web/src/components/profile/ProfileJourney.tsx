"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { apiRepository } from "@/lib/api-repository";
import { monthRoute } from "@/lib/profile-journey";
import { localDay } from "@/lib/validation";
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


function MonthMap({ month, personId, onBounds }: {
  month: string; personId: string; onBounds: (firstDay: string) => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const map = useRef<HTMLDivElement>(null);
  const [bounds, setBounds] = useState({ width: 300, height: 300 });
  const [nearby, setNearby] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const viewStory = useAppStore((state) => state.viewStory);
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
    {query.isError && <div className="journey-month-meta"><span className="journey-status" role="alert">Chưa tải được ảnh.<button type="button" onClick={() => void query.refetch()}>Thử lại</button></span></div>}
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

export function ProfileJourney({ personId }: { personId: string }) {
  const thisMonth = localDay().slice(0, 7);
  const [month, setMonth] = useState(thisMonth);
  const [firstMonth, setFirstMonth] = useState<string | null>(null);
  const nextAllowed = month < shiftMonth(thisMonth, 1);
  const previousAllowed = firstMonth ? month > firstMonth : false;
  const navigate = (direction: number) => {
    if (direction < 0 ? previousAllowed : nextAllowed) setMonth((current) => shiftMonth(current, direction));
  };
  return <section className="profile-journey" aria-label="Hành trình Tell me now">
    <header className="journey-heading">
      <h2>Hành trình</h2>
      <div className="journey-navigation">
        <button type="button" disabled={!previousAllowed} aria-label="Xem tháng trước" onClick={() => navigate(-1)}><ChevronLeft size={19} /></button>
        <span aria-live="polite" aria-label={monthLabel(month)}><strong>Tháng {Number(month.slice(5, 7))}</strong><small>{month.slice(0, 4)}</small></span>
        <button type="button" disabled={!nextAllowed} aria-label="Xem tháng tiếp theo" onClick={() => navigate(1)}><ChevronRight size={19} /></button>
      </div>
    </header>
    <div className="journey-month-stage" role="region" aria-label="Hành trình theo tháng">
      <div key={month} className="journey-month-page" data-month={month}>
            {month > thisMonth ? <div className="journey-future">
              <img src="/brand/stickers/tellme-wait.png" alt="" aria-hidden="true" width="112" height="112" draggable={false} />
              <h3>Tháng mới, mình lại có chuyện để kể.</h3>
              <p>Những khoảnh khắc tiếp theo sẽ ở đây.<br />Cứ sống ngày của bạn, rồi kể Tellme nghe nhé.</p>
            </div> : <MonthMap month={month} personId={personId} onBounds={setFirstMonth} />}
      </div>
    </div>
  </section>;
}
