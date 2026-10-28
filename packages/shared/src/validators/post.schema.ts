import { z } from "zod";
import { LIMITS } from "../constants/limits";

export const createPostSchema = z.object({
  content: z.string().min(1).max(LIMITS.MAX_POST_LENGTH),
  isAnonymous: z.boolean().optional().default(false),
  privacyLevel: z.enum(["public", "connections", "private"]).optional().default("public"),
  topics: z.array(z.string()).max(LIMITS.MAX_TOPICS_PER_POST).optional(),
  mediaIds: z.array(z.string()).max(LIMITS.MAX_POST_MEDIA).optional()
});

export type CreatePostInput = z.infer<typeof createPostSchema>;
