import { z } from "zod";
import { normalizeMomentCaption, validMomentCaption } from "@tellme/shared/captions";
import { getTellmeSticker } from "@tellme/shared/stickers";

export const replySchema = z
  .string()
  .trim()
  .min(1, "Bạn chưa nhập lời trả lời.")
  .max(1000, "Lời trả lời tối đa 1.000 ký tự.");
export const messageDraftSchema = z.object({
  replyToId: z.string().uuid().optional(),
  text: z.string().trim().max(1000, "Tin nhắn tối đa 1.000 ký tự."),
  stickerId: z.string().refine((id) => !!getTellmeSticker(id), "Chọn sticker hợp lệ.").optional(),
}).refine((draft) => !!draft.text || !!draft.stickerId, "Nhập tin nhắn hoặc chọn sticker.");
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
});
export const loginSchema = z.object({
  email: z.string().email("Email chưa đúng định dạng."),
  password: z.string().min(8, "Mật khẩu cần ít nhất 8 ký tự.").max(128),
});
export const registerSchema = loginSchema.extend({
  name: z.string().trim().min(2, "Nhập tên bạn muốn hiển thị.").max(50),
});
export const momentSchema = z.object({
  image: z.string().min(1, "Chụp một bức ảnh cho khoảnh khắc này."),
  caption: z.string().transform(normalizeMomentCaption).refine(validMomentCaption, "Chú thích tối đa 8 từ và 40 ký tự."),
  storyPrivacy: z.literal("connections"),
});

export function localDay(value = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}
