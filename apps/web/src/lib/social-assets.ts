import type { Reaction } from "./types.ts";

export const reactionOptions: { value: Reaction; label: string; image: string }[] = [
  { value: "like", label: "Thích", image: "/images/reactions/like.png" },
  { value: "love", label: "Yêu thích", image: "/images/reactions/love.png" },
  { value: "haha", label: "Haha", image: "/images/reactions/haha.png" },
  { value: "wow", label: "Wow", image: "/images/reactions/wow.png" },
  { value: "sad", label: "Buồn", image: "/images/reactions/sad.png" },
];
export const groupAvatarPresets = [
  { id: "friends", label: "Hội bạn thân" },
  { id: "noodles", label: "Hội ăn trưa" },
  { id: "seaside", label: "Tan ca đi chơi" },
  { id: "family", label: "Nhà mình" },
  { id: "reading", label: "Cùng đọc sách" },
  { id: "gamers", label: "Đồng đội game" },
].map((preset) => ({ ...preset, image: `/images/group-avatars/group-${preset.id}.png` }));
export const DEFAULT_GROUP_AVATAR = groupAvatarPresets[0]!.image;
