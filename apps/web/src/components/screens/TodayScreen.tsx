"use client";
import Link from "next/link";
import type { CSSProperties } from "react";
import { ArrowUpRight, Camera, Plus } from "lucide-react";
import { DAILY_TITLE } from "@/lib/brand";
import { useCommunity } from "@/hooks/use-community";
import { canView, timeOf } from "@/lib/api-repository";
import { localDay } from "@/lib/validation";
import { useAppStore } from "@/stores/app.store";
import { Avatar, Button, Empty, Loader } from "@/components/ui/Primitives";

const dateLabel = (day: string) =>
  new Intl.DateTimeFormat("vi-VN", { day: "numeric", month: "long" }).format(
    new Date(`${day}T12:00:00+07:00`),
  );

export function TodayScreen({ onlyMine = false }: { onlyMine?: boolean }) {
  const { data } = useCommunity();
  const open = useAppStore((state) => state.open);
  const viewStory = useAppStore((state) => state.viewStory);
  if (!data) return <Loader />;
  const stories = data.stories
    .filter(
      (story) =>
        story.items.length > 0 &&
        canView(story.userId, story.privacy, data) &&
        (onlyMine ? story.userId === "me" : story.day === localDay()),
    )
    .sort((a, b) => b.items.at(-1)!.at.localeCompare(a.items.at(-1)!.at));
  const me = data.people.find((person) => person.id === "me");
  return (
    <div className="daily-space">
      <h1 className="sr-only">{DAILY_TITLE}</h1>
      <button className="daily-compose" onClick={() => open("moment")}>
        <Avatar person={me} />
        <span>
          <strong>Hôm nay có gì đáng nhớ, {me?.name.split(" ").at(-1)}?</strong>
          <span>Thêm một bức ảnh vào ngày của bạn</span>
        </span>
        <Camera size={23} />
      </button>
      <div className="daily-stream">
        {stories.map((story) => {
          const person = data.people.find((entry) => entry.id === story.userId);
          const items = story.items.slice(0, 3);
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
                    {story.day === localDay()
                      ? "Hôm nay"
                      : dateLabel(story.day)}
                    <span aria-hidden="true"> · </span>
                    {story.items.length} khoảnh khắc
                  </span>
                </div>
                <time dateTime={last.at}>{timeOf(last.at)}</time>
              </header>
              <div className="daily-entry-body">
                <p className="daily-caption">
                  {last.caption || "Một ngày, qua những khoảnh khắc."}
                </p>
                <div
                  className={`daily-photo-fan photos-${items.length}`}
                  aria-label={`Các khoảnh khắc của ${person?.name}`}
                >
                  {items.map((item, index) => {
                    const position =
                      items.length === 1
                        ? 0
                        : items.length === 2
                          ? [-1, 1][index]!
                          : [-1, 0, 1][index]!;
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
                        {story.items.length > 3 && index === 2 && (
                          <span className="daily-more">
                            +{story.items.length - 3}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                <footer className="daily-entry-footer">
                  <span>
                    {timeOf(story.items[0]!.at)}
                    {story.items.length > 1 && ` — ${timeOf(last.at)}`}
                  </span>
                  <button onClick={() => viewStory(story.id)}>
                    Mở dòng thời gian
                    <ArrowUpRight size={17} />
                  </button>
                </footer>
              </div>
            </article>
          );
        })}
      </div>
      {stories.length === 0 && (
        <Empty
          icon={<Camera size={32} />}
          title={
            onlyMine
              ? "Ngày của bạn đang chờ một bức ảnh"
              : "Chưa có khoảnh khắc hôm nay"
          }
          text="Một bức ảnh nhỏ cũng đủ để bắt đầu câu chuyện."
          action={
            <Button onClick={() => open("moment")}>
              <Plus size={18} />
              Thêm khoảnh khắc
            </Button>
          }
        />
      )}
    </div>
  );
}
