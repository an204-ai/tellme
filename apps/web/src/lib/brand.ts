export const DAILY_TITLE = "Tell me now";
export const DAILY_SHORT = DAILY_TITLE;
export const FEED_TITLE = "Khám phá";

export const BRAND_CONCEPT = "Đi làm cũng có chuyện để kể.";
export const BRAND_DESCRIPTION =
  "Chia sẻ khoảnh khắc đời thường nơi làm việc, từ cà phê đầu ca đến chuyện lúc tan làm.";

export const workplaceCopy = {
  feedPrompt: (name?: string) => name ? `Hôm nay đi làm thế nào, ${name}?` : "Hôm nay đi làm thế nào?",
  momentPrompt: (name?: string) => name ? `Hôm nay đi làm có gì mới, ${name}?` : "Hôm nay đi làm có gì mới?",
  postPlaceholder: "Ca làm hôm nay thế nào? Kể một chút nhé…",
  topicSuggestions: ["Chuyện đi làm", "Giờ nghỉ trưa", "Tan làm rồi"],
};
