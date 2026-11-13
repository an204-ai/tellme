import emojiRegex from "emoji-regex";

/** One complete Unicode emoji sequence, including flags, skin tones and ZWJ families. */
export function isMomentReaction(value) {
  if (typeof value !== "string") return false;
  if (["like", "love", "haha", "wow", "sad"].includes(value)) return true;
  if (!value.startsWith("emoji:")) return false;
  const emoji = value.slice(6);
  if (!emoji || emoji.length > 64) return false;
  const match = emojiRegex().exec(emoji);
  return match?.index === 0 && match[0] === emoji;
}
