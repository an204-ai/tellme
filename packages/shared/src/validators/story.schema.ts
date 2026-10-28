import { z } from "zod";

export const createStoryItemSchema = z.object({
  imageUrl: z.string().url(),
  note: z.string().max(500).optional()
});
