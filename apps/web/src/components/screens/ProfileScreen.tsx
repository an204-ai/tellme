"use client";
import Link from "next/link";
import {
  Camera,
  ArrowUpRight,
  Check,
  MapPin,
  MessageCircle,
  Pencil,
  Plus,
  Users,
} from "lucide-react";
import { DAILY_TITLE } from "@/lib/brand";
import { localDay } from "@/lib/validation";
import { useProfileActivity, useProfilePerson } from "@/hooks/use-posts";
import { InfiniteTrigger } from "@/components/app/InfiniteTrigger";
import { useCommunity } from "@/hooks/use-community";
import { newId, canView, ApiError } from "@/lib/api-repository";
import { useAppStore } from "@/stores/app.store";
import { Avatar, Button, Empty, Loader } from "@/components/ui/Primitives";
import { PostCard } from "@/components/app/PostCard";
import { useRouter } from "next/navigation";

export function ProfileScreen({ username }: { username: string }) {
  const { data, update, saving } = useCommunity();
  const open = useAppStore((state) => state.open);
  const viewStory = useAppStore((state) => state.viewStory);
  const router = useRouter();
  const profileQuery = useProfilePerson(username, !!data);
  const profileUnavailable = profileQuery.error instanceof ApiError && [403,404].includes(profileQuery.error.status);
  const profilePerson = profileUnavailable
    ? undefined
    : data?.people.find((entry) => entry.username === username) || profileQuery.data;
  const activity = useProfileActivity(profilePerson?.id);
  if (data && profileQuery.isError && !profileUnavailable) return (
    <Empty icon={<Users size={30}/>} title="Chưa tải được hồ sơ"
      text={profileQuery.error.message || "Kết nối tạm gián đoạn. Bạn thử lại nhé."}
      action={<Button disabled={profileQuery.isFetching} onClick={()=>void profileQuery.refetch()}>{profileQuery.isFetching ? "Đang thử lại…" : "Thử tải lại hồ sơ"}</Button>}/>
  );
  if (
    !data ||
    (!profilePerson && profileQuery.isPending) ||
    (profilePerson && activity.isPending)
  )
    return <Loader />;
  const person = profilePerson;
  if (!person || data.blocked.includes(person.id))
    return (
      <Empty
        icon={<Users size={30} />}
        title="Hồ sơ không khả dụng"
        text="Tài khoản này không tồn tại hoặc không khả dụng."
        action={
          <Link href="/community/explore" className="text-link">
            Tìm những người bạn mới
          </Link>
        }
      />
    );
  const isMe = person.id === "me";
  const following = data.following.includes(person.id);
  const entries = activity.items;
  const stories = data.stories
    .filter(
      (story) =>
        story.userId === person.id &&
        canView(story.userId, story.privacy, data),
    )
    .sort((a, b) => b.day.localeCompare(a.day));
  return (
    <div className="profile-journal">
      <section className="profile-cover">
        <img src={person.cover} alt={`Ảnh bìa của ${person.name}`} />
      </section>
      <section className="profile-info">
        <Avatar person={person} size="xl" className="profile-avatar" />
        <div className="profile-main">
          <div>
            <h1>{person.name}</h1>
            <span className="muted text-sm">@{person.username}</span>
          </div>
          <div className="profile-buttons">
            {isMe ? (
              <Button variant="secondary" onClick={() => open("edit-profile")}>
                <Pencil size={15} />
                Chỉnh sửa hồ sơ
              </Button>
            ) : (
              <>
                <Button
                  variant={following ? "secondary" : "primary"}
                  disabled={saving}
                  onClick={() =>
                    void update((draft) => {
                      draft.following = following
                        ? draft.following.filter((id) => id !== person.id)
                        : [...draft.following, person.id];
                    }).catch(() => undefined)
                  }
                >
                  {following ? <Check size={16} /> : <Plus size={16} />}
                  {following ? "Following" : "Follow"}
                </Button>
                <Button
                  variant="secondary"
                  onClick={async () => {
                    try {
                      let id = data.conversations.find(
                        (entry) => entry.userId === person.id,
                      )?.id;
                      if (!id) {
                        id = newId();
                        const createdId = id;
                        await update((draft) => {
                          draft.conversations.push({
                            id: createdId,
                            userId: person.id,
                            unread: 0,
                            messages: [],
                          });
                        });
                      }
                      router.push(`/community/messages/${id}`);
                    } catch (error) {
                      useAppStore
                        .getState()
                        .notify(
                          error instanceof Error
                            ? error.message
                            : "Chưa mở được cuộc trò chuyện. Bạn thử lại nhé.",
                        );
                    }
                  }}
                >
                  <MessageCircle size={16} />
                  Nhắn tin
                </Button>
              </>
            )}
          </div>
        </div>
        <p className="profile-bio">{person.bio}</p>
        <div className="profile-details">
          <span>
            <MapPin size={15} />
            {person.location}
          </span>
          <span>
            <strong>{data.postCounts?.[person.id] ?? 0}</strong> câu chuyện
          </span>
          <span>
            <strong>
              {stories.reduce((sum, story) => sum + story.items.length, 0)}
            </strong>{" "}
            khoảnh khắc
          </span>
          {isMe && (
            <Link href="/community/follow">
              <strong>{data.following.length}</strong> đang follow
            </Link>
          )}
        </div>
      </section>
      {isMe && (
        <button className="journal-composer" onClick={() => open("composer")}>
          <Avatar person={person} size="sm" />
          <span>Bạn muốn kể điều gì hôm nay?</span>
          <Pencil size={18} />
        </button>
      )}
      <div className="profile-journal-stream">
        {entries.map((entry, index) => {
          const day =
            entry.kind === "day"
              ? entry.story.day
              : localDay(new Date(entry.at));
          const previous = entries[index - 1];
          const previousDay = previous
            ? previous.kind === "day"
              ? previous.story.day
              : localDay(new Date(previous.at))
            : null;
          const label = new Intl.DateTimeFormat("vi-VN", {
            day: "numeric",
            month: "long",
            year: "numeric",
          }).format(new Date(`${day}T12:00:00+07:00`));
          return (
            <div className="journal-activity" key={entry.id}>
              {day !== previousDay && (
                <div className="journal-date">
                  <span />
                  <time dateTime={day}>{label}</time>
                </div>
              )}
              {entry.kind === "post" ? (
                <PostCard post={entry.post} data={data} />
              ) : (
                <article className="journal-day">
                  <header>
                    <div>
                      <Camera size={19} />
                      <strong>
                        {day === localDay() ? DAILY_TITLE : "Một ngày đã qua"}
                      </strong>
                      <span>{entry.story.items.length} khoảnh khắc</span>
                    </div>
                    <button
                      aria-label={`Mở dòng thời gian ngày ${label}`}
                      onClick={() => viewStory(entry.story.id)}
                    >
                      <ArrowUpRight size={19} />
                    </button>
                  </header>
                  <div
                    className={`journal-collage count-${Math.min(3, entry.story.items.length)}`}
                  >
                    {entry.story.items.slice(-3).map((item, i) => (
                      <button
                        key={item.id}
                        aria-label={`Xem ảnh ${Math.max(0, entry.story.items.length - 3) + i + 1} ngày ${label}`}
                        onClick={() =>
                          viewStory(
                            entry.story.id,
                            Math.max(0, entry.story.items.length - 3) + i,
                          )
                        }
                      >
                        <img
                          src={item.image}
                          alt={
                            item.caption || `Khoảnh khắc trong ngày ${label}`
                          }
                          loading="lazy"
                        />
                        {entry.story.items.length > 3 && i === 2 && (
                          <span className="journal-more">
                            +{entry.story.items.length - 3}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                  {entry.story.items.at(-1)?.caption && (
                    <p>{entry.story.items.at(-1)?.caption}</p>
                  )}
                  <button
                    className="journal-open-day"
                    onClick={() => viewStory(entry.story.id)}
                  >
                    Xem trọn một ngày
                    <ArrowUpRight size={16} />
                  </button>
                </article>
              )}
            </div>
          );
        })}
      </div>
      {entries.length === 0 && !activity.isPending && !activity.isError && (
        <Empty
          icon={<Camera size={30} />}
          title={isMe ? "Bắt đầu nhật ký của bạn" : "Chưa có câu chuyện nào"}
          text="Bài viết và những ngày có ảnh sẽ cùng xuất hiện ở đây."
          action={
            isMe ? (
              <Button onClick={() => open("moment")}>
                <Camera size={17} />
                Ghi lại hôm nay
              </Button>
            ) : undefined
          }
        />
      )}
      {activity.isError && !entries.length && (
        <Empty
          title="Chưa tải được nhật ký"
          text="Thử tải lại để tiếp tục xem."
          action={
            <Button onClick={() => void activity.refetch()}>Thử lại</Button>
          }
        />
      )}
      <InfiniteTrigger
        hasNextPage={!!activity.hasNextPage}
        fetching={activity.isFetchingNextPage}
        error={activity.isFetchNextPageError}
        loadMore={() => activity.fetchNextPage()}
      />
    </div>
  );
}
