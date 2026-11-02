"use client";
import Link from "next/link";
import { useState } from "react";
import {
  Camera,
  Check,
  MapPin,
  MessageCircle,
  Pencil,
  Plus,
  Users,
  Cake,
  BriefcaseBusiness,
  Heart,
  Coffee,
  Utensils,
  MessageSquarePlus,
} from "lucide-react";
import { localDay } from "@/lib/validation";
import { usePostPages, useProfilePerson } from "@/hooks/use-posts";
import { ProfileJourney } from "@/components/profile/ProfileJourney";
import { InfiniteTrigger } from "@/components/app/InfiniteTrigger";
import { useCommunity } from "@/hooks/use-community";
import { newId, canView, ApiError } from "@/lib/api-repository";
import { useAppStore } from "@/stores/app.store";
import { Avatar, Button, Empty, IconButton, Loader } from "@/components/ui/Primitives";
import { PostCard } from "@/components/app/PostCard";
import { ProfileAccountMenu } from "@/components/app/ProfileAccountMenu";
import { ProfileConnections } from "@/components/profile/ProfileConnections";
import { useRouter } from "next/navigation";

export function ProfileScreen({ username }: { username: string }) {
  const { data, update, saving } = useCommunity();
  const open = useAppStore((state) => state.open);
  const router = useRouter();
  const [connections, setConnections] = useState<"followers" | "following" | null>(null);
  const profileQuery = useProfilePerson(username, !!data);
  const profileUnavailable = profileQuery.error instanceof ApiError && [403,404].includes(profileQuery.error.status);
  const profilePerson = profileUnavailable
    ? undefined
    : profileQuery.data || data?.people.find((entry) => entry.username === username);
  const activity = usePostPages({ view: "profile", authorId: profilePerson?.id }, !!profilePerson);
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
  const friend = data.connections.includes(person.id);
  const entries = activity.posts;
  const stories = data.stories
    .filter(
      (story) =>
        story.userId === person.id &&
        canView(story.userId, story.privacy, data),
    )
    .sort((a, b) => b.day.localeCompare(a.day));
  return (
    <div className="profile-journal">
      <div className="profile-cover-area">
        <section className="profile-cover">
          <img src={person.cover} alt={`Ảnh bìa của ${person.name}`} />
        </section>
        {!isMe && <ProfileAccountMenu person={person} />}
      </div>
      <section className="profile-info">
        <Avatar person={person} size="xl" className="profile-avatar" />
        <div className="profile-main">
          <div>
            <h1>{person.name}</h1>
            <span className="muted text-sm">
              Tellme ID · @{person.username}
            </span>
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
                  variant={following || friend ? "secondary" : "primary"}
                  disabled={saving}
                  aria-label={friend ? `Bỏ follow ${person.name}` : undefined}
                  onClick={() =>
                    void update((draft) => {
                      draft.following = following
                        ? draft.following.filter((id) => id !== person.id)
                        : [...draft.following, person.id];
                    }).catch(() => undefined)
                  }
                >
                  {following ? <Check size={16} /> : <Plus size={16} />}
                  {friend ? "Bạn bè" : following ? "Đang follow" : "Follow"}
                </Button>
                <Button
                  variant="secondary"
                  disabled={!friend || saving}
                  title={!friend ? "Hai người cần follow nhau để nhắn tin" : undefined}
                  onClick={async () => {
                    if (!friend) return;
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
            <strong>{data.postCounts?.[person.id] ?? 0}</strong> câu chuyện
          </span>
          <span>
            <strong>
              {stories.reduce((sum, story) => sum + story.items.length, 0)}
            </strong>{" "}
            khoảnh khắc
          </span>
          <button type="button" aria-haspopup="dialog" onClick={() => setConnections("following")}><strong>{person.followingCount ?? (isMe ? data.following.length : 0)}</strong> đang follow</button>
          <button type="button" aria-haspopup="dialog" onClick={() => setConnections("followers")}><strong>{person.followersCount ?? 0}</strong> follower</button>
        </div>
        <section className="profile-personal" aria-labelledby="personal-heading">
          <div className="profile-personal-heading">
            <h2 id="personal-heading">Một chút về mình</h2>
            {isMe && <IconButton label="Chỉnh sửa Một chút về mình" tooltip={false} onClick={() => open("edit-personal")}><Pencil size={17} /></IconButton>}
          </div>
          <dl>
            {[
              { label: "Đang ở", value: person.location, icon: MapPin },
              { label: "Sinh nhật", value: person.birthday && !Number.isNaN(Date.parse(person.birthday)) ? new Intl.DateTimeFormat("vi-VN", { day: "numeric", month: "long" }).format(new Date(`${person.birthday}T12:00:00`)) : "", icon: Cake },
              { label: "Công việc", value: person.occupation, icon: BriefcaseBusiness },
              { label: "Sở thích", value: person.interests, icon: Heart },
              { label: "Món ăn trưa yêu thích", value: person.favoriteLunch, icon: Utensils },
              { label: "Đồ uống quen thuộc", value: person.favoriteDrink, icon: Coffee },
            ].filter((info) => info.value).map(({ label, value, icon: Icon }) => <div key={label}><dt><Icon size={16} /><span>{label}</span></dt><dd title={value}>{value}</dd></div>)}
          </dl>
          {![person.location, person.birthday, person.occupation, person.interests, person.favoriteLunch, person.favoriteDrink].some(Boolean) && <p>{isMe ? <button type="button" className="text-link" onClick={() => open("edit-personal")}>Thêm vài điều về mình</button> : "Những điều nhỏ sẽ được chia sẻ ở đây."}</p>}
        </section>
      </section>
      <ProfileJourney key={person.id} personId={person.id} isMe={isMe} />
      {isMe && (
        <button className="journal-composer" onClick={() => open("composer")}>
          <Avatar person={person} size="sm" />
          <span>Bạn muốn kể điều gì hôm nay?</span>
          <MessageSquarePlus size={20} />
        </button>
      )}
      <div className="profile-journal-stream">
        {entries.map((post, index) => {
          const day = localDay(new Date(post.createdAt));
          const previous = entries[index - 1];
          const previousDay = previous ? localDay(new Date(previous.createdAt)) : null;
          const label = new Intl.DateTimeFormat("vi-VN", {
            day: "numeric", month: "long", year: "numeric",
          }).format(new Date(`${day}T12:00:00+07:00`));
          return <div className="journal-activity" key={post.id}>
            {day !== previousDay && <div className="journal-date"><span /><time dateTime={day}>{label}</time></div>}
            <PostCard post={post} data={data} />
          </div>;
        })}
      </div>
      {entries.length === 0 && !activity.isPending && !activity.isError && (
        <Empty
          icon={<Camera size={30} />}
          title={isMe ? "Kể câu chuyện đầu tiên nhé" : "Chưa có bài viết nào"}
          text="Những bài viết bạn chia sẻ sẽ xuất hiện ở đây."
          action={
            isMe ? (
              <Button onClick={() => open("composer")}>
                <MessageSquarePlus size={17} />
                Viết câu chuyện
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
      {connections && <ProfileConnections key={`${username}-${connections}`} username={username} kind={connections} onClose={() => setConnections(null)} />}
    </div>
  );
}
