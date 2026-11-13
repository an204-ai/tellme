"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Camera, Images, LoaderCircle, RefreshCw, Send, UsersRound, X } from "lucide-react";
import { useStoryPages } from "@/hooks/use-stories";
import { useCommunity } from "@/hooks/use-community";
import { useTimelineRefresh } from "@/hooks/use-timeline-refresh";
import { canView } from "@/lib/api-repository";
import { localDay } from "@/lib/validation";
import { canMessagePerson } from "@/lib/chat-policy";
import { useAppStore } from "@/stores/app.store";
import { Button, Empty, Loader } from "@/components/ui/Primitives";
import { PullToRefresh } from "@/components/ui/PullToRefresh";
import { TodayStoryHighlights } from "@/components/app/TodayStoryHighlights";
import { MomentActions } from "@/components/app/MomentActions";
import { MomentCard, type PhotoMoment } from "@/components/app/MomentCard";

export function TodayScreen() {
  const { data } = useCommunity();
  const feed = useStoryPages(!!data && data.authenticated !== false);
  const refresh = useTimelineRefresh("stories");
  const view = useAppStore((state) => state.momentView);
  const viewStory = useAppStore((state) => state.viewStory);
  const search = useSearchParams().toString();
  const linked = useRef<string | null>(null);
  useEffect(() => {
    if (!data || linked.current === search) return;
    linked.current = search;
    const params = new URLSearchParams(search);
    const storyId = params.get("story");
    if (storyId) viewStory(storyId, 0, params.get("moment") || undefined);
  }, [data, search, viewStory]);
  const setView = useAppStore((state) => state.setMomentView);
  const [discovered, setDiscovered] = useState(false);
  const [ended, setEnded] = useState(false);
  const [pendingAdvance, setPendingAdvance] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const replyDrafts = useRef<Record<string, string>>({});
  const [replyReady, setReplyReady] = useState<Record<string, boolean>>({});
  const [replySending, setReplySending] = useState<Record<string, boolean>>({});
  const replyFormId = useId();
  const open = useAppStore((state) => state.open);
  const people = useMemo(() => new Map(data?.people.map((person) => [person.id, person])), [data?.people]);
  const moments = useMemo<PhotoMoment[]>(() => !data ? [] : feed.stories
    .filter((story) => !data.blocked.includes(story.userId) && canView(story.userId, story.privacy, data))
    .flatMap((story) => story.items.map((item) => ({ story, item, person: people.get(story.userId) })))
    .sort((a, b) => b.item.at.localeCompare(a.item.at) || a.item.id.localeCompare(b.item.id)), [feed.stories, data, people]);
  const current = moments.find((entry) => entry.item.id === selected) || moments[0];
  const index = current ? moments.indexOf(current) : 0;
  useEffect(() => {
    if (moments.length < 2) return;
    for (const offset of [-1, 1]) {
      const neighbor = moments[index + offset];
      if (!neighbor) continue;
      const image = new Image();
      image.decoding = "async";
      image.src = neighbor.item.image;
      void image.decode().catch(() => {});
    }
  }, [index, moments]);
  const replyHasText = !!current && (replyReady[current.item.id] ?? !!replyDrafts.current[current.item.id]?.trim());
  const sending = !!current && !!replySending[current.item.id];
  const replying = view === "photos" && !ended && current && current.story.userId !== "me" && data && canMessagePerson(current.story.userId, data) && replyHasText;
  const draftChanged = useCallback((ready: boolean) => {
    if (current) setReplyReady((items) => items[current.item.id] === ready ? items : { ...items, [current.item.id]: ready });
  }, [current?.item.id]);
  const sendingChanged = useCallback((pending: boolean) => {
    if (current) setReplySending((items) => items[current.item.id] === pending ? items : { ...items, [current.item.id]: pending });
  }, [current?.item.id]);
  const composer = useMemo(() => ({ formId: replyFormId, drafts: replyDrafts, onDraftChange: draftChanged, onSendingChange: sendingChanged }), [replyFormId, draftChanged, sendingChanged]);
  const today = useMemo(() => !data ? [] : data.stories.filter((story) => story.day === localDay() && story.items.length && canView(story.userId, story.privacy, data)).sort((a, b) => Number(b.userId === "me") - Number(a.userId === "me")), [data]);
  useEffect(() => {
    if (current && index >= moments.length - 2 && feed.hasNextPage && !feed.isFetchingNextPage && !feed.isFetchNextPageError) void feed.fetchNextPage();
  }, [current?.item.id, index, moments.length, feed.hasNextPage, feed.isFetchingNextPage, feed.isFetchNextPageError, feed.fetchNextPage]);
  useEffect(() => {
    if (!pendingAdvance) return;
    const anchor = moments.findIndex((entry) => entry.item.id === pendingAdvance);
    const older = moments[anchor + 1];
    if (anchor >= 0 && older) { setSelected(older.item.id); setPendingAdvance(null); }
    else if (feed.isFetchNextPageError || anchor < 0) setPendingAdvance(null);
    else if (!feed.hasNextPage && !feed.isFetchingNextPage) { setPendingAdvance(null); setEnded(true); }
  }, [pendingAdvance, moments, feed.hasNextPage, feed.isFetchingNextPage, feed.isFetchNextPageError]);
  if (!data) return <Loader />;
  const me = data.people.find((person) => person.id === "me");
  const cover = today.find((story) => story.userId !== "me")?.items.at(-1)?.image || current?.item.image;
  const step = (direction: number) => {
    if (!current || pendingAdvance) return;
    const neighbor = moments[index + direction];
    if (neighbor) setSelected(neighbor.item.id);
    else if (direction > 0 && feed.hasNextPage) {
      setPendingAdvance(current.item.id);
      if (!feed.isFetchingNextPage) void feed.fetchNextPage();
    } else if (direction > 0) setEnded(true);
  };
  return <PullToRefresh onRefresh={refresh}><div className={`now-space ${view === "today" ? "now-today-view" : ""}`}>
    <h1 className="sr-only">Tellme now</h1>
    {view === "today" ? <><div className="now-today-toolbar"><button type="button" aria-label="Đóng Hôm nay, về trang chủ" onClick={() => setView("photos")}><X size={23} /></button></div><section className="now-today" tabIndex={0} aria-label="Chuỗi khoảnh khắc hôm nay — cuộn dọc để xem bạn bè">
      <TodayStoryHighlights stories={today} people={data.people} me={me} reducedMotion={data.settings.reducedMotion} />
    </section></> : <>
      {ended ? <><div className="now-photo-stack now-ended-photo-space" aria-hidden="true" /><section className="now-empty now-end" aria-label="Đã xem hết ảnh">
        <img src="/brand/stickers/tellme-wait.png" alt="" width="100" height="100" />
        <h2>Hết ảnh rồi nè.</h2><p>Bạn đã xem hết những ngày được gửi tới mình. Chút nữa lại ghé, biết đâu có chuyện mới.</p>
        <Button variant="ghost" onClick={() => { setSelected(moments[0]?.item.id || null); setEnded(false); }}>Xem lại từ ảnh mới nhất</Button>
      </section></> : current ? <MomentCard key={current.item.id} moment={current} behind={moments[index + 1]} canPrevious={index > 0} busy={!!pendingAdvance} previous={() => step(-1)} next={() => step(1)} discovered={discovered} onDiscover={() => setDiscovered(true)} composer={composer} />
        : feed.isPending ? <div className="now-empty"><Loader /></div>
        : feed.isError ? <div className="now-empty"><Empty icon={<Images size={36} />} title="Chưa tải được ảnh" text="Bạn thử tải lại nhé." action={<Button onClick={() => void feed.refetch()}>Thử lại</Button>} /></div>
        : <div className="now-empty"><div className="now-empty-photo"><Camera size={45} /></div><h2>Một chút hôm nay?</h2><p>{data.connections.length ? "Chụp một khoảnh khắc để bắt đầu câu chuyện." : "Thêm một người bạn, rồi kể nhau nghe hôm nay."}</p>{!data.connections.length && <Link className="close-primary" href="/community/friends"><UsersRound size={19} />Thêm bạn bằng Tellme ID</Link>}</div>}
      {feed.isFetchNextPageError && <button type="button" className="now-pagination-retry" onClick={() => void feed.fetchNextPage()}><RefreshCw size={16} />Tải thêm ảnh</button>}
    </>}
    {view === "photos" && <nav className="now-dock now-home-dock" aria-label={replying ? "Gửi lời nhắn riêng" : "Xem ngày và chụp ảnh"}>
      {!ended && current ? <MomentActions key={current.item.id} moment={current} /> : <span className="now-dock-spacer" />}
      <button type="button" className="now-dock-side now-day-trigger" onClick={() => setView("today")}><span className="now-day-stack">{cover ? <img src={cover} alt="" /> : <Images size={24} />}</span><span>{"Hôm nay"}</span></button>
      {replying ? <button type="submit" form={replyFormId} className="now-shutter now-send" disabled={sending} aria-label={sending ? "Đang gửi lời nhắn" : "Gửi lời nhắn riêng"} aria-busy={sending}><span>{sending ? <LoaderCircle className="now-send-progress" size={30} /> : <Send size={31} />}</span></button>
        : <button type="button" className="now-shutter" aria-label="Chụp khoảnh khắc" onClick={() => open("moment")}><span><Camera size={31} /></span></button>}
    </nav>}
  </div></PullToRefresh>;
}
