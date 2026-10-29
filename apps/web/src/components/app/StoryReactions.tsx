"use client";
import { useState } from "react";
import { ChevronDown, ThumbsUp } from "lucide-react";
import { useCommunity } from "@/hooks/use-community";
import type { Reaction } from "@/lib/types";

const options: { value: Reaction; emoji: string; label: string }[] = [
  { value: "like", emoji: "👍", label: "Thích" },
  { value: "love", emoji: "💙", label: "Yêu thích" },
  { value: "cheer", emoji: "👏🏻", label: "Tán thưởng" },
  { value: "celebrate", emoji: "🎉", label: "Chúc mừng" },
  { value: "appreciate", emoji: "✨", label: "Trân trọng" },
  { value: "smile", emoji: "🙂", label: "Vui vẻ" },
];
export function StoryReactions({
  storyId,
  itemId,
  selected,
}: {
  storyId: string;
  itemId: string;
  selected?: Reaction | null;
}) {
  const { update } = useCommunity();
  const [expanded, setExpanded] = useState(false);
  const choice = options.find((option) => option.value === selected);
  const react = async (reaction: Reaction) => {
    try {
      await update((draft) => {
        const item = draft.stories
          .find((story) => story.id === storyId)
          ?.items.find((entry) => entry.id === itemId);
        if (item) item.reaction = item.reaction === reaction ? null : reaction;
      });
      setExpanded(false);
    } catch {
      /* The mutation error is announced by useCommunity. */
    }
  };
  return (
    <div
      className={`story-reaction-control ${expanded ? "is-open" : ""}`}
      onMouseLeave={() => setExpanded(false)}
      onKeyDown={(event) => {
        if (event.key === "Escape") setExpanded(false);
      }}
    >
      <button
        className={`story-like-button ${selected ? "selected" : ""}`}
        type="button"
        aria-pressed={!!selected}
        onClick={() => void react(selected || "like")}
      >
        {choice ? <span>{choice.emoji}</span> : <ThumbsUp size={20} />}
        <span>{choice?.label || "Thích"}</span>
      </button>
      <button
        className="story-reaction-expand"
        type="button"
        aria-label="Chọn cảm xúc cho ảnh"
        aria-expanded={expanded}
        onClick={() => setExpanded(!expanded)}
      >
        <ChevronDown size={16} />
      </button>
      <div className="reaction-bar" aria-label="Cảm xúc cho khoảnh khắc">
        {options.map((option) => (
          <button
            type="button"
            key={option.value}
            aria-label={option.label}
            aria-pressed={selected === option.value}
            data-tooltip={option.label}
            onClick={() => void react(option.value)}
          >
            {option.emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
