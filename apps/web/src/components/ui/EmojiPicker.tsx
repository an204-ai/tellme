"use client";
import { useEffect, useRef } from "react";
import { Picker } from "emoji-mart";
import data from "@emoji-mart/data";
import vi from "@emoji-mart/data/i18n/vi.json";

export default function EmojiPicker({
  onSelect,
}: {
  onSelect: (emoji: string) => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const callback = useRef(onSelect);
  callback.current = onSelect;
  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const picker = new Picker({
      data,
      i18n: vi,
      set: "native",
      emojiVersion: 15,
      theme: "light",
      autoFocus: true,
      dynamicWidth: true,
      perLine: 8,
      previewPosition: "none",
      skinTonePosition: "search",
      maxFrequentRows: 2,
      onEmojiSelect: (emoji: { native: string }) =>
        callback.current(emoji.native),
    });
    const element = picker as unknown as HTMLElement;
    node.appendChild(element);
    const scrollbarStyle = document.createElement("style");
    scrollbarStyle.textContent = `* { scrollbar-width: none !important; } *::-webkit-scrollbar { display: none !important; width: 0 !important; height: 0 !important; }`;
    element.shadowRoot?.appendChild(scrollbarStyle);
    return () => node.replaceChildren();
  }, []);
  return <div className="emoji-picker-host" ref={root} />;
}
