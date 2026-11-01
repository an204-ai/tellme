export const groupAvatarPresets = ["friends", "noodles", "seaside", "family", "reading", "gamers"].map((name) => `/images/group-avatars/group-${name}.png`);
export const DEFAULT_GROUP_AVATAR = groupAvatarPresets[0]!;
export const isGroupAvatarPreset = (url: string) => groupAvatarPresets.includes(url);

/** Old persisted reactions remain readable without rewriting anyone's data. */
export function normalizeReaction(value: string | undefined) {
  switch (value) {
    case "like": case "love": case "haha": case "wow": case "sad": return value;
    case "cheer": return "like";
    case "celebrate": return "wow";
    case "appreciate": return "love";
    case "smile": return "haha";
    default: return null;
  }
}
