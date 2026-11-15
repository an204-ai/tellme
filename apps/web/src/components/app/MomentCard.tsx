"use client";

import Link from "next/link";
import { useId, useRef, useState, type RefObject } from "react";
import { Images, RefreshCw, CirclePlus } from "lucide-react";
import { useReaction } from "@/hooks/use-reaction";
import { useCommunity } from "@/hooks/use-community";
import { timeAgo } from "@/lib/api-repository";
import { reactionOptions } from "@/lib/social-assets";
import type { DayStory, MomentItem, Person, Reaction, PhotoGroup } from "@/lib/types";
import { GroupPhotoCard } from "./GroupPhotoCard";
import { useAppStore } from "@/stores/app.store";
import { UploadHamster } from "@/components/ui/UploadHamster";
import { Avatar } from "@/components/ui/Primitives";
import { EmojiButton } from "@/components/ui/EmojiButton";
import { ReactionIcon } from "@/components/ui/ReactionControl";
import { StoryReply } from "./StoryReply";
import { MomentReactionPeople } from "./MomentReactionPeople";
import { MomentReactionBurst } from "./MomentReactionFloaters";
import { useReactionBubbles } from "./ReactionBubbles";
import { playInterfaceSound } from "@/lib/interface-sounds";

export type PhotoMoment = { story: DayStory; item: MomentItem; person?: Person; group?: PhotoGroup };

function MomentResponse({ story, item, person, drafts }: PhotoMoment & { drafts: RefObject<Record<string, string>> }) {
  const { data } = useCommunity();
  const bar = useRef<HTMLDivElement>(null);
  const { celebrate, celebration } = useReactionBubbles(bar);
  const reaction = useReaction({ kind: "moment", storyId: story.id, itemId: item.id }, true);
  const formId = useId();
  const composer = { formId, drafts, onDraftChange() {}, onSendingChange() {} };
  const own = story.userId === "me";
  if (own) return <div className="now-response-slot now-own-response"><MomentReactionPeople label="Hoạt động" storyId={story.id} itemId={item.id} onProfile={() => useAppStore.getState().viewStory(null)} /></div>;
  if (!data?.connections.includes(story.userId)) return <div className="now-response-slot" />;
  const custom = item.reaction?.startsWith("emoji:") ? item.reaction : null;
  const choose = (value: Reaction, source?: HTMLElement) => {
    const next = item.reaction === value ? null : value;
    if (next) {
      const rect = (source || bar.current?.querySelector(".emoji-trigger-open, .now-reactions-row > .icon-button"))?.getBoundingClientRect();
      if (rect) celebrate(next, rect);
      playInterfaceSound("reaction");
    }
    reaction.change(next);
  };
  return <div className="now-response-slot"><div ref={bar} className="now-respond-bar">
    <StoryReply story={story} item={item} person={person} compact composer={composer} inlineSend />
    <div className="now-reactions-row">
      <div className="now-reaction-strip" role="group" aria-label="Cảm xúc cho khoảnh khắc — vuốt ngang để chọn">
        {reactionOptions.map((option) => <button key={option.value} type="button" aria-label={`Thả cảm xúc ${option.label}`} aria-pressed={item.reaction === option.value} onClick={(event) => choose(option.value, event.currentTarget)}><ReactionIcon value={option.value} size={48} /></button>)}
        {custom && <button type="button" aria-label={`Bỏ cảm xúc ${custom.slice(6)}`} aria-pressed="true" onClick={() => reaction.change(null)}><ReactionIcon value={custom} size={34} /></button>}
      </div>
      <EmojiButton label="Thả một emoji khác" icon={<CirclePlus size={28} />} onSelect={(emoji) => choose(`emoji:${emoji}`)} />
    </div>
  </div>{celebration}</div>;
}

export function MomentCard({ moment, active = true, drafts }: {
  moment: PhotoMoment; active?: boolean; drafts: RefObject<Record<string, string>>;
}) {
  return moment.group ? <GroupPhotoCard moment={{ ...moment, group: moment.group }} active={active} /> : <PersonalMomentCard moment={moment} active={active} drafts={drafts} />;
}
function PersonalMomentCard({ moment, active, drafts }: { moment: PhotoMoment; active: boolean; drafts: RefObject<Record<string, string>> }) {
  const { story, item, person } = moment;
  const upload = useAppStore((state) => state.pendingUpload?.moment.item.id === item.id ? state.pendingUpload : null);
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const [failed, setFailed] = useState(false), [attempt, setAttempt] = useState(0);
  const captionId = useId();
  const viewStory = useAppStore((state) => state.viewStory);
  return <article className="now-moment stream-moment">
    <div className="now-photo-stack">
      <div className="now-photo">
        <div className="now-photo-surface">
          {failed ? <span className="now-image-error"><Images size={34} /><span>Ảnh chưa tải được.</span></span> : <img key={`${item.id}-${attempt}`} src={item.image} alt={item.caption || `Khoảnh khắc của ${person?.name || "bạn"}`} draggable={false} decoding="async" fetchPriority={active ? "high" : "auto"} onError={() => setFailed(true)} />}
        </div>
        {item.caption && <button type="button" className={`stream-caption ${captionExpanded ? "is-expanded" : ""}`} onClick={() => setCaptionExpanded(!captionExpanded)} aria-expanded={captionExpanded} aria-controls={captionId}><span id={captionId}>{item.caption}</span></button>}
        {failed && <button type="button" className="now-image-retry" onClick={() => { setAttempt((value) => value + 1); setFailed(false); }}><RefreshCw size={17} />Thử lại</button>}
        {active && story.userId === "me" && <MomentReactionBurst storyId={story.id} moments={item} surface="detail" />}
      </div>
    </div>
    <div className="now-identity-slot">
      <div className="now-byline" key={upload?.status || "author"}>{upload ? <span className="moment-upload-status" data-state={upload.status} role="status">{upload.status === "uploading" ? <><UploadHamster /><span>Đang đăng…</span></> : upload.status === "done" ? <span>Đã xong</span> : <button type="button" onClick={upload.retry}>Chưa đăng được · Thử lại</button>}</span> : <><Link href={`/community/profile/${person?.username || "me"}`} onNavigate={() => viewStory(null)}><Avatar person={person} size="sm" /><strong>{story.userId === "me" ? "Bạn" : person?.name || "Bạn bè"}</strong></Link><time className="now-timestamp" dateTime={item.at}>{timeAgo(item.at)}</time></>}</div>
    </div>
    {active && !upload ? <MomentResponse story={story} item={item} person={person} drafts={drafts} /> : <div className="now-response-slot" />}
  </article>;
}
