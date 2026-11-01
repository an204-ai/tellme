import { z } from "zod";

export const postSchema = z
  .object({
    content: z.string().trim().max(5000, "Bài viết tối đa 5.000 ký tự."),
    image: z.string(),
    topic: z.string().trim().max(40, "Chủ đề tối đa 40 ký tự."),
    privacy: z.enum(["public", "connections", "private"]),
    anonymous: z.boolean(),
  })
  .refine((value) => value.content.length > 0 || value.image.length > 0, {
    message: "Viết một câu chuyện hoặc thêm ảnh để chia sẻ.",
    path: ["content"],
  });

export const replySchema = z
  .string()
  .trim()
  .min(1, "Bạn chưa nhập bình luận.")
  .max(1000, "Bình luận tối đa 1.000 ký tự.");
export const commentMediaSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["gif", "sticker"]),
  url: z
    .string()
    .url()
    .refine(
      (value) => value.startsWith("https://"),
      "Ảnh GIF/sticker cần đường dẫn HTTPS.",
    ),
  alt: z.string(),
  width: z.number().positive(),
  height: z.number().positive(),
});
export const commentSchema = z
  .object({
    text: z.string().trim().max(1000, "Bình luận tối đa 1.000 ký tự."),
    media: commentMediaSchema.nullable(),
  })
  .refine((value) => value.text.length > 0 || value.media !== null, {
    message: "Viết bình luận hoặc chọn GIF/sticker.",
    path: ["text"],
  });
export const profileSchema = z.object({
  username: z
    .string()
    .trim()
    .transform((value) => value.replace(/^@/, "").toLowerCase())
    .pipe(
      z
        .string()
        .min(3, "Tellme ID cần ít nhất 3 ký tự.")
        .max(24, "Tellme ID tối đa 24 ký tự.")
        .regex(
          /^[a-z0-9](?:[a-z0-9._]{1,22}[a-z0-9])?$/,
          "Dùng chữ thường, số, dấu chấm hoặc gạch dưới; không đặt dấu ở đầu hoặc cuối.",
        ),
    ),
  name: z.string().trim().min(2, "Tên cần ít nhất 2 ký tự.").max(50),
  bio: z.string().trim().max(200, "Giới thiệu tối đa 200 ký tự."),
  location: z.string().trim().max(60),
  birthday: z.string().refine((value) => !value || (/^\d{4}-\d{2}-\d{2}$/.test(value) && value >= "1900-01-01" && value <= new Date().toISOString().slice(0, 10) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value), "Ngày sinh không hợp lệ."),
  occupation: z.string().trim().max(60, "Công việc tối đa 60 ký tự."),
  interests: z.string().trim().max(80, "Sở thích tối đa 80 ký tự."),
  favoriteLunch: z.string().trim().max(60, "Món ăn trưa tối đa 60 ký tự."),
  favoriteDrink: z.string().trim().max(60, "Đồ uống tối đa 60 ký tự."),
});
const personalInfoFields = { location: true, birthday: true, occupation: true, interests: true, favoriteLunch: true, favoriteDrink: true } as const;
export const personalInfoSchema = profileSchema.pick(personalInfoFields);
export const profileIdentitySchema = profileSchema.omit(personalInfoFields);
export const loginSchema = z.object({
  email: z.string().email("Email chưa đúng định dạng."),
  password: z.string().min(8, "Mật khẩu cần ít nhất 8 ký tự.").max(128),
});
export const registerSchema = loginSchema.extend({
  name: z.string().trim().min(2, "Nhập tên bạn muốn hiển thị.").max(50),
});
export const momentSchema = z.object({
  image: z.string().min(1, "Chụp một bức ảnh cho khoảnh khắc này."),
  caption: z.string().trim().max(300, "Chú thích tối đa 300 ký tự."),
  storyPrivacy: z.enum(["public", "connections", "private"]),
  privacy: z.enum(["public", "connections", "private"]).optional(),
});
export type PostInput = z.infer<typeof postSchema>;

export function localDay(value = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}
