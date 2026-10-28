import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

export const registerSchema = z.object({
  username: z.string().min(3).max(30).regex(/^[a-z0-9_]+$/),
  email: z.string().email(),
  password: z.string().min(6),
  displayName: z.string().min(1).max(50)
});
