import os from "node:os";
import { statfs } from "node:fs/promises";
import type { Hono } from "hono";
import { v2 as cloudinary } from "cloudinary";
import { config, mongo, redis } from "@tellme/database";
import type { Env } from "../../backend/security.js";
import { requestMetrics } from "../../backend/observability.js";

const cloudinaryUnavailable = { ready: false, storageBytes: null };
type ConnectionState = "connected" | "unavailable" | "configured" | "disabled";
type CloudinaryUsage = { ready: boolean; storageBytes: number | null };
let usage: { expires: number; value: Promise<CloudinaryUsage> } | undefined;

function cloudinaryUsage() {
  if (config.NODE_ENV === "test") return Promise.resolve(cloudinaryUnavailable);
  if (!usage || usage.expires <= Date.now()) {
    usage = {
      expires: Date.now() + 5 * 60000,
      value: cloudinary.api.usage({ timeout: 4000 }).then((result) => ({
        ready: true,
        storageBytes: typeof result.storage?.usage === "number" ? result.storage.usage : null,
      })).catch(() => cloudinaryUnavailable),
    };
  }
  return usage.value;
}

let providers: { expires: number; value: Promise<{ name: string; state: ConnectionState }[]> } | undefined;

function providerConnections() {
  if (!providers || providers.expires <= Date.now()) {
    const check = async (name: string, key: string, url: string, headers?: HeadersInit) => {
      let state: ConnectionState = key ? "configured" : "disabled";
      if (key && config.NODE_ENV !== "test") {
        try {
          const result = await fetch(url, { headers, signal: AbortSignal.timeout(4000), redirect: "error" });
          state = result.ok ? "connected" : "unavailable";
          await result.body?.cancel();
        } catch { state = "unavailable"; }
      }
      return { name, state };
    };
    providers = {
      expires: Date.now() + 10 * 60000,
      value: Promise.all([
        check("GIPHY", config.GIPHY_API_KEY,
          `https://api.giphy.com/v1/gifs/trending?${new URLSearchParams({ api_key: config.GIPHY_API_KEY, limit: "1" })}`),
        check("OpenWeather", config.OPENWEATHER_API_KEY,
          `https://api.openweathermap.org/data/2.5/weather?${new URLSearchParams({ appid: config.OPENWEATHER_API_KEY, lat: "10.7769", lon: "106.7009" })}`),
        check("YouTube", config.YOUTUBE_API_KEY,
          "https://www.googleapis.com/youtube/v3/videos?part=id&chart=mostPopular&regionCode=VN&maxResults=1",
          { "X-Goog-Api-Key": config.YOUTUBE_API_KEY }),
      ]),
    };
  }
  return providers.value;
}

export function registerMonitoringRoutes(api: Hono<Env>) {
  api.get("/admin/infrastructure", async (c) => {
    const [database, cache, disk, storage, external] = await Promise.all([
      mongo.db(config.MONGODB_DB).command({ ping: 1 }, { timeoutMS: 4000 }).then(() => true, () => false),
      redis.status === "ready" ? redis.ping().then(() => true, () => false) : false,
      statfs(process.cwd()).then((value) => ({
        totalBytes: value.blocks * value.bsize, availableBytes: value.bavail * value.bsize,
      })).catch(() => null),
      cloudinaryUsage(),
      providerConnections(),
    ]);
    const connection = (name: string, connected: boolean) => ({ name, state: connected ? "connected" : "unavailable" });
    const configured = (name: string, enabled: boolean) => ({ name, state: enabled ? "configured" : "disabled" });
    return c.json({
      at: new Date().toISOString(),
      environment: config.NODE_ENV,
      ...requestMetrics(),
      host: { totalMemoryBytes: os.totalmem(), freeMemoryBytes: os.freemem(), disk },
      cloudinary: storage,
      connections: [
        connection("MongoDB Atlas", database), connection("Redis", cache), connection("Cloudinary", storage.ready),
        ...external, configured("SMTP", !!config.SMTP_URL),
        configured("Web Push", !!config.VAPID_PUBLIC_KEY && !!config.VAPID_PRIVATE_KEY),
      ],
    });
  });
}
