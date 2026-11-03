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
import { TodayStoryHighlights } from "@/components/app/TodayStoryHighlights";
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
        <TodayStoryHighlights stories={todayHighlights} people={data.people} me={me} reducedMotion={data.settings.reducedMotion} />
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
