// Append new stickers here; keep published ids and image paths stable.
export const TELLME_STICKER_PACKS = [
  { id: "tellme", label: "Tellme", cover: "/brand/stickers/tellme-hello.png" },
  { id: "bubu", label: "Bubu", cover: "/brand/stickers/bubu-hello.png" },
];

export const TELLME_STICKERS = [
  { id: "tellme-hello", label: "Chào nè", keywords: ["chào", "hello", "hi", "alo", "xin chào", "chao buoi sang"] },
  { id: "tellme-okay", label: "Okela", keywords: ["ok", "oke", "okay", "okela", "đồng ý", "được", "chốt", "yes"] },
  { id: "tellme-haha", label: "Haha", keywords: ["haha", "hahaha", "hihi", "hehe", "cười", "vui", "buồn cười"] },
  { id: "tellme-thank-you", label: "Cảm ơn nha", keywords: ["cảm ơn", "cám ơn", "thanks", "thank you", "thank", "biết ơn"] },
  { id: "tellme-sorry", label: "Xin lỗi nhen", keywords: ["xin lỗi", "sorry", "có lỗi", "sr", "thứ lỗi"] },
  { id: "tellme-wait", label: "Đợi xíu", keywords: ["đợi", "chờ", "xíu", "tí", "wait", "chút", "một lát"] },
  { id: "tellme-love", label: "Yêu nè", keywords: ["yêu", "thương", "love", "nhớ", "ôm", "tim", "thích"] },
  { id: "tellme-good-night", label: "Ngủ ngon", keywords: ["ngủ", "ngủ ngon", "good night", "buồn ngủ", "chúc ngủ ngon", "g9"] },
  { id: "tellme-please", label: "Năn nỉ nè", keywords: ["năn nỉ", "làm ơn", "please", "nhờ", "giúp", "ủng hộ"], width: 1254, height: 1254 },
  ...[
    { id: "bubu-sparkle", label: "Bubu long lanh", keywords: ["long lanh", "mong chờ", "háo hức", "cute", "dễ thương"] },
    { id: "bubu-hug-heart", label: "Bubu ôm tim", keywords: ["yêu", "thương", "ôm", "love", "tim"] },
    { id: "bubu-haha", label: "Bubu cười vui", keywords: ["haha", "hihi", "hehe", "cười", "vui"] },
    { id: "bubu-wink", label: "Bubu nháy mắt", keywords: ["nháy mắt", "wink", "hẹn nhé", "bí mật"] },
    { id: "bubu-okay", label: "Bubu đồng ý", keywords: ["ok", "oke", "okay", "đồng ý", "được", "chốt", "giỏi", "tuyệt"] },
    { id: "bubu-shy", label: "Bubu ngại ngùng", keywords: ["ngại", "ngượng", "mắc cỡ", "xấu hổ", "shy"] },
    { id: "bubu-cry", label: "Bubu khóc nhè", keywords: ["khóc", "buồn", "huhu", "hic", "tủi thân"] },
    { id: "bubu-sleep", label: "Bubu ngủ ngon", keywords: ["ngủ", "ngủ ngon", "buồn ngủ", "good night", "g9"] },
    { id: "bubu-party", label: "Bubu ăn mừng", keywords: ["chúc mừng", "sinh nhật", "ăn mừng", "party", "hoan hô", "xong rồi"] },
    { id: "bubu-angry", label: "Bubu giận rồi", keywords: ["giận", "bực", "tức", "cáu", "angry"] },
    { id: "bubu-surprised", label: "Bubu bất ngờ", keywords: ["wow", "bất ngờ", "ngạc nhiên", "trời ơi", "ủa"] },
    { id: "bubu-thinking", label: "Bubu nghĩ xíu", keywords: ["hmm", "nghĩ", "suy nghĩ", "thắc mắc", "không hiểu", "tại sao"] },
    { id: "bubu-love", label: "Bubu mê quá", keywords: ["yêu", "mê", "thích", "love", "crush", "nhớ"] },
    { id: "bubu-please", label: "Bubu năn nỉ", keywords: ["năn nỉ", "làm ơn", "please", "nhờ", "giúp"] },
    { id: "bubu-sorry", label: "Bubu xin lỗi", keywords: ["xin lỗi", "sorry", "có lỗi", "sr", "thứ lỗi"] },
    { id: "bubu-tired", label: "Bubu hết pin", keywords: ["mệt", "kiệt sức", "hết pin", "đuối", "chán", "stress"] },
    { id: "bubu-coffee", label: "Bubu cà phê", keywords: ["cà phê", "cafe", "coffee", "giờ nghỉ", "đầu ca", "uống trà"] },
    { id: "bubu-peek", label: "Bubu hóng nè", keywords: ["hóng", "đâu rồi", "trốn", "lén", "peek"] },
    { id: "bubu-work", label: "Bubu làm việc", keywords: ["làm việc", "đi làm", "deadline", "tăng ca", "bận", "work"] },
    { id: "bubu-gaming", label: "Bubu chơi game", keywords: ["game", "gaming", "chơi", "giải trí"] },
    { id: "bubu-cool", label: "Bubu ngầu ghê", keywords: ["ngầu", "cool", "đỉnh", "chất", "quá đã"] },
    { id: "bubu-snack", label: "Bubu ăn bánh", keywords: ["đói", "ăn", "bánh", "ăn vặt", "ngon", "bữa trưa"] },
    { id: "bubu-music", label: "Bubu nghe nhạc", keywords: ["nhạc", "nghe nhạc", "music", "chill", "bài hát"] },
    { id: "bubu-hello", label: "Bubu chào bạn", keywords: ["chào", "hello", "hi", "alo", "xin chào", "tạm biệt", "bye"] },
  ].map((entry) => ({ ...entry, packId: "bubu" })),
].map((entry) => ({ src: `/brand/stickers/${entry.id}.png`, width: 384, height: 384, packId: "tellme", ...entry }));

/** @param {string | null | undefined} id */
export function getTellmeSticker(id) {
  return TELLME_STICKERS.find((sticker) => sticker.id === id);
}

/** @param {string} value */
export function normalizeStickerText(value) {
  return value.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/đ/g, "d").replace(/[^a-z0-9]+/g, " ").trim();
}

/** @param {string} text */
export function suggestTellmeStickers(text) {
  const words = ` ${normalizeStickerText(text.slice(-100))} `;
  if (!words.trim()) return [];
  return TELLME_STICKERS.filter((sticker) => sticker.keywords.some((keyword) => words.includes(` ${normalizeStickerText(keyword)} `))).slice(0, 4);
}
