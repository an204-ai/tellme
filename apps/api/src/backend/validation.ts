import { z } from "zod";
export const idSchema = z.string().uuid();
export const privacy = z.enum(["public", "connections", "private"]);
export const reaction = z
  .enum(["like", "love", "cheer", "celebrate", "appreciate", "smile"])
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
  name: z.string().trim().min(2).max(50),
  bio: z.string().trim().max(200),
  location: z.string().trim().max(60),
  avatar: z.string().max(2000),
  cover: z.string().max(2000),
});
export const settingsSchema = z.object({
  audience: privacy,
  notifyLikes: z.boolean(),
  notifyMessages: z.boolean(),
  reducedMotion: z.boolean(),
  emailUpdates: z.literal(false).default(false),
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
const mediaSchema = z.object({
  id: z.string().min(1).max(100),
  kind: z.enum(["gif", "sticker"]),
  url: z
    .string()
    .url()
    .refine((s) => {
      const u = new URL(s);
      return u.protocol === "https:" && /(^|\.)giphy\.com$/.test(u.hostname);
    }, "Ảnh GIF cần thuộc Giphy."),
  alt: z.string().max(500),
  width: z.number().positive().max(4096),
  height: z.number().positive().max(4096),
});
export const commentSchema = z
  .object({
    id: idSchema,
    content: z.string().trim().max(1000),
    parentId: idSchema.optional(),
    media: mediaSchema.optional(),
  })
  .refine((v) => !!v.content || !!v.media, "Nhập bình luận hoặc chọn GIF.");
export const momentSchema = z.object({
  id: idSchema,
  storyId: idSchema,
  image: z.string().min(1).max(2000),
  caption: z.string().trim().max(300),
  privacy,
});
export const conversationSchema = z.object({
  id: idSchema,
  kind: z.enum(["direct", "group"]).default("direct"),
  title: z.string().trim().max(60).default(""),
  participantIds: z.array(z.string().max(50)).max(30),
});
export const messageSchema = z
  .object({
    id: idSchema,
    text: z.string().trim().max(1000),
    postId: idSchema.optional(),
    storyReply: z.object({ storyId: idSchema, momentId: idSchema }).optional(),
  })
  .refine((v) => !!v.text || !!v.postId, "Nhập tin nhắn.")
  .refine((v) => !(v.postId && v.storyReply), "Chọn một nội dung để trả lời.");
export const pageSchema = z.object({
  cursor: z.coerce.number().int().min(0).max(100000).default(0),
  limit: z.coerce.number().int().min(1).max(30).default(6),
});
