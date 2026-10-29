import type { Post } from "./types";
import { pictures } from "./seed";

const stories = [
  [
    "Đi bộ về nhà hôm nay, mình để ý thấy cây hoa trước ngõ vừa nở. Một điều thật nhỏ mà làm cả ngày sáng lên.",
    "Chuyện mỗi ngày",
    pictures.forest,
  ],
  [
    "Có những cuộc hẹn chẳng cần lên kế hoạch. Một tin nhắn, một ly cà phê và một buổi chiều đầy chuyện để kể.",
    "Điều nhỏ bé",
    pictures.coffee,
  ],
  [
    "Thử đi một con đường khác và nhận ra thành phố mình vẫn còn bao nhiêu góc chưa khám phá.",
    "Những chuyến đi",
    pictures.sunset,
  ],
  [
    "Gửi một chút mát lành từ biển. Nếu hôm nay có quá nhiều thứ phải nghĩ, tạm dừng một chút cũng được mà.",
    "Những chuyến đi",
    pictures.sea,
  ],
  [
    "Cuối cùng cũng đọc xong cuốn sách để dở. Điều mình thích nhất là cảm giác vẫn còn muốn ở lại trong câu chuyện.",
    "Chuyện mỗi ngày",
    "",
  ],
  [
    "Không khí sau cơn mưa có một mùi rất riêng. Mình đứng bên cửa sổ lâu hơn một chút, chỉ để hít đầy một hơi.",
    "Điều nhỏ bé",
    pictures.morning,
  ],
  [
    "Tự nấu một bữa cơm ngon, gọi điện về nhà rồi nghe lại playlist cũ. Một buổi tối chẳng cần gì hơn.",
    "Chuyện mỗi ngày",
    "",
  ],
  [
    "Mình đang tập chụp ảnh bằng cách quan sát trước khi bấm máy. Có những khung hình chỉ cần được nhìn ngắm thôi.",
    "Điều nhỏ bé",
    pictures.mountains,
  ],
  [
    "Một chuyến đi ngắn, một người bạn lâu ngày gặp lại. Hóa ra có những khoảng cách chỉ cần một lời hẹn để xóa đi.",
    "Những chuyến đi",
    pictures.forest,
  ],
  [
    "Hôm nay mình làm được một việc đã trì hoãn rất lâu. Không lớn lao gì, nhưng vẫn muốn tự vỗ vai mình một chút.",
    "Chuyện mỗi ngày",
    "",
  ],
  [
    "Thành phố lúc sáng sớm nhẹ nhàng hơn mình nghĩ. Hàng quán vừa mở, tiếng chổi quét sân, và mùi cà phê đầu ngày.",
    "Điều nhỏ bé",
    pictures.coffee,
  ],
  [
    "Cuối tuần này mình sẽ thử một điều chưa từng làm. Bạn có gợi ý gì cho một ngày thật khác mọi ngày không?",
    "Chuyện mỗi ngày",
    pictures.sea,
  ],
] as const;
export function makeMorePosts(): Post[] {
  return Array.from({ length: 24 }, (_, index) => {
    const entry = stories[index % stories.length]!;
    return {
      id: `demo-page-${index + 1}`,
      authorId: ["linh", "huy", "mai", "duc"][index % 4]!,
      content: `${entry[0]}${index >= stories.length ? "\n\nMột ghi chép khác trong những ngày bình thường của mình." : ""}`,
      image: entry[2],
      topic: entry[1],
      privacy: "public",
      anonymous: false,
      createdAt: new Date(Date.now() - (index + 2) * 86400000).toISOString(),
      likes: 9 + index * 7,
      reaction: null,
      comments: [],
      saved: false,
      shares: index % 5,
    };
  });
}
