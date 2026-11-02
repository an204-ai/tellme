"use client";
import { PullToRefresh } from "@/components/ui/PullToRefresh";
import { useWeather } from "@/providers/WeatherProvider";
import { weatherVoice } from "@/lib/weather";
import { useTimelineRefresh } from "@/hooks/use-timeline-refresh";
import Link from "next/link";
import type { CSSProperties } from "react";
import { Camera, Music2, Plus } from "lucide-react";
import { useStoryPages } from "@/hooks/use-posts";
import { InfiniteTrigger } from "@/components/app/InfiniteTrigger";
import { GuestInvitation } from "@/components/app/GuestInvitation";
import { StoryMenu } from "@/components/app/StoryMenu";
import { DragScroll } from "@/components/ui/DragScroll";
import { DAILY_TITLE, workplaceCopy } from "@/lib/brand";
import { useCommunity } from "@/hooks/use-community";
import { canView, timeOf, timeAgo } from "@/lib/api-repository";
import { localDay } from "@/lib/validation";
import { useAppStore } from "@/stores/app.store";
import { Avatar, Button, Empty, Loader, PrivacyIcon, privacyNames } from "@/components/ui/Primitives";

export function TodayScreen({ onlyMine = false }: { onlyMine?: boolean }) {
  const { fresh: weather } = useWeather();
  const refreshTimeline = useTimelineRefresh("stories");
  const { data } = useCommunity();
  const feed = useStoryPages(!!data && !onlyMine);
  const open = useAppStore((state) => state.open);
  const viewStory = useAppStore((state) => state.viewStory);
  if (!data) return <Loader />;
  const stories = (onlyMine ? data.stories : feed.stories)
    .filter(
      (story) =>
        story.items.length > 0 &&
        !data.blocked.includes(story.userId) &&
        !(data.hiddenStories || []).includes(story.id) &&
        canView(story.userId, story.privacy, data) &&
        (!onlyMine || story.userId === "me"),
    )
    .sort((a, b) => b.items.at(-1)!.at.localeCompare(a.items.at(-1)!.at));
  const todayHighlights = !onlyMine && data.authenticated !== false
    ? data.stories
        .filter((story) => story.day === localDay() && story.items.length > 0 && canView(story.userId, story.privacy, data) && !(data.hiddenStories || []).includes(story.id) && (story.userId === "me" || data.connections.includes(story.userId)))
        .sort((a, b) => Number(b.userId === "me") - Number(a.userId === "me"))
    : [];
  const me = data.people.find((person) => person.id === "me");
  return (
    <PullToRefresh onRefresh={refreshTimeline}><div className="daily-space">
      <h1 className="sr-only">{DAILY_TITLE}</h1>
      {data.authenticated === false ? <GuestInvitation next="/community/today" /> : <button type="button" className="daily-compose" aria-label="Chụp khoảnh khắc hôm nay" onClick={() => open("moment")}>
        <Avatar person={me} />
        <span className="daily-compose-field">
          <span className="daily-compose-prompt">{weather ? weatherVoice(weather).moment : workplaceCopy.momentPrompt(me?.name.split(" ").at(-1))}</span>
          <span className="daily-compose-action" aria-hidden="true"><Camera size={22} /><span>Chụp ảnh</span></span>
        </span>
      </button>}
      {!onlyMine && data.authenticated !== false && (
        <section className="today-friends" aria-label="Chuỗi khoảnh khắc hôm nay của bạn và bạn bè">
            <header>
              <h2>Hôm nay, mình và bạn bè</h2>
            </header>
            <DragScroll className="today-friends-strip" label="Khoảnh khắc hôm nay — kéo ngang để xem thêm">
              <button
                type="button"
                className="today-friend-story today-create-story"
                aria-label="Chụp khoảnh khắc hôm nay của bạn"
                onClick={() => open("moment")}
              >
                <span className="today-create-cover">
                  <img src={me?.avatar || "/images/avatar-default.svg"} alt="" />
                  <span className="today-create-plus"><Plus size={22} aria-hidden="true" /></span>
                </span>
                <span className="today-create-label">Chụp khoảnh khắc</span>
              </button>
              {todayHighlights.map((story) => {
                const person = data.people.find((entry) => entry.id === story.userId);
                const latest = story.items.at(-1)!;
                return (
                  <button type="button" className="today-friend-story" aria-label={story.userId === "me" ? "Xem chuỗi khoảnh khắc hôm nay của bạn" : `Xem chuỗi khoảnh khắc của ${person?.name || "bạn bè"}`} key={story.id} onClick={() => viewStory(story.id)}>
                    <img src={latest.image} alt="" loading="lazy" />
                    <span className="today-friend-shade" />
                    <span className="today-friend-progress" aria-hidden="true">{story.items.slice(0, 12).map((item) => <i key={item.id} />)}</span>
                    <span className="today-friend-time">{timeAgo(latest.at)}</span>
                    <span className="today-friend-person">
                      <Avatar person={person} size="sm" />
                      <span><strong>{story.userId === "me" ? "Ngày của bạn" : person?.name}</strong></span>
                    </span>
                  </button>
                );
              })}
            </DragScroll>
        </section>
      )}
      <h2 className="today-community-heading">Một ngày đi làm của mọi người</h2>
      <div className="daily-stream">
        {stories.map((story) => {
          const person = data.people.find((entry) => entry.id === story.userId);
          const items = story.items.slice(0, 5);
          const last = story.items.at(-1)!;
          return (
            <article key={story.id} className="daily-entry">
              <header className="daily-person">
                <Link href={`/community/profile/${person?.username}`}>
                  <Avatar person={person} />
                </Link>
                <div>
                  <Link
                    className="person-name"
                    href={`/community/profile/${person?.username}`}
                  >
                    {story.userId === "me" ? "Ngày của bạn" : person?.name}
                  </Link>
                  <span>
                    <time dateTime={last.at}>{timeAgo(last.at)}</time>
                    <span aria-hidden="true"> · </span>
                    <span className="privacy-indicator" title={privacyNames[story.privacy]} aria-label={privacyNames[story.privacy]}><PrivacyIcon value={story.privacy} size={14} /></span>
                    <span aria-hidden="true"> · </span>
                    {story.items.length} khoảnh khắc
                  </span>
                </div>
                <StoryMenu story={story} person={person} />
              </header>
                {story.music && <div className="daily-entry-music"><button type="button" className="daily-music-badge" onClick={() => viewStory(story.id)} aria-label={`Nghe ${story.music.title} trong chuỗi này`}><Music2 size={14} /><span>{story.music.title}</span></button></div>}
                <p className="daily-caption">
                  {last.caption || "Một chút ngày đi làm."}
                </p>
              <div className="daily-entry-body">
                <div
                  className={`daily-photo-fan photos-${items.length}`}
                  aria-label={`Các khoảnh khắc của ${person?.name}`}
                >
                  {items.map((item, index) => {
                    const position =
                      items.length === 1
                        ? 0
                        : (index * 2) / (items.length - 1) - 1;
                    return (
                      <button
                        key={item.id}
                        className="daily-photo"
                        style={
                          {
                            "--photo-position": position,
                            "--photo-angle": `${position * 8}deg`,
                            "--photo-layer": index + 1,
                          } as CSSProperties
                        }
                        aria-label={`Xem khoảnh khắc ${index + 1} của ${person?.name}`}
                        onClick={() => viewStory(story.id, index)}
                      >
                        <img
                          src={item.image}
                          alt={item.caption || `Khoảnh khắc ${index + 1}`}
                          loading="lazy"
                        />
                        <time dateTime={item.at}>{timeOf(item.at)}</time>
                        {story.items.length > 5 && index === 4 && (
                          <span className="daily-more">
                            +{story.items.length - 5}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </article>
          );
        })}
      </div>
      {!onlyMine && feed.isPending && <Loader />}
      {!onlyMine && feed.isError && !stories.length && <Empty icon={<Camera size={32} />} title="Chưa tải được khoảnh khắc" text="Bạn thử tải lại nhé." action={<Button onClick={() => void feed.refetch()}>Thử lại</Button>} />}
      {!onlyMine && <InfiniteTrigger hasNextPage={!!feed.hasNextPage} fetching={feed.isFetchingNextPage} error={feed.isFetchNextPageError} loadMore={() => feed.fetchNextPage()} />}
      {stories.length === 0 && (onlyMine || !feed.isPending && !feed.isError) && (
        <Empty
          icon={<Camera size={32} />}
          title={
            onlyMine
              ? "Lưu lại một chút ngày đi làm nhé"
              : "Chưa có khoảnh khắc nào"
          }
          text="Cà phê đầu ca, bữa trưa hay góc làm việc hôm nay — bạn muốn lưu lại điều gì?"
          action={
            <Button onClick={() => open("moment")}>
              <Plus size={18} />
              Thêm khoảnh khắc
            </Button>
          }
        />
      )}
    </div></PullToRefresh>
  );
}
