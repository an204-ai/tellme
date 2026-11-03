"use client";
import dynamic from "next/dynamic";
import { useId, useRef, useState } from "react";
import { Smile } from "lucide-react";
import { TooltipIconButton } from "./TooltipIconButton";
const Picker = dynamic(() => import("./EmojiPicker"), {
  ssr: false,
  loading: () => (
    <p className="emoji-loading" role="status">
      Đang mở bộ biểu cảm…
    </p>
  ),
});
export function EmojiButton({
  label,
  onSelect,
}: {
  label: string;
  onSelect: (emoji: string) => void;
}) {
  const id = useId();
  const popup = useRef<HTMLDivElement>(null);
  const [opened, setOpened] = useState(false);
  const [position, setPosition] = useState({ left: 12, top: 12 });
  return (
    <>
      <TooltipIconButton
        label={label}
        className={opened ? "emoji-trigger-open" : ""}
        popoverTarget={id}
        aria-expanded={opened}
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const width = Math.min(360, window.innerWidth - 24);
          const height = Math.min(430, window.innerHeight - 24);
          setPosition({
            left: Math.max(
              12,
              Math.min(rect.left, window.innerWidth - width - 12),
            ),
            top: Math.max(
              12,
              Math.min(rect.top - height - 8, window.innerHeight - height - 12),
            ),
          });
        }}
      >
        <Smile size={20} />
      </TooltipIconButton>
      <div
        id={id}
        popover="auto"
        ref={popup}
        className="emoji-popover"
        style={{
          left: `clamp(12px, ${position.left}px, max(12px, calc(100vw - 372px)))`,
          top: `clamp(12px, ${position.top}px, max(12px, calc(100dvh - 442px)))`,
        }}
        aria-label="Chọn biểu cảm"
        onToggle={(event) =>
          setOpened((event.nativeEvent as ToggleEvent).newState === "open")
        }
      >
        {opened && (
          <Picker
            onSelect={(emoji) => {
              popup.current?.hidePopover();
              onSelect(emoji);
            }}
          />
        )}
      </div>
    </>
  );
}
