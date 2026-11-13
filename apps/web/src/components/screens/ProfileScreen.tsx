"use client";
import Link from "next/link";
import { FoundingBadge } from "@/components/ui/FoundingBadge";
import {
  Camera,
  MessageCircle,
  Users,
} from "lucide-react";
import { useProfilePerson } from "@/hooks/use-stories";
import { ProfileJourney } from "@/components/profile/ProfileJourney";
import { useCommunity } from "@/hooks/use-community";
import { newId, ApiError } from "@/lib/api-repository";
import { useAppStore } from "@/stores/app.store";
import { Avatar, Button, Empty, Loader } from "@/components/ui/Primitives";
import { ProfileAccountMenu } from "@/components/app/ProfileAccountMenu";
import { ProfileOwnerMenu } from "@/components/app/ProfileOwnerMenu";
import { useRouter } from "next/navigation";

export function ProfileScreen({ username }: { username: string }) {
  const { data, update, saving } = useCommunity();
  const open = useAppStore((state) => state.open);
  const router = useRouter();
  const profileQuery = useProfilePerson(username, !!data);
  const profileUnavailable = profileQuery.error instanceof ApiError && [403,404].includes(profileQuery.error.status);
  const profilePerson = profileUnavailable
    ? undefined
    : profileQuery.data || data?.people.find((entry) => entry.username === username);
  if (data && profileQuery.isError && !profileUnavailable) return (
    <Empty icon={<Users size={30}/>} title="Chưa tải được hồ sơ"
      text={profileQuery.error.message || "Kết nối tạm gián đoạn. Bạn thử lại nhé."}
      action={<Button disabled={profileQuery.isFetching} onClick={()=>void profileQuery.refetch()}>{profileQuery.isFetching ? "Đang thử lại…" : "Thử tải lại hồ sơ"}</Button>}/>
  );
  if (
    !data ||
    (!profilePerson && profileQuery.isPending)
  )
    return <Loader />;
  const person = profilePerson;
  if (!person || data.blocked.includes(person.id) || person.id !== "me" && !data.connections.includes(person.id))
    return (
      <Empty
        icon={<Users size={30} />}
        title="Hồ sơ không khả dụng"
        text="Tài khoản này không tồn tại hoặc không khả dụng."
        action={
          <Link href="/community/today" className="text-link">
            Về Tell me now
          </Link>
        }
      />
    );
  const isMe = person.id === "me";
  const friend = data.connections.includes(person.id);
  return (
    <div className="profile-journal close-profile">
      <div className="profile-cover-area">
        <section className="profile-cover">
          {person.cover && <img src={person.cover} alt={`Ảnh bìa của ${person.name}`} />}
        </section>
        {isMe ? <ProfileOwnerMenu /> : <ProfileAccountMenu person={person} />}
      </div>
      <section className="profile-identity">
        <div className="profile-identity-row">
          <Avatar person={person} size="xl" className="profile-portrait" />
          <div className="profile-heading">
            <h1>{person.name}</h1>
            <div className="profile-handle-line"><span className="profile-handle" title={`@${person.username}`}>
              @{person.username}
            </span><FoundingBadge visible={person.foundingMember} /></div>
            {person.bio && <p className="profile-intro">{person.bio}</p>}
          </div>
          {!isMe && <div className="profile-message">
                <Button
                  variant="secondary"
                  className="profile-message-button"
                  aria-label={`Nhắn tin cho ${person.name}`}
                  title="Nhắn tin"
                  disabled={!friend || saving}
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
                  <span className="profile-message-label">Nhắn tin</span>
                </Button>
          </div>}
        </div>
      </section>
      <ProfileJourney key={person.id} personId={person.id} />
      {isMe && (
        <button className="journal-composer" onClick={() => open("moment")}>
          <Avatar person={person} size="sm" />
          <span>Chụp một khoảnh khắc hôm nay nhé?</span>
          <Camera size={20} />
        </button>
      )}
    </div>
  );
}
