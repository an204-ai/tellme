import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { z } from "zod";

// src/ and dist/ have the same depth; every server process reads the root .env.
dotenv.config({ path: fileURLToPath(new URL("../../../.env", import.meta.url)) });
const schema = z.object({
  MONGODB_URI: z.string().min(1),
  MONGODB_DB: z.string().default("tellme"),
  CLOUDINARY_URL: z.string().startsWith("cloudinary://"),
  GIPHY_API_KEY: z.string().min(1),
  REDIS_URL: z.string().url().default("redis://127.0.0.1:6379"),
  PORT: z.coerce.number().int().default(4000),
  WEB_ORIGINS: z.string().default("http://127.0.0.1:3000,http://localhost:3000"),
  APP_URL: z.string().url().default("http://127.0.0.1:3000"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  SMTP_URL: z.string().default(""),
  EMAIL_FROM: z.string().default("Tellme <hello@tellme.local>"),
  VAPID_PUBLIC_KEY: z.string().default(""),
  VAPID_PRIVATE_KEY: z.string().default(""),
  VAPID_SUBJECT: z.string().default("mailto:hello@tellme.local"),
  ADMIN_EMAILS: z.string().default(""),
  MEDIA_ORPHAN_HOURS: z.coerce.number().min(1).default(24),
});
const parsed = schema.safeParse(process.env);
if (!parsed.success) throw new Error(`Thiếu cấu hình trong .env gốc: ${parsed.error.issues.map((i) => i.path.join(".")).join(", ")}`);
export const config = parsed.data;
export const origins = new Set(config.WEB_ORIGINS.split(",").map((s) => s.trim()));
