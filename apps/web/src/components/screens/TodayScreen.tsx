"use client";

import { useSurfaceArrival } from "@/components/ui/SurfaceTransition";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Images, UsersRound, X, CircleCheckBig, Check } from "lucide-react";
import { useStoryPages } from "@/hooks/use-stories";
import { useCommunity } from "@/hooks/use-community";
import { useTimelineRefresh } from "@/hooks/use-timeline-refresh";
import { canView } from "@/lib/api-repository";
import { localDay } from "@/lib/validation";
import { useAppStore } from "@/stores/app.store";
import { Avatar, Button, Empty, Loader } from "@/components/ui/Primitives";
import { Modal } from "@/components/ui/Modal";
import { TodayStoryHighlights } from "@/components/app/TodayStoryHighlights";
import { MomentComposer } from "@/components/app/MomentComposer";
import { MomentStream } from "@/components/app/MomentStream";
import type { PhotoMoment } from "@/components/app/MomentCard";
import { usePhotoGroups } from "@/hooks/use-photo-groups";
import { mixPhotoFeed } from "@/lib/photo-group-feed";

export function TodayScreen() {
  const { data } = useCommunity();
  const [author, setAuthor] = useState<string>();
  const [groupId, setGroupId] = useState<string>();
  const groups = usePhotoGroups();
  const [choosingFriend, setChoosingFriend] = useState(false);
  const feed = useStoryPages(!!data && data.authenticated !== false, author);
  const refresh = useTimelineRefresh("stories");
  const [refreshing, setRefreshing] = useState(false);
  const pending = useAppStore((state) => state.pendingUpload);
  useEffect(() => { if (pending) { setAuthor(undefined); setGroupId(undefined); } }, [pending?.moment.item.id]);
  useEffect(() => { if (author && data && !data.connections.includes(author)) setAuthor(undefined); }, [author, data]);
  const overlay = useAppStore((state) => state.overlay);
  const viewedStory = useAppStore((state) => state.viewedStory);
  const view = useAppStore((state) => state.momentView);
  const cameraRequest = useAppStore((state) => state.cameraRequest);
  const previousCameraRequest = useRef(cameraRequest);
  useEffect(() => {
    if (previousCameraRequest.current !== cameraRequest) { previousCameraRequest.current = cameraRequest; setAuthor(undefined); setGroupId(undefined); }
  }, [cameraRequest]);
  const setActiveMoment = useAppStore((state) => state.setActiveMoment);
  const setView = useAppStore((state) => state.setMomentView);
  const viewStory = useAppStore((state) => state.viewStory);
  const search = useSearchParams().toString();
  const linked = useRef<string | null>(null);
  useEffect(() => {
    if (!data || linked.current === search) return;
    linked.current = search;
    const params = new URLSearchParams(search);
    const storyId = params.get("story");
    if (storyId) viewStory(storyId, 0, params.get("moment") || undefined);
    if (params.get("group")) { setAuthor(undefined); setGroupId(params.get("group")!); }
  }, [data, search, viewStory]);
  const people = useMemo(() => new Map(data?.people.map((person) => [person.id, person])), [data?.people]);
  const moments = useMemo<PhotoMoment[]>(() => !data ? [] : [...new Map([...feed.stories, ...data.stories].map((story) => [story.id, story])).values()]
    .filter((story) => (!author || story.userId === author) && !data.blocked.includes(story.userId) && canView(story.userId, story.privacy, data))
    .flatMap((story) => story.items.map((item) => ({ story, item, person: people.get(story.userId) })))
    .sort((a, b) => b.item.at.localeCompare(a.item.at) || a.item.id.localeCompare(b.item.id)), [feed.stories, data, people, author]);
  const visibleMoments = useMemo(() => mixPhotoFeed(groupId ? [] : moments, author ? [] : (groups.data?.items || []).filter((group) => !groupId || group.id === groupId), !author && !groupId ? pending?.moment : null), [moments, pending, author, groupId, groups.data]);
  const selectedGroup = groups.data?.items.find((group) => group.id === groupId);
  const pendingFocus = pending?.moment.group ? `photo-group:${pending.moment.group.id}` : pending?.moment.item.id;
  const today = useMemo(() => !data ? [] : data.stories.filter((story) => story.day === localDay() && story.items.length && canView(story.userId, story.privacy, data)).sort((a, b) => Number(b.userId === "me") - Number(a.userId === "me")), [data]);
  const surface = useRef<HTMLDivElement>(null);
  useSurfaceArrival(surface, `${view}:${author || ""}:${groupId || ""}`, false, "page");
  if (!data) return <Loader />;
  const loadMore = () => { if (feed.hasNextPage && !feed.isFetchingNextPage && !feed.isFetchNextPageError) void feed.fetchNextPage(); };
  return <div ref={surface} className="now-home-stream">
    <h1 className="sr-only">Tellme now</h1>
    {view === "today" ? <div className="now-shelf"><header className="now-shelf-header"><h2>Hôm nay</h2><button type="button" aria-label="Đóng Hôm nay, về camera" onClick={() => setView("photos")}><X size={23} /></button></header><section className="now-today" aria-label="Chuỗi khoảnh khắc hôm nay">
      <TodayStoryHighlights stories={today} people={data.people} me={people.get("me")} reducedMotion={data.settings.reducedMotion} />
    </section></div> : <>
      <div className="moment-home-top"><button type="button" className="moment-audience" aria-haspopup="dialog" aria-expanded={choosingFriend} onClick={() => setChoosingFriend(true)}><UsersRound size={17} /><span>{selectedGroup?.title || (author ? people.get(author)?.name || "Bạn bè" : "Mọi người")}</span></button></div>
      <MomentStream key={groupId || author || "all"} moments={visibleMoments} startAtPhotos={!!author || !!groupId} initialMomentId={author || groupId ? visibleMoments[0]?.item.id : undefined} focusMomentId={!author && !groupId ? pendingFocus : undefined} onActiveMoment={setActiveMoment} cameraRequest={cameraRequest} onNearEnd={groupId ? undefined : loadMore} camera={(active) => <MomentComposer embedded active={active && !overlay && !viewedStory && !choosingFriend} />}
        onRefresh={() => { if (refreshing) return; setRefreshing(true); void Promise.all([refresh(), groups.refetch()]).catch(() => useAppStore.getState().notify("Chưa làm mới được. Bạn thử lại nhé.")).finally(() => setRefreshing(false)); }} refreshing={refreshing}
        footer={feed.isPending || groups.isPending ? <Loader /> : groupId && !selectedGroup && !groups.isError ? <Empty icon={<Images size={36} />} title="Nhóm ảnh không khả dụng" text="Chỉ thành viên được xem ảnh trong nhóm." action={<Button onClick={() => { setGroupId(undefined); setAuthor(undefined); }}>Mọi người</Button>} /> : (feed.isError && !moments.length || groups.isError) ? <Empty icon={<Images size={36} />} title={groups.isError ? "Chưa tải được nhóm ảnh" : "Chưa tải được ảnh"} text="Bạn thử tải lại nhé." action={<Button onClick={() => { void feed.refetch(); void groups.refetch(); }}>Thử lại</Button>} />
          : !groupId && feed.hasNextPage ? <div className="moment-end-copy"><p>{feed.isFetchingNextPage ? "Đang tải thêm khoảnh khắc…" : "Còn chuyện để xem nè."}</p><Button onClick={() => void feed.fetchNextPage()} disabled={feed.isFetchingNextPage}>{feed.isFetchNextPageError ? "Thử tải lại" : "Xem thêm"}</Button></div>
          : <div className="moment-end-copy"><CircleCheckBig className="moment-end-icon" size={56} strokeWidth={1.4} aria-hidden="true" /><h2>{visibleMoments.length ? "Đã xem hết rồi" : "Chưa có khoảnh khắc"}</h2>{selectedGroup && !visibleMoments.length && <Button onClick={() => { useAppStore.getState().setPhotoDestination(selectedGroup.id); setGroupId(undefined); setView("photos"); }}>Đăng vào nhóm</Button>}{!data.connections.length && <Link className="close-primary" href="/community/friends"><UsersRound size={19} />Thêm bạn</Link>}</div>} />
    </>}
    {choosingFriend && <Modal title="Xem khoảnh khắc" className="moment-friends-dialog" onClose={() => setChoosingFriend(false)}><div className="dialog-body moment-friends-list">
      <button type="button" aria-pressed={!author && !groupId} onClick={() => { setAuthor(undefined); setGroupId(undefined); setChoosingFriend(false); }}><span className="moment-friends-all glass-control"><UsersRound size={24} /></span><strong>Mọi người</strong>{!author && !groupId && <Check size={20} />}</button>
      {(groups.data?.items || []).map((group) => <button key={group.id} type="button" aria-pressed={groupId === group.id} onClick={() => { setAuthor(undefined); setGroupId(group.id); setChoosingFriend(false); }}><Avatar person={{ name: group.title, avatar: group.avatar }} /><strong>{group.title}</strong>{groupId === group.id && <Check size={20} />}</button>)}
      {data.people.filter((person) => data.connections.includes(person.id) && !data.blocked.includes(person.id)).map((person) => <button key={person.id} type="button" aria-pressed={author === person.id} onClick={() => { setAuthor(person.id); setGroupId(undefined); setChoosingFriend(false); }}><Avatar person={person} /><strong>{person.name}</strong>{author === person.id && <Check size={20} />}</button>)}
      {!data.connections.length && <Link href="/community/friends" onClick={() => setChoosingFriend(false)}>Thêm bạn</Link>}
    </div></Modal>}
  </div>;
}
