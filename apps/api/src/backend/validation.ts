import { z } from "zod";
import { normalizeMomentCaption, validMomentCaption } from "@tellme/shared/captions";
import { isMomentReaction, type MomentReaction } from "@tellme/shared/reactions";
import { getTellmeSticker } from "@tellme/shared/stickers";
export const idSchema = z.string().uuid();
export const privacy = z.enum(["public", "connections", "private"]);
export const reaction = z.custom<MomentReaction>(isMomentReaction, "Chọn một biểu cảm hợp lệ.").nullable();
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
  avatar: z.string().max(2000),
  cover: z.string().max(2000),
});
export const settingsSchema = z.object({
  audience: z.literal("connections").default("connections"),
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
export const momentCaptionSchema = z.string().max(300).transform(normalizeMomentCaption).refine(validMomentCaption, "Chú thích tối đa 8 từ và 40 ký tự.");
export const momentSchema = z.object({
  id: idSchema,
  storyId: idSchema,
  image: z.string().min(1).max(2000),
  caption: momentCaptionSchema,
  storyPrivacy: z.literal("connections").default("connections"),
  privacy: z.literal("connections").optional(),
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
    replyToId: idSchema.optional(),
    text: z.string().trim().max(1000),
    stickerId: z.string().max(100).refine((id) => !!getTellmeSticker(id), "Sticker không khả dụng.").optional(),
    storyReply: z.object({ storyId: idSchema, momentId: idSchema }).optional(),
  })
  .strict()
  .refine((v) => !!v.text || !!v.stickerId, "Nhập tin nhắn hoặc chọn sticker.")
  .refine((v) => !v.stickerId || !v.storyReply, "Sticker cần được gửi thành tin nhắn riêng.");
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
