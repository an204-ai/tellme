import { z } from "zod";
import { getTellmeSticker } from "@tellme/shared/stickers";
export const idSchema = z.string().uuid();
export const privacy = z.enum(["public", "connections", "private"]);
export const reaction = z
  .enum(["like", "love", "haha", "wow", "sad"])
  .nullable();
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email()
    .max(254)
    .transform((s) => s.toLowerCase()),
  password: z.string().min(8).max(128),
});
export const registerSchema = loginSchema.extend({
  name: z.string().trim().min(2).max(50),
});
export const profileSchema = z.object({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(24)
    .regex(/^[a-z0-9](?:[a-z0-9._]{1,22}[a-z0-9])?$/),
  name: z.string().trim().min(2).max(50),
  bio: z.string().trim().max(200),
  location: z.string().trim().max(60),
  birthday: z.string().refine((value) => !value || (/^\d{4}-\d{2}-\d{2}$/.test(value) && value >= "1900-01-01" && value <= new Date().toISOString().slice(0, 10) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value), "Ngày sinh không hợp lệ.").optional(),
  occupation: z.string().trim().max(60).optional(),
  interests: z.string().trim().max(80).optional(),
  breakTime: z.string().trim().max(60).optional(),
  favoriteLunch: z.string().trim().max(60).optional(),
  favoriteDrink: z.string().trim().max(60).optional(),
  avatar: z.string().max(2000),
  cover: z.string().max(2000),
});
export const settingsSchema = z.object({
  audience: privacy,
  notifyLikes: z.boolean(),
  notifyMessages: z.boolean(),
  notifySystem: z.boolean().default(true),
  reducedMotion: z.boolean(),
  emailUpdates: z.boolean().transform(() => false).default(false),
});
export const pushSubscriptionSchema = z.object({
  endpoint: z.string().url().max(2048),
  expirationTime: z.number().int().positive().nullable().optional(),
  keys: z.object({ p256dh: z.string().min(1).max(256), auth: z.string().min(1).max(256) }),
});
export const postSchema = z
  .object({
    id: idSchema,
    content: z.string().trim().max(5000),
    image: z.string().max(2000).default(""),
    topic: z.string().trim().max(40),
    privacy,
    anonymous: z.boolean(),
  })
  .refine((p) => !!p.content || !!p.image, "Viết nội dung hoặc thêm ảnh.");
const giphyMediaSchema = z.object({
  id: z.string().min(1).max(100),
  kind: z.enum(["gif", "sticker"]),
  url: z
    .string()
    .url()
    .refine((s) => {
      if (!URL.canParse(s)) return false;
      const u = new URL(s);
      return u.protocol === "https:" && /(^|\.)giphy\.com$/.test(u.hostname);
    }, "Ảnh GIF cần thuộc Giphy."),
  alt: z.string().max(500),
  width: z.number().positive().max(4096),
  height: z.number().positive().max(4096),
});
const tellmeMediaSchema = z.object({
  id: z.string().min(1).max(100), kind: z.literal("sticker"), url: z.string().max(200),
  alt: z.string().max(500), width: z.number().positive().max(4096), height: z.number().positive().max(4096),
}).refine((media) => getTellmeSticker(media.id)?.src === media.url, "Sticker Tellme không hợp lệ.")
  .transform((media) => {
    const sticker = getTellmeSticker(media.id)!;
    return { id: sticker.id, kind: "sticker" as const, url: sticker.src, alt: sticker.label, width: sticker.width, height: sticker.height };
  });
const mediaSchema = z.union([tellmeMediaSchema, giphyMediaSchema]);
export const commentSchema = z
  .object({
    id: idSchema,
    content: z.string().trim().max(1000),
    parentId: idSchema.optional(),
    media: mediaSchema.optional(),
  })
  .refine((v) => !!v.content || !!v.media, "Nhập bình luận hoặc chọn sticker/GIF.");
export const momentSchema = z.object({
  id: idSchema,
  storyId: idSchema,
  image: z.string().min(1).max(2000),
  caption: z.string().trim().max(300),
  storyPrivacy: privacy,
  musicTrackId: z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/).optional(),
  musicProvider: z.enum(["youtube", "epidemic-sound"]).default("epidemic-sound"),
  musicStartSeconds: z.number().int().min(0).max(86400).default(0),
  privacy: privacy.optional(),
});
export const conversationSchema = z.object({
  id: idSchema,
  kind: z.enum(["direct", "group"]).default("direct"),
  title: z.string().trim().max(60).default(""),
  avatar: z.string().max(2048).default(""),
  participantIds: z.array(z.string().max(50)).max(30),
});
export const messageSchema = z
  .object({
    id: idSchema,
    text: z.string().trim().max(1000),
    stickerId: z.string().max(100).refine((id) => !!getTellmeSticker(id), "Sticker không khả dụng.").optional(),
    postId: idSchema.optional(),
    storyReply: z.object({ storyId: idSchema, momentId: idSchema }).optional(),
  })
  .refine((v) => !!v.text || !!v.postId || !!v.stickerId, "Nhập tin nhắn hoặc chọn sticker.")
  .refine((v) => !v.stickerId || !(v.postId || v.storyReply), "Sticker cần được gửi thành tin nhắn riêng.")
  .refine((v) => !(v.postId && v.storyReply), "Chọn một nội dung để trả lời.");
export const pageSchema = z.object({
  cursor: z.coerce.number().int().min(0).max(100000).default(0),
  limit: z.coerce.number().int().min(1).max(30).default(6),
});

export const emailSchema = z.object({ email: loginSchema.shape.email });
export const accountTokenSchema = z.object({ token: z.string().regex(/^[A-Za-z0-9_-]{43}$/, "Phiên khôi phục không hợp lệ.") });
export const resetPasswordSchema = accountTokenSchema.extend({ password: loginSchema.shape.password });
export const changePasswordSchema = z.object({ currentPassword: loginSchema.shape.password, password: loginSchema.shape.password }).refine((v) => v.currentPassword !== v.password, "Mật khẩu mới phải khác mật khẩu hiện tại.");

export const confirmCodeSchema = z.object({ code: z.string().regex(/^\d{6}$/, "Nhập mã gồm 6 chữ số.") });
export const resetCodeSchema = emailSchema.extend(confirmCodeSchema.shape);
